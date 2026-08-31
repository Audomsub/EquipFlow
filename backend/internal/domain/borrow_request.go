package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type RequestStatus string

const (
	RequestStatusPending   RequestStatus = "PENDING"
	RequestStatusApproved  RequestStatus = "APPROVED"
	RequestStatusRejected  RequestStatus = "REJECTED"
	RequestStatusBorrowed  RequestStatus = "BORROWED"
	RequestStatusReturned  RequestStatus = "RETURNED"
	RequestStatusOverdue   RequestStatus = "OVERDUE"
	RequestStatusCancelled RequestStatus = "CANCELLED"
)

// BorrowRequest represents public.borrow_requests
type BorrowRequest struct {
	ID              uuid.UUID     `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RequestNumber   string        `gorm:"type:text;not null;unique" json:"request_number"`
	UserID          uuid.UUID     `gorm:"type:uuid;not null" json:"user_id"`
	User            *Profile      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	AssetID         uuid.UUID     `gorm:"type:uuid;not null" json:"asset_id"`
	Asset           *Asset        `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
	Purpose         string        `gorm:"type:text;not null" json:"purpose"`
	StartDate       time.Time     `gorm:"type:timestamptz;not null" json:"start_date"`
	EndDate         time.Time     `gorm:"type:timestamptz;not null" json:"end_date"`
	Status          RequestStatus `gorm:"type:request_status_enum;not null;default:'PENDING'" json:"status"`
	ReviewedBy      *uuid.UUID    `gorm:"type:uuid" json:"reviewed_by,omitempty"`
	Reviewer        *Profile      `gorm:"foreignKey:ReviewedBy" json:"reviewer,omitempty"`
	ReviewedAt      *time.Time    `gorm:"type:timestamptz" json:"reviewed_at,omitempty"`
	RejectionReason *string       `gorm:"type:text" json:"rejection_reason,omitempty"`
	CreatedAt       time.Time     `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time     `gorm:"autoUpdateTime" json:"updated_at"`

	Transaction *BorrowTransaction `gorm:"foreignKey:RequestID" json:"transaction,omitempty"`
}

func (BorrowRequest) TableName() string {
	return "public.borrow_requests"
}

// BorrowTransaction represents public.borrow_transactions (Handover and Return records)
type BorrowTransaction struct {
	ID                uuid.UUID       `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RequestID         uuid.UUID       `gorm:"type:uuid;not null;unique" json:"request_id"`
	AssetID           uuid.UUID       `gorm:"type:uuid;not null" json:"asset_id"`
	HandedOverBy      uuid.UUID       `gorm:"type:uuid;not null" json:"handed_over_by"`
	HandoverOfficer   *Profile        `gorm:"foreignKey:HandedOverBy" json:"handover_officer,omitempty"`
	HandoverAt        time.Time       `gorm:"type:timestamptz;autoCreateTime" json:"handover_at"`
	HandoverCondition ConditionStatus `gorm:"type:condition_status_enum;not null" json:"handover_condition"`
	HandoverNotes     *string         `gorm:"type:text" json:"handover_notes,omitempty"`
	HandoverPhotos    pgtype.FlatArray[string] `gorm:"type:text[];default:ARRAY[]::text[]" json:"handover_photos"`

	ReceivedBy      *uuid.UUID       `gorm:"type:uuid" json:"received_by,omitempty"`
	ReturnOfficer   *Profile         `gorm:"foreignKey:ReceivedBy" json:"return_officer,omitempty"`
	ReceivedAt      *time.Time       `gorm:"type:timestamptz" json:"received_at,omitempty"`
	ReturnCondition *ConditionStatus `gorm:"type:condition_status_enum" json:"return_condition,omitempty"`
	ReturnNotes     *string          `gorm:"type:text" json:"return_notes,omitempty"`
	ReturnPhotos    pgtype.FlatArray[string] `gorm:"type:text[];default:ARRAY[]::text[]" json:"return_photos"`
	IsDamaged       bool             `gorm:"default:false" json:"is_damaged"`
	DamageFineAmount float64         `gorm:"type:numeric(10,2);default:0.00" json:"damage_fine_amount"`
	CreatedAt       time.Time        `gorm:"autoCreateTime" json:"created_at"`
}

func (BorrowTransaction) TableName() string {
	return "public.borrow_transactions"
}

// Request & Filter DTOs
type CreateBorrowRequestInput struct {
	AssetID   uuid.UUID `json:"asset_id" validate:"required"`
	Purpose   string    `json:"purpose" validate:"required,min=5"`
	StartDate time.Time `json:"start_date" validate:"required"`
	EndDate   time.Time `json:"end_date" validate:"required,gtfield=StartDate"`
}

type ReviewBorrowRequestInput struct {
	Status          RequestStatus `json:"status" validate:"required,oneof=APPROVED REJECTED"`
	RejectionReason *string       `json:"rejection_reason"`
}

type HandoverInput struct {
	Condition ConditionStatus `json:"condition" validate:"required"`
	Notes     *string         `json:"notes"`
	Photos    []string        `json:"photos"`
}

type ReturnInput struct {
	Condition        ConditionStatus `json:"condition" validate:"required"`
	Notes            *string         `json:"notes"`
	Photos           []string        `json:"photos"`
	IsDamaged        bool            `json:"is_damaged"`
	DamageFineAmount float64         `json:"damage_fine_amount"`
}

type BorrowFilter struct {
	UserID    *uuid.UUID     `query:"user_id"`
	AssetID   *uuid.UUID     `query:"asset_id"`
	Status    *RequestStatus `query:"status"`
	StartDate *time.Time     `query:"start_date"`
	EndDate   *time.Time     `query:"end_date"`
	Page      int            `query:"page"`
	Limit     int            `query:"limit"`
}

// BorrowRepository defines database operations for requests & transactions
type BorrowRepository interface {
	CreateRequest(ctx context.Context, req *BorrowRequest) error
	GetRequestByID(ctx context.Context, id uuid.UUID) (*BorrowRequest, error)
	ListRequests(ctx context.Context, filter BorrowFilter) ([]BorrowRequest, int64, error)
	UpdateRequest(ctx context.Context, req *BorrowRequest) error
	
	// Double Booking Prevention: Check if the asset has conflicting active bookings in the given date range
	HasDateConflict(ctx context.Context, assetID uuid.UUID, startDate, endDate time.Time, excludeRequestID *uuid.UUID) (bool, error)
	
	// Handover & Return Transaction
	CreateHandover(ctx context.Context, tx *BorrowTransaction) error
	ProcessReturn(ctx context.Context, tx *BorrowTransaction) error
}

// BorrowUsecase defines business rules for borrowing flow
type BorrowUsecase interface {
	CreateRequest(ctx context.Context, userID uuid.UUID, input CreateBorrowRequestInput) (*BorrowRequest, error)
	ReviewRequest(ctx context.Context, adminID uuid.UUID, requestID uuid.UUID, input ReviewBorrowRequestInput) (*BorrowRequest, error)
	HandoverAsset(ctx context.Context, adminID uuid.UUID, requestID uuid.UUID, input HandoverInput) (*BorrowTransaction, error)
	ReturnAsset(ctx context.Context, adminID uuid.UUID, requestID uuid.UUID, input ReturnInput) (*BorrowTransaction, error)
	GetRequestByID(ctx context.Context, id uuid.UUID) (*BorrowRequest, error)
	ListRequests(ctx context.Context, filter BorrowFilter) ([]BorrowRequest, int64, error)
}
