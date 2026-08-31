package handler

import (
	"strconv"

	"equipflow-backend/internal/delivery/http/middleware"
	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type BorrowHandler struct {
	borrowUsecase domain.BorrowUsecase
}

func NewBorrowHandler(borrowUsecase domain.BorrowUsecase) *BorrowHandler {
	return &BorrowHandler{borrowUsecase: borrowUsecase}
}

// CreateBorrowRequest handles POST /api/v1/borrow-requests (EMPLOYEE, ADMIN)
func (h *BorrowHandler) CreateBorrowRequest(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var input domain.CreateBorrowRequestInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req, err := h.borrowUsecase.CreateRequest(c.Context(), user.ID, input)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Borrow request submitted successfully",
		"data":    req,
	})
}

// ListRequests handles GET /api/v1/borrow-requests
// Employees can only see their own requests; Admins can see all
func (h *BorrowHandler) ListRequests(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var filter domain.BorrowFilter

	// Non-admin can only inspect their own requests
	if user.Role == domain.RoleEmployee {
		filter.UserID = &user.ID
	} else if targetUserID := c.Query("user_id"); targetUserID != "" {
		if uid, err := uuid.Parse(targetUserID); err == nil {
			filter.UserID = &uid
		}
	}

	if assetID := c.Query("asset_id"); assetID != "" {
		if aid, err := uuid.Parse(assetID); err == nil {
			filter.AssetID = &aid
		}
	}

	if status := c.Query("status"); status != "" {
		s := domain.RequestStatus(status)
		filter.Status = &s
	}

	filter.Page, _ = strconv.Atoi(c.Query("page", "1"))
	filter.Limit, _ = strconv.Atoi(c.Query("limit", "10"))

	requests, total, err := h.borrowUsecase.ListRequests(c.Context(), filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": requests,
		"meta": fiber.Map{
			"total": total,
			"page":  filter.Page,
			"limit": filter.Limit,
		},
	})
}

// GetRequestByID handles GET /api/v1/borrow-requests/:id
func (h *BorrowHandler) GetRequestByID(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	req, err := h.borrowUsecase.GetRequestByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Borrow request not found"})
	}

	// Restrict employee from peeking at other employees' requests
	if user.Role == domain.RoleEmployee && req.UserID != user.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	return c.JSON(fiber.Map{"data": req})
}

// ReviewRequest handles POST /api/v1/borrow-requests/:id/review (IT_ADMIN, SUPER_ADMIN)
func (h *BorrowHandler) ReviewRequest(c *fiber.Ctx) error {
	admin, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	var input domain.ReviewBorrowRequestInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req, err := h.borrowUsecase.ReviewRequest(c.Context(), admin.ID, id, input)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Borrow request reviewed successfully",
		"data":    req,
	})
}

// HandoverAsset handles POST /api/v1/borrow-requests/:id/handover (IT_ADMIN, SUPER_ADMIN)
func (h *BorrowHandler) HandoverAsset(c *fiber.Ctx) error {
	admin, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	var input domain.HandoverInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	tx, err := h.borrowUsecase.HandoverAsset(c.Context(), admin.ID, id, input)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Asset handover completed successfully",
		"data":    tx,
	})
}

// ReturnAsset handles POST /api/v1/borrow-requests/:id/return (IT_ADMIN, SUPER_ADMIN)
func (h *BorrowHandler) ReturnAsset(c *fiber.Ctx) error {
	admin, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	var input domain.ReturnInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	tx, err := h.borrowUsecase.ReturnAsset(c.Context(), admin.ID, id, input)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Asset return processed successfully",
		"data":    tx,
	})
}
