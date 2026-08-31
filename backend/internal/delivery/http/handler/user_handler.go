package handler

import (
	"equipflow-backend/internal/delivery/http/middleware"
	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type UserHandler struct {
	userUsecase domain.UserUsecase
}

func NewUserHandler(userUsecase domain.UserUsecase) *UserHandler {
	return &UserHandler{userUsecase: userUsecase}
}

// ListUsers handles GET /api/v1/users (Admin only)
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	users, err := h.userUsecase.ListUsers(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": users})
}

// GrantRoleRequest represents the payload for granting permissions
type GrantRoleRequest struct {
	Role domain.UserRole `json:"role"`
}

// GrantRole handles POST /api/v1/users/:id/grant-role (Super Admin only)
func (h *UserHandler) GrantRole(c *fiber.Ctx) error {
	actor, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req GrantRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if err := h.userUsecase.GrantRole(c.Context(), targetID, req.Role, actor.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Role permission updated successfully"})
}

// ToggleStatusRequest represents payload for activating/deactivating a user
type ToggleStatusRequest struct {
	IsActive bool `json:"is_active"`
}

// ToggleStatus handles POST /api/v1/users/:id/status (Super Admin only)
func (h *UserHandler) ToggleStatus(c *fiber.Ctx) error {
	actor, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req ToggleStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if err := h.userUsecase.ToggleActive(c.Context(), targetID, req.IsActive, actor.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "User status updated successfully"})
}
