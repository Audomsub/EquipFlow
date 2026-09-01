package postgres

import (
	"context"
	"fmt"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type notifRepo struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) domain.NotificationRepository {
	return &notifRepo{db: db}
}

func (r *notifRepo) Create(ctx context.Context, notif *domain.Notification) error {
	if notif.ID == uuid.Nil {
		notif.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(notif).Error
}

func (r *notifRepo) ListByUserID(ctx context.Context, userID uuid.UUID) ([]domain.Notification, error) {
	var notifs []domain.Notification
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Limit(30).Find(&notifs).Error; err != nil {
		return nil, fmt.Errorf("failed to list notifications: %w", err)
	}
	return notifs, nil
}

func (r *notifRepo) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&domain.Notification{}).Where("id = ? AND user_id = ?", id, userID).Update("is_read", true).Error
}

func (r *notifRepo) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&domain.Notification{}).Where("user_id = ?", userID).Update("is_read", true).Error
}
