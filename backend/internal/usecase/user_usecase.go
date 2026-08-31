package usecase

import (
	"context"
	"equipflow-backend/internal/domain"
	"fmt"

	"github.com/google/uuid"
)

type userUsecase struct {
	userRepo  domain.UserRepository
	auditRepo domain.AuditRepository
}

func NewUserUsecase(userRepo domain.UserRepository, auditRepo domain.AuditRepository) domain.UserUsecase {
	return &userUsecase{
		userRepo:  userRepo,
		auditRepo: auditRepo,
	}
}

func (u *userUsecase) ListUsers(ctx context.Context) ([]domain.Profile, error) {
	return u.userRepo.ListUsers(ctx)
}

func (u *userUsecase) GrantRole(ctx context.Context, targetUserID uuid.UUID, newRole domain.UserRole, actorID uuid.UUID) error {
	target, err := u.userRepo.GetByID(ctx, targetUserID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	oldRole := target.Role
	if err := u.userRepo.UpdateRole(ctx, targetUserID, newRole); err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}

	// Audit Trail for RBAC Privilege Granting
	if u.auditRepo != nil {
		_ = u.auditRepo.Create(ctx, &domain.AuditLog{
			ActorID:     &actorID,
			Action:      "GRANT_PERMISSION",
			TargetTable: "profiles",
			TargetID:    &targetUserID,
			OldData:     domain.JSONB{"role": string(oldRole)},
			NewData:     domain.JSONB{"role": string(newRole)},
		})
	}

	return nil
}

func (u *userUsecase) ToggleActive(ctx context.Context, targetUserID uuid.UUID, isActive bool, actorID uuid.UUID) error {
	target, err := u.userRepo.GetByID(ctx, targetUserID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if err := u.userRepo.UpdateStatus(ctx, targetUserID, isActive); err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	if u.auditRepo != nil {
		_ = u.auditRepo.Create(ctx, &domain.AuditLog{
			ActorID:     &actorID,
			Action:      "TOGGLE_USER_STATUS",
			TargetTable: "profiles",
			TargetID:    &targetUserID,
			OldData:     domain.JSONB{"is_active": target.IsActive},
			NewData:     domain.JSONB{"is_active": isActive},
		})
	}

	return nil
}
