package handler

import (
	"strconv"

	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AuditHandler struct {
	auditRepo domain.AuditRepository
}

func NewAuditHandler(auditRepo domain.AuditRepository) *AuditHandler {
	return &AuditHandler{auditRepo: auditRepo}
}

// ListAuditLogs handles GET /api/v1/audit-logs
func (h *AuditHandler) ListAuditLogs(c *fiber.Ctx) error {
	var filter domain.AuditFilter

	if actorID := c.Query("actor_id"); actorID != "" {
		if id, err := uuid.Parse(actorID); err == nil {
			filter.ActorID = &id
		}
	}
	filter.Action = c.Query("action")
	filter.TargetTable = c.Query("target_table")
	filter.Page, _ = strconv.Atoi(c.Query("page", "1"))
	filter.Limit, _ = strconv.Atoi(c.Query("limit", "20"))

	logs, total, err := h.auditRepo.List(c.Context(), filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": logs,
		"meta": fiber.Map{
			"total": total,
			"page":  filter.Page,
			"limit": filter.Limit,
		},
	})
}
