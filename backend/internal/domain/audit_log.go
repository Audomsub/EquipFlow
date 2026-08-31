package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AuditLog represents public.audit_logs
type AuditLog struct {
	ID          uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ActorID     *uuid.UUID `gorm:"type:uuid" json:"actor_id,omitempty"`
	Actor       *Profile   `gorm:"foreignKey:ActorID" json:"actor,omitempty"`
	Action      string     `gorm:"type:text;not null" json:"action"`
	TargetTable string     `gorm:"type:text;not null" json:"target_table"`
	TargetID    *uuid.UUID `gorm:"type:uuid" json:"target_id,omitempty"`
	OldData     JSONB      `gorm:"type:jsonb" json:"old_data,omitempty"`
	NewData     JSONB      `gorm:"type:jsonb" json:"new_data,omitempty"`
	IPAddress   *string    `gorm:"type:text" json:"ip_address,omitempty"`
	UserAgent   *string    `gorm:"type:text" json:"user_agent,omitempty"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
}

func (AuditLog) TableName() string {
	return "public.audit_logs"
}

type AuditFilter struct {
	ActorID     *uuid.UUID `query:"actor_id"`
	Action      string     `query:"action"`
	TargetTable string     `query:"target_table"`
	TargetID    *uuid.UUID `query:"target_id"`
	Page        int        `query:"page"`
	Limit       int        `query:"limit"`
}

// AuditRepository interface
type AuditRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	List(ctx context.Context, filter AuditFilter) ([]AuditLog, int64, error)
}
