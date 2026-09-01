package usecase

import (
	"context"
	"fmt"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
)

type categoryUsecase struct {
	catRepo   domain.CategoryRepository
	locRepo   domain.LocationRepository
	auditRepo domain.AuditRepository
}

func NewCategoryUsecase(catRepo domain.CategoryRepository, locRepo domain.LocationRepository, auditRepo domain.AuditRepository) domain.CategoryUsecase {
	return &categoryUsecase{
		catRepo:   catRepo,
		locRepo:   locRepo,
		auditRepo: auditRepo,
	}
}

func (u *categoryUsecase) ListCategories(ctx context.Context) ([]domain.Category, error) {
	return u.catRepo.List(ctx)
}

func (u *categoryUsecase) GetCategoryByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	return u.catRepo.GetByID(ctx, id)
}

func (u *categoryUsecase) CreateCategory(ctx context.Context, actorID uuid.UUID, category *domain.Category) error {
	if category.Name == "" {
		return fmt.Errorf("category name is required")
	}
	if err := u.catRepo.Create(ctx, category); err != nil {
		return err
	}

	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &actorID,
		Action:      "CREATE_CATEGORY",
		TargetTable: "categories",
		TargetID:    &category.ID,
		NewData:     domain.JSONB{"name": category.Name, "icon": category.Icon},
	})
	return nil
}

func (u *categoryUsecase) UpdateCategory(ctx context.Context, actorID uuid.UUID, category *domain.Category) error {
	existing, err := u.catRepo.GetByID(ctx, category.ID)
	if err != nil {
		return err
	}

	if err := u.catRepo.Update(ctx, category); err != nil {
		return err
	}

	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &actorID,
		Action:      "UPDATE_CATEGORY",
		TargetTable: "categories",
		TargetID:    &category.ID,
		OldData:     domain.JSONB{"name": existing.Name},
		NewData:     domain.JSONB{"name": category.Name, "icon": category.Icon},
	})
	return nil
}

func (u *categoryUsecase) DeleteCategory(ctx context.Context, actorID uuid.UUID, id uuid.UUID) error {
	existing, err := u.catRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if err := u.catRepo.Delete(ctx, id); err != nil {
		return err
	}

	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &actorID,
		Action:      "DELETE_CATEGORY",
		TargetTable: "categories",
		TargetID:    &id,
		OldData:     domain.JSONB{"name": existing.Name},
	})
	return nil
}

func (u *categoryUsecase) ListLocations(ctx context.Context) ([]domain.Location, error) {
	return u.locRepo.List(ctx)
}

func (u *categoryUsecase) CreateLocation(ctx context.Context, actorID uuid.UUID, location *domain.Location) error {
	if location.Name == "" {
		return fmt.Errorf("location name is required")
	}
	if err := u.locRepo.Create(ctx, location); err != nil {
		return err
	}

	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &actorID,
		Action:      "CREATE_LOCATION",
		TargetTable: "locations",
		TargetID:    &location.ID,
		NewData:     domain.JSONB{"name": location.Name},
	})
	return nil
}
