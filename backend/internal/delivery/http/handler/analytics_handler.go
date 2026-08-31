package handler

import (
	"equipflow-backend/internal/delivery/http/middleware"
	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
)

type AnalyticsHandler struct {
	analyticsUsecase domain.AnalyticsUsecase
}

func NewAnalyticsHandler(analyticsUsecase domain.AnalyticsUsecase) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsUsecase: analyticsUsecase}
}

// GetDashboardSummary handles GET /api/v1/analytics/dashboard
func (h *AnalyticsHandler) GetDashboardSummary(c *fiber.Ctx) error {
	summary, err := h.analyticsUsecase.GetDashboardSummary(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": summary})
}

// GetEmployeeStats handles GET /api/v1/analytics/my-stats
func (h *AnalyticsHandler) GetEmployeeStats(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	stats, err := h.analyticsUsecase.GetEmployeeStats(c.Context(), user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": stats})
}
