package postgres

import (
	"context"
	"fmt"
	"time"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type borrowRepository struct {
	db *gorm.DB
}

func NewBorrowRepository(db *gorm.DB) domain.BorrowRepository {
	return &borrowRepository{db: db}
}

// HasDateConflict checks whether another active reservation overlaps with [startDate, endDate]
// Active statuses considered conflict: PENDING, APPROVED, BORROWED
// Logic: (start_date < new_end) AND (end_date > new_start)
func (r *borrowRepository) HasDateConflict(ctx context.Context, assetID uuid.UUID, startDate, endDate time.Time, excludeRequestID *uuid.UUID) (bool, error) {
	var count int64

	query := r.db.WithContext(ctx).Model(&domain.BorrowRequest{}).
		Where("asset_id = ?", assetID).
		Where("status IN ('PENDING', 'APPROVED', 'BORROWED')").
		Where("start_date < ? AND end_date > ?", endDate, startDate)

	if excludeRequestID != nil {
		query = query.Where("id != ?", *excludeRequestID)
	}

	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *borrowRepository) CreateRequest(ctx context.Context, req *domain.BorrowRequest) error {
	return r.db.WithContext(ctx).Create(req).Error
}

func (r *borrowRepository) GetRequestByID(ctx context.Context, id uuid.UUID) (*domain.BorrowRequest, error) {
	var req domain.BorrowRequest
	if err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Asset").
		Preload("Asset.Category").
		Preload("Reviewer").
		Preload("Transaction").
		Preload("Transaction.HandoverOfficer").
		Preload("Transaction.ReturnOfficer").
		Where("id = ?", id).
		First(&req).Error; err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *borrowRepository) ListRequests(ctx context.Context, filter domain.BorrowFilter) ([]domain.BorrowRequest, int64, error) {
	var requests []domain.BorrowRequest
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.BorrowRequest{}).
		Preload("User").
		Preload("Asset").
		Preload("Reviewer").
		Preload("Transaction")

	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.AssetID != nil {
		query = query.Where("asset_id = ?", *filter.AssetID)
	}
	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}
	if filter.StartDate != nil {
		query = query.Where("start_date >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("end_date <= ?", *filter.EndDate)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&requests).Error; err != nil {
		return nil, 0, err
	}

	return requests, total, nil
}

func (r *borrowRepository) UpdateRequest(ctx context.Context, req *domain.BorrowRequest) error {
	return r.db.WithContext(ctx).Save(req).Error
}

// CreateHandover executes within a database transaction:
// 1. Locks the asset row (SELECT FOR UPDATE)
// 2. Inserts the handover transaction record
// 3. Updates request status to BORROWED
// 4. Updates asset status to BORROWED
func (r *borrowRepository) CreateHandover(ctx context.Context, tx *domain.BorrowTransaction) error {
	return r.db.WithContext(ctx).Transaction(func(dbTx *gorm.DB) error {
		// 1. Lock asset row to prevent race condition
		var asset domain.Asset
		if err := dbTx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", tx.AssetID).First(&asset).Error; err != nil {
			return fmt.Errorf("failed to lock asset: %w", err)
		}

		if !asset.IsBorrowable {
			return fmt.Errorf("asset is marked as not borrowable")
		}

		// 2. Create Transaction Record
		if err := dbTx.Create(tx).Error; err != nil {
			return fmt.Errorf("failed to create handover transaction: %w", err)
		}

		// 3. Update Request Status to BORROWED
		if err := dbTx.Model(&domain.BorrowRequest{}).Where("id = ?", tx.RequestID).Update("status", domain.RequestStatusBorrowed).Error; err != nil {
			return fmt.Errorf("failed to update request status: %w", err)
		}

		// 4. Update Asset Status to BORROWED and condition
		if err := dbTx.Model(&domain.Asset{}).Where("id = ?", tx.AssetID).Updates(map[string]interface{}{
			"status":            domain.AssetStatusBorrowed,
			"current_condition": tx.HandoverCondition,
		}).Error; err != nil {
			return fmt.Errorf("failed to update asset status: %w", err)
		}

		return nil
	})
}

// ProcessReturn executes within a database transaction:
// 1. Locks asset and updates return details
// 2. Updates request status to RETURNED
// 3. Updates asset status to AVAILABLE (or MAINTENANCE if damaged)
func (r *borrowRepository) ProcessReturn(ctx context.Context, tx *domain.BorrowTransaction) error {
	return r.db.WithContext(ctx).Transaction(func(dbTx *gorm.DB) error {
		// 1. Lock asset row
		var asset domain.Asset
		if err := dbTx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", tx.AssetID).First(&asset).Error; err != nil {
			return fmt.Errorf("failed to lock asset: %w", err)
		}

		// 2. Save Return Details
		if err := dbTx.Save(tx).Error; err != nil {
			return fmt.Errorf("failed to update return transaction: %w", err)
		}

		// 3. Update Request Status to RETURNED
		if err := dbTx.Model(&domain.BorrowRequest{}).Where("id = ?", tx.RequestID).Update("status", domain.RequestStatusReturned).Error; err != nil {
			return fmt.Errorf("failed to update request status: %w", err)
		}

		// 4. Update Asset Status based on damage condition
		newAssetStatus := domain.AssetStatusAvailable
		if tx.IsDamaged || (tx.ReturnCondition != nil && (*tx.ReturnCondition == domain.ConditionDamaged || *tx.ReturnCondition == domain.ConditionBroken)) {
			newAssetStatus = domain.AssetStatusMaintenance
		}

		updates := map[string]interface{}{
			"status": newAssetStatus,
		}
		if tx.ReturnCondition != nil {
			updates["current_condition"] = *tx.ReturnCondition
		}

		if err := dbTx.Model(&domain.Asset{}).Where("id = ?", tx.AssetID).Updates(updates).Error; err != nil {
			return fmt.Errorf("failed to update asset status on return: %w", err)
		}

		return nil
	})
}
