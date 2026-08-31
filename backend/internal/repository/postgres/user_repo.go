package postgres

import (
	"context"
	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type userRepo struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Profile, error) {
	var profile domain.Profile
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*domain.Profile, error) {
	var profile domain.Profile
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *userRepo) UpdateRole(ctx context.Context, id uuid.UUID, role domain.UserRole) error {
	return r.db.WithContext(ctx).Model(&domain.Profile{}).Where("id = ?", id).Update("role", role).Error
}

func (r *userRepo) ListUsers(ctx context.Context) ([]domain.Profile, error) {
	var users []domain.Profile
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&users).Error
	return users, err
}

func (r *userRepo) UpdateStatus(ctx context.Context, id uuid.UUID, isActive bool) error {
	return r.db.WithContext(ctx).Model(&domain.Profile{}).Where("id = ?", id).Update("is_active", isActive).Error
}
