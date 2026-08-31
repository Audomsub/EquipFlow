package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DashboardKPIs holds executive metrics
type DashboardKPIs struct {
	TotalAssets       int64   `json:"total_assets"`
	AvailableAssets   int64   `json:"available_assets"`
	BorrowedAssets    int64   `json:"borrowed_assets"`
	MaintenanceAssets int64   `json:"maintenance_assets"`
	PendingRequests   int64   `json:"pending_requests"`
	ApprovedRequests  int64   `json:"approved_requests"`
	OverdueRequests   int64   `json:"overdue_requests"`
	UtilizationRate   float64 `json:"utilization_rate"` // Borrowed / Total * 100
}

// CategoryStat holds count per category
type CategoryStat struct {
	CategoryName  string `json:"category_name"`
	TotalAssets   int64  `json:"total_assets"`
	BorrowedCount int64  `json:"borrowed_count"`
}

// RecentActivity holds lightweight audit/borrow events
type RecentActivity struct {
	ID        uuid.UUID `json:"id"`
	Action    string    `json:"action"`
	ActorName string    `json:"actor_name"`
	Details   string    `json:"details"`
	CreatedAt time.Time `json:"created_at"`
}

// DashboardSummary combines all metrics for the Admin dashboard
type DashboardSummary struct {
	KPIs             DashboardKPIs    `json:"kpis"`
	CategoryStats    []CategoryStat   `json:"category_stats"`
	RecentActivities []RecentActivity `json:"recent_activities"`
}

// AnalyticsRepository interface
type AnalyticsRepository interface {
	GetDashboardSummary(ctx context.Context) (*DashboardSummary, error)
	GetEmployeeStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error)
}

// AnalyticsUsecase interface
type AnalyticsUsecase interface {
	GetDashboardSummary(ctx context.Context) (*DashboardSummary, error)
	GetEmployeeStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error)
}
