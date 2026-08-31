package http

import (
	"equipflow-backend/internal/config"
	"equipflow-backend/internal/delivery/http/handler"
	"equipflow-backend/internal/delivery/http/middleware"
	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type RouterConfig struct {
	App              *fiber.App
	Cfg              *config.Config
	DB               *gorm.DB
	AssetHandler     *handler.AssetHandler
	BorrowHandler    *handler.BorrowHandler
	AnalyticsHandler *handler.AnalyticsHandler
	AuditHandler     *handler.AuditHandler
	UserHandler      *handler.UserHandler
}

func SetupRoutes(rc RouterConfig) {
	api := rc.App.Group("/api/v1")

	// Protected routes (Require valid Supabase Auth JWT)
	authMiddleware := middleware.AuthMiddleware(rc.Cfg, rc.DB)
	protected := api.Group("", authMiddleware)

	// Current authenticated profile info
	protected.Get("/auth/me", func(c *fiber.Ctx) error {
		user, err := middleware.GetUserFromContext(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}
		var profile domain.Profile
		if err := rc.DB.WithContext(c.Context()).Where("id = ?", user.ID).First(&profile).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Profile not found"})
		}
		return c.JSON(fiber.Map{"data": profile})
	})

	// -------------------------------------------------------------------------
	// ASSET ROUTES
	// -------------------------------------------------------------------------
	assets := protected.Group("/assets")
	{
		// Employees and Admins can view assets
		assets.Get("/", rc.AssetHandler.ListAssets)
		assets.Get("/:id", rc.AssetHandler.GetAssetByID)

		// IT_ADMIN & SUPER_ADMIN can create and edit assets
		adminAssets := assets.Group("", middleware.RequireAdmin())
		adminAssets.Post("/", rc.AssetHandler.CreateAsset)
		adminAssets.Put("/:id", rc.AssetHandler.UpdateAsset)

		// Scan Asset by Tag or QR Code
		assets.Get("/scan/:tag", rc.AssetHandler.ScanAssetByTag)

		// Only SUPER_ADMIN can delete assets
		superAdminAssets := assets.Group("", middleware.RequireSuperAdmin())
		superAdminAssets.Delete("/:id", rc.AssetHandler.DeleteAsset)
	}

	// -------------------------------------------------------------------------
	// BORROW REQUEST ROUTES
	// -------------------------------------------------------------------------
	borrows := protected.Group("/borrow-requests")
	{
		// Any authenticated user can submit a borrow request and view their requests
		borrows.Post("/", rc.BorrowHandler.CreateBorrowRequest)
		borrows.Get("/", rc.BorrowHandler.ListRequests)
		borrows.Get("/:id", rc.BorrowHandler.GetRequestByID)

		// Admin routes for approvals, handovers, returns
		adminBorrows := borrows.Group("", middleware.RequireAdmin())
		adminBorrows.Post("/:id/review", rc.BorrowHandler.ReviewRequest)
		adminBorrows.Post("/:id/handover", rc.BorrowHandler.HandoverAsset)
		adminBorrows.Post("/:id/return", rc.BorrowHandler.ReturnAsset)
	}

	// -------------------------------------------------------------------------
	// ANALYTICS & DASHBOARD ROUTES
	// -------------------------------------------------------------------------
	analytics := protected.Group("/analytics")
	{
		analytics.Get("/dashboard", rc.AnalyticsHandler.GetDashboardSummary)
		analytics.Get("/my-stats", rc.AnalyticsHandler.GetEmployeeStats)
	}

	// -------------------------------------------------------------------------
	// AUDIT TRAIL ROUTES
	// -------------------------------------------------------------------------
	audits := protected.Group("/audit-logs", middleware.RequireAdmin())
	{
		audits.Get("/", rc.AuditHandler.ListAuditLogs)
	}

	// -------------------------------------------------------------------------
	// USER MANAGEMENT & RBAC ROUTES (SUPER_ADMIN & IT_ADMIN)
	// -------------------------------------------------------------------------
	users := protected.Group("/users")
	{
		// IT_ADMIN and SUPER_ADMIN can view all users
		users.Get("/", middleware.RequireAdmin(), rc.UserHandler.ListUsers)

		// Only SUPER_ADMIN can grant roles and toggle active status
		superAdminUsers := users.Group("", middleware.RequireSuperAdmin())
		superAdminUsers.Post("/:id/grant-role", rc.UserHandler.GrantRole)
		superAdminUsers.Post("/:id/status", rc.UserHandler.ToggleStatus)
	}
}
