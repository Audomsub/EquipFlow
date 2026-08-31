package postgres

import (
	"context"
	"time"

	"equipflow-backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type analyticsRepository struct {
	db *gorm.DB
}

func NewAnalyticsRepository(db *gorm.DB) domain.AnalyticsRepository {
	return &analyticsRepository{db: db}
}

func (r *analyticsRepository) GetDashboardSummary(ctx context.Context) (*domain.DashboardSummary, error) {
	var kpis domain.DashboardKPIs

	// 1. Assets KPIs
	_ = r.db.WithContext(ctx).Model(&domain.Asset{}).Count(&kpis.TotalAssets).Error
	_ = r.db.WithContext(ctx).Model(&domain.Asset{}).Where("status = ?", domain.AssetStatusAvailable).Count(&kpis.AvailableAssets).Error
	_ = r.db.WithContext(ctx).Model(&domain.Asset{}).Where("status = ?", domain.AssetStatusBorrowed).Count(&kpis.BorrowedAssets).Error
	_ = r.db.WithContext(ctx).Model(&domain.Asset{}).Where("status = ?", domain.AssetStatusMaintenance).Count(&kpis.MaintenanceAssets).Error

	if kpis.TotalAssets > 0 {
		kpis.UtilizationRate = float64(kpis.BorrowedAssets) / float64(kpis.TotalAssets) * 100.0
	}

	// 2. Borrow Request KPIs
	_ = r.db.WithContext(ctx).Model(&domain.BorrowRequest{}).Where("status = ?", domain.RequestStatusPending).Count(&kpis.PendingRequests).Error
	_ = r.db.WithContext(ctx).Model(&domain.BorrowRequest{}).Where("status = ?", domain.RequestStatusApproved).Count(&kpis.ApprovedRequests).Error
	
	// Overdue: status = BORROWED and end_date < NOW()
	now := time.Now()
	_ = r.db.WithContext(ctx).Model(&domain.BorrowRequest{}).
		Where("status = ? AND end_date < ?", domain.RequestStatusBorrowed, now).
		Count(&kpis.OverdueRequests).Error

	// 3. Category Stats
	var catStats []domain.CategoryStat
	rows, err := r.db.WithContext(ctx).Raw(`
		SELECT 
			COALESCE(c.name, 'Uncategorized') as category_name,
			COUNT(a.id) as total_assets,
			COUNT(CASE WHEN a.status = 'BORROWED' THEN 1 END) as borrowed_count
		FROM public.assets a
		LEFT JOIN public.categories c ON a.category_id = c.id
		GROUP BY c.name
		ORDER BY total_assets DESC
		LIMIT 5
	`).Rows()

	if err == nil && rows != nil {
		defer rows.Close()
		for rows.Next() {
			var s domain.CategoryStat
			if err := rows.Scan(&s.CategoryName, &s.TotalAssets, &s.BorrowedCount); err == nil {
				catStats = append(catStats, s)
			}
		}
	}

	// 4. Recent Activities from Audit Logs
	var auditLogs []domain.AuditLog
	_ = r.db.WithContext(ctx).Preload("Actor").Order("created_at DESC").Limit(6).Find(&auditLogs).Error

	var activities []domain.RecentActivity
	for _, l := range auditLogs {
		actorName := "System"
		if l.Actor != nil && l.Actor.FullName != "" {
			actorName = l.Actor.FullName
		}
		activities = append(activities, domain.RecentActivity{
			ID:        l.ID,
			Action:    l.Action,
			ActorName: actorName,
			Details:   "Table: " + l.TargetTable,
			CreatedAt: l.CreatedAt,
		})
	}

	return &domain.DashboardSummary{
		KPIs:             kpis,
		CategoryStats:    catStats,
		RecentActivities: activities,
	}, nil
}

func (r *analyticsRepository) GetEmployeeStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error) {
	var activeBorrows int64
	var pendingCount int64

	_ = r.db.WithContext(ctx).Model(&domain.BorrowRequest{}).
		Where("user_id = ? AND status = ?", userID, domain.RequestStatusBorrowed).
		Count(&activeBorrows).Error

	_ = r.db.WithContext(ctx).Model(&domain.BorrowRequest{}).
		Where("user_id = ? AND status = ?", userID, domain.RequestStatusPending).
		Count(&pendingCount).Error

	return map[string]interface{}{
		"active_borrows": activeBorrows,
		"pending_count":  pendingCount,
	}, nil
}
