package handler

import (
	"equipflow-backend/internal/delivery/http/middleware"
	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type NotificationHandler struct {
	notifRepo domain.NotificationRepository
}

func NewNotificationHandler(notifRepo domain.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{notifRepo: notifRepo}
}

func (h *NotificationHandler) ListMyNotifications(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	notifs, err := h.notifRepo.ListByUserID(c.Context(), user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": notifs})
}

func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid notification ID"})
	}

	if err := h.notifRepo.MarkAsRead(c.Context(), id, user.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Marked as read"})
}

func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.notifRepo.MarkAllAsRead(c.Context(), user.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "All notifications marked as read"})
}
