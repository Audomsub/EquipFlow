package postgres

import (
	"context"
	"fmt"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type categoryRepo struct {
	db *gorm.DB
}

type locationRepo struct {
	db *gorm.DB
}

// NewCategoryRepository creates CategoryRepository and LocationRepository instances
func NewCategoryRepository(db *gorm.DB) (domain.CategoryRepository, domain.LocationRepository) {
	return &categoryRepo{db: db}, &locationRepo{db: db}
}

// CategoryRepository Methods
func (r *categoryRepo) List(ctx context.Context) ([]domain.Category, error) {
	var categories []domain.Category
	if err := r.db.WithContext(ctx).Order("name ASC").Find(&categories).Error; err != nil {
		return nil, fmt.Errorf("failed to list categories: %w", err)
	}
	return categories, nil
}

func (r *categoryRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	var category domain.Category
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&category).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *categoryRepo) Create(ctx context.Context, category *domain.Category) error {
	if category.ID == uuid.Nil {
		category.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *categoryRepo) Update(ctx context.Context, category *domain.Category) error {
	return r.db.WithContext(ctx).Save(category).Error
}

func (r *categoryRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Category{}).Error
}

// LocationRepository Methods
func (r *locationRepo) List(ctx context.Context) ([]domain.Location, error) {
	var locations []domain.Location
	if err := r.db.WithContext(ctx).Order("name ASC").Find(&locations).Error; err != nil {
		return nil, fmt.Errorf("failed to list locations: %w", err)
	}
	return locations, nil
}

func (r *locationRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Location, error) {
	var location domain.Location
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&location).Error; err != nil {
		return nil, err
	}
	return &location, nil
}

func (r *locationRepo) Create(ctx context.Context, location *domain.Location) error {
	if location.ID == uuid.Nil {
		location.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(location).Error
}
