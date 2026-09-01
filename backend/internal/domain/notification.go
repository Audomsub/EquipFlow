package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Title     string    `gorm:"type:text;not null" json:"title"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	Type      string    `gorm:"type:text;default:'INFO'" json:"type"` // INFO, SUCCESS, WARNING, ALERT
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	Link      *string   `gorm:"type:text" json:"link,omitempty"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Notification) TableName() string {
	return "public.notifications"
}

type NotificationRepository interface {
	Create(ctx context.Context, notif *Notification) error
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]Notification, error)
	MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
}
