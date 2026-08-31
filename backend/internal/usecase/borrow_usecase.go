package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type borrowUsecase struct {
	borrowRepo domain.BorrowRepository
	assetRepo  domain.AssetRepository
	auditRepo  domain.AuditRepository
}

func NewBorrowUsecase(borrowRepo domain.BorrowRepository, assetRepo domain.AssetRepository, auditRepo domain.AuditRepository) domain.BorrowUsecase {
	return &borrowUsecase{
		borrowRepo: borrowRepo,
		assetRepo:  assetRepo,
		auditRepo:  auditRepo,
	}
}

// generateRequestNumber creates REQ-YYYYMM-XXXX
func generateRequestNumber() string {
	now := time.Now()
	randomDigits := rand.Intn(9000) + 1000
	return fmt.Sprintf("REQ-%s-%04d", now.Format("200601"), randomDigits)
}

// CreateRequest implements Double Booking Prevention & business validation
func (u *borrowUsecase) CreateRequest(ctx context.Context, userID uuid.UUID, input domain.CreateBorrowRequestInput) (*domain.BorrowRequest, error) {
	// 1. Basic validation
	now := time.Now()
	if input.StartDate.Before(now.Add(-1 * time.Hour)) {
		return nil, fmt.Errorf("start_date cannot be in the past")
	}
	if !input.EndDate.After(input.StartDate) {
		return nil, fmt.Errorf("end_date must be strictly after start_date")
	}

	// 2. Verify asset exists and is borrowable
	asset, err := u.assetRepo.GetByID(ctx, input.AssetID)
	if err != nil {
		return nil, fmt.Errorf("asset not found: %w", err)
	}
	if !asset.IsBorrowable {
		return nil, fmt.Errorf("this asset (%s) is marked as not borrowable", asset.Name)
	}
	if asset.Status == domain.AssetStatusDisposed || asset.Status == domain.AssetStatusLost {
		return nil, fmt.Errorf("this asset cannot be requested due to status '%s'", asset.Status)
	}

	// 3. Double Booking Prevention: Check for overlapping bookings
	hasConflict, err := u.borrowRepo.HasDateConflict(ctx, input.AssetID, input.StartDate, input.EndDate, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to check reservation conflict: %w", err)
	}
	if hasConflict {
		return nil, fmt.Errorf("asset is already booked or reserved during the selected date range")
	}

	// 4. Create Borrow Request Entity
	req := &domain.BorrowRequest{
		ID:            uuid.New(),
		RequestNumber: generateRequestNumber(),
		UserID:        userID,
		AssetID:       input.AssetID,
		Purpose:       input.Purpose,
		StartDate:     input.StartDate,
		EndDate:       input.EndDate,
		Status:        domain.RequestStatusPending,
	}

	if err := u.borrowRepo.CreateRequest(ctx, req); err != nil {
		return nil, fmt.Errorf("failed to save borrow request: %w", err)
	}

	// 5. Automatic Audit Logging
	reqBytes, _ := json.Marshal(req)
	var newJSON domain.JSONB
	_ = json.Unmarshal(reqBytes, &newJSON)

	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &userID,
		Action:      "CREATE_BORROW_REQUEST",
		TargetTable: "borrow_requests",
		TargetID:    &req.ID,
		NewData:     newJSON,
	})

	return req, nil
}

// ReviewRequest handles APPROVE or REJECT by IT_ADMIN or SUPER_ADMIN
func (u *borrowUsecase) ReviewRequest(ctx context.Context, adminID uuid.UUID, requestID uuid.UUID, input domain.ReviewBorrowRequestInput) (*domain.BorrowRequest, error) {
	req, err := u.borrowRepo.GetRequestByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("borrow request not found: %w", err)
	}

	if req.Status != domain.RequestStatusPending {
		return nil, fmt.Errorf("only PENDING requests can be reviewed (current status: %s)", req.Status)
	}

	now := time.Now()
	req.ReviewedBy = &adminID
	req.ReviewedAt = &now
	req.Status = input.Status
	req.RejectionReason = input.RejectionReason

	// If approving, re-check conflict in case another request was approved in parallel
	if input.Status == domain.RequestStatusApproved {
		hasConflict, err := u.borrowRepo.HasDateConflict(ctx, req.AssetID, req.StartDate, req.EndDate, &req.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to re-validate date conflict: %w", err)
		}
		if hasConflict {
			return nil, fmt.Errorf("cannot approve: another approved booking already conflicts with this time range")
		}
	}

	if err := u.borrowRepo.UpdateRequest(ctx, req); err != nil {
		return nil, fmt.Errorf("failed to update review status: %w", err)
	}

	// Audit Log
	action := "APPROVE_BORROW_REQUEST"
	if input.Status == domain.RequestStatusRejected {
		action = "REJECT_BORROW_REQUEST"
	}
	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &adminID,
		Action:      action,
		TargetTable: "borrow_requests",
		TargetID:    &req.ID,
	})

	return req, nil
}

// HandoverAsset delivers the asset to employee, records condition & photos, and updates asset to BORROWED
func (u *borrowUsecase) HandoverAsset(ctx context.Context, adminID uuid.UUID, requestID uuid.UUID, input domain.HandoverInput) (*domain.BorrowTransaction, error) {
	req, err := u.borrowRepo.GetRequestByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("request not found: %w", err)
	}

	if req.Status != domain.RequestStatusApproved {
		return nil, fmt.Errorf("can only handover assets for APPROVED requests (current status: %s)", req.Status)
	}

	tx := &domain.BorrowTransaction{
		ID:                uuid.New(),
		RequestID:         req.ID,
		AssetID:           req.AssetID,
		HandedOverBy:      adminID,
		HandoverAt:        time.Now(),
		HandoverCondition: input.Condition,
		HandoverNotes:     input.Notes,
		HandoverPhotos:    pgtype.FlatArray[string](input.Photos),
	}

	if err := u.borrowRepo.CreateHandover(ctx, tx); err != nil {
		return nil, fmt.Errorf("failed to process handover: %w", err)
	}

	// Audit Log
	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &adminID,
		Action:      "HANDOVER_ASSET",
		TargetTable: "borrow_transactions",
		TargetID:    &tx.ID,
	})

	return tx, nil
}

// ReturnAsset accepts returned asset, records condition & damage, and makes asset AVAILABLE or MAINTENANCE
func (u *borrowUsecase) ReturnAsset(ctx context.Context, adminID uuid.UUID, requestID uuid.UUID, input domain.ReturnInput) (*domain.BorrowTransaction, error) {
	req, err := u.borrowRepo.GetRequestByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("request not found: %w", err)
	}

	if req.Status != domain.RequestStatusBorrowed {
		return nil, fmt.Errorf("can only return assets that are currently BORROWED (current status: %s)", req.Status)
	}

	if req.Transaction == nil {
		return nil, fmt.Errorf("handover transaction not found for this request")
	}

	now := time.Now()
	tx := req.Transaction
	tx.ReceivedBy = &adminID
	tx.ReceivedAt = &now
	tx.ReturnCondition = &input.Condition
	tx.ReturnNotes = input.Notes
	tx.ReturnPhotos = pgtype.FlatArray[string](input.Photos)
	tx.IsDamaged = input.IsDamaged
	tx.DamageFineAmount = input.DamageFineAmount

	if err := u.borrowRepo.ProcessReturn(ctx, tx); err != nil {
		return nil, fmt.Errorf("failed to process return: %w", err)
	}

	// Audit Log
	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &adminID,
		Action:      "RETURN_ASSET",
		TargetTable: "borrow_transactions",
		TargetID:    &tx.ID,
	})

	return tx, nil
}

func (u *borrowUsecase) GetRequestByID(ctx context.Context, id uuid.UUID) (*domain.BorrowRequest, error) {
	return u.borrowRepo.GetRequestByID(ctx, id)
}

func (u *borrowUsecase) ListRequests(ctx context.Context, filter domain.BorrowFilter) ([]domain.BorrowRequest, int64, error) {
	return u.borrowRepo.ListRequests(ctx, filter)
}
