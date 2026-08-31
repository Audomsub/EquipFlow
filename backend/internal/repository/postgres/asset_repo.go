package postgres

import (
	"context"
	"strings"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type assetRepository struct {
	db *gorm.DB
}

func NewAssetRepository(db *gorm.DB) domain.AssetRepository {
	return &assetRepository{db: db}
}

func (r *assetRepository) Create(ctx context.Context, asset *domain.Asset) error {
	return r.db.WithContext(ctx).Create(asset).Error
}

func (r *assetRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Asset, error) {
	var asset domain.Asset
	if err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Location").
		Where("id = ?", id).
		First(&asset).Error; err != nil {
		return nil, err
	}
	return &asset, nil
}

func (r *assetRepository) GetByAssetTag(ctx context.Context, assetTag string) (*domain.Asset, error) {
	var asset domain.Asset
	if err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Location").
		Where("asset_tag = ?", assetTag).
		First(&asset).Error; err != nil {
		return nil, err
	}
	return &asset, nil
}

func (r *assetRepository) List(ctx context.Context, filter domain.AssetFilter) ([]domain.Asset, int64, error) {
	var assets []domain.Asset
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.Asset{}).Preload("Category").Preload("Location")

	if filter.Search != "" {
		searchTerm := "%" + strings.ToLower(filter.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(asset_tag) LIKE ? OR LOWER(serial_number) LIKE ? OR LOWER(brand) LIKE ?", searchTerm, searchTerm, searchTerm, searchTerm)
	}

	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}

	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}

	if filter.IsBorrowable != nil {
		query = query.Where("is_borrowable = ?", *filter.IsBorrowable)
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

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&assets).Error; err != nil {
		return nil, 0, err
	}

	return assets, total, nil
}

func (r *assetRepository) Update(ctx context.Context, asset *domain.Asset) error {
	return r.db.WithContext(ctx).Save(asset).Error
}

func (r *assetRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.AssetStatus) error {
	return r.db.WithContext(ctx).Model(&domain.Asset{}).Where("id = ?", id).Update("status", status).Error
}

func (r *assetRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Asset{}).Error
}
