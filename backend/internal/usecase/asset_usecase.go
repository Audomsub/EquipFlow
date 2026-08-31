package usecase

import (
	"context"
	"encoding/json"
	"fmt"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
)

type assetUsecase struct {
	assetRepo domain.AssetRepository
	auditRepo domain.AuditRepository
}

func NewAssetUsecase(assetRepo domain.AssetRepository, auditRepo domain.AuditRepository) domain.AssetUsecase {
	return &assetUsecase{
		assetRepo: assetRepo,
		auditRepo: auditRepo,
	}
}

func (u *assetUsecase) CreateAsset(ctx context.Context, actorID uuid.UUID, asset *domain.Asset) error {
	// Check tag uniqueness
	existing, _ := u.assetRepo.GetByAssetTag(ctx, asset.AssetTag)
	if existing != nil {
		return fmt.Errorf("asset tag '%s' already exists", asset.AssetTag)
	}

	if asset.Status == "" {
		asset.Status = domain.AssetStatusAvailable
	}
	if asset.CurrentCondition == "" {
		asset.CurrentCondition = domain.ConditionGood
	}

	if err := u.assetRepo.Create(ctx, asset); err != nil {
		return fmt.Errorf("failed to create asset: %w", err)
	}

	// Auto Audit Log
	newDataBytes, _ := json.Marshal(asset)
	var newJSON domain.JSONB
	_ = json.Unmarshal(newDataBytes, &newJSON)

	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &actorID,
		Action:      "CREATE_ASSET",
		TargetTable: "assets",
		TargetID:    &asset.ID,
		NewData:     newJSON,
	})

	return nil
}

func (u *assetUsecase) GetAssetByID(ctx context.Context, id uuid.UUID) (*domain.Asset, error) {
	return u.assetRepo.GetByID(ctx, id)
}

func (u *assetUsecase) ListAssets(ctx context.Context, filter domain.AssetFilter) ([]domain.Asset, int64, error) {
	return u.assetRepo.List(ctx, filter)
}

func (u *assetUsecase) UpdateAsset(ctx context.Context, actorID uuid.UUID, asset *domain.Asset) error {
	oldAsset, err := u.assetRepo.GetByID(ctx, asset.ID)
	if err != nil {
		return fmt.Errorf("asset not found: %w", err)
	}

	oldDataBytes, _ := json.Marshal(oldAsset)
	var oldJSON domain.JSONB
	_ = json.Unmarshal(oldDataBytes, &oldJSON)

	if err := u.assetRepo.Update(ctx, asset); err != nil {
		return fmt.Errorf("failed to update asset: %w", err)
	}

	newDataBytes, _ := json.Marshal(asset)
	var newJSON domain.JSONB
	_ = json.Unmarshal(newDataBytes, &newJSON)

	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &actorID,
		Action:      "UPDATE_ASSET",
		TargetTable: "assets",
		TargetID:    &asset.ID,
		OldData:     oldJSON,
		NewData:     newJSON,
	})

	return nil
}

func (u *assetUsecase) DeleteAsset(ctx context.Context, actorID uuid.UUID, id uuid.UUID) error {
	oldAsset, err := u.assetRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("asset not found: %w", err)
	}

	if oldAsset.Status == domain.AssetStatusBorrowed {
		return fmt.Errorf("cannot delete an asset that is currently borrowed")
	}

	if err := u.assetRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete asset: %w", err)
	}

	oldDataBytes, _ := json.Marshal(oldAsset)
	var oldJSON domain.JSONB
	_ = json.Unmarshal(oldDataBytes, &oldJSON)

	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ActorID:     &actorID,
		Action:      "DELETE_ASSET",
		TargetTable: "assets",
		TargetID:    &id,
		OldData:     oldJSON,
	})

	return nil
}
