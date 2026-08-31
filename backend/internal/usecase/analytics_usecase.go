package usecase

import (
	"context"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
)

type analyticsUsecase struct {
	analyticsRepo domain.AnalyticsRepository
}

func NewAnalyticsUsecase(analyticsRepo domain.AnalyticsRepository) domain.AnalyticsUsecase {
	return &analyticsUsecase{analyticsRepo: analyticsRepo}
}

func (u *analyticsUsecase) GetDashboardSummary(ctx context.Context) (*domain.DashboardSummary, error) {
	return u.analyticsRepo.GetDashboardSummary(ctx)
}

func (u *analyticsUsecase) GetEmployeeStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error) {
	return u.analyticsRepo.GetEmployeeStats(ctx, userID)
}
