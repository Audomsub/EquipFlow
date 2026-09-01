package handler

import (
	"equipflow-backend/internal/delivery/http/middleware"
	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CategoryHandler struct {
	catUsecase domain.CategoryUsecase
}

func NewCategoryHandler(catUsecase domain.CategoryUsecase) *CategoryHandler {
	return &CategoryHandler{catUsecase: catUsecase}
}

func (h *CategoryHandler) ListCategories(c *fiber.Ctx) error {
	categories, err := h.catUsecase.ListCategories(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": categories})
}

func (h *CategoryHandler) GetCategoryByID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	category, err := h.catUsecase.GetCategoryByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Category not found"})
	}
	return c.JSON(fiber.Map{"data": category})
}

func (h *CategoryHandler) CreateCategory(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var category domain.Category
	if err := c.BodyParser(&category); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.catUsecase.CreateCategory(c.Context(), user.ID, &category); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": category})
}

func (h *CategoryHandler) UpdateCategory(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	var category domain.Category
	if err := c.BodyParser(&category); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	category.ID = id

	if err := h.catUsecase.UpdateCategory(c.Context(), user.ID, &category); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": category})
}

func (h *CategoryHandler) DeleteCategory(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	if err := h.catUsecase.DeleteCategory(c.Context(), user.ID, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Category deleted successfully"})
}

func (h *CategoryHandler) ListLocations(c *fiber.Ctx) error {
	locations, err := h.catUsecase.ListLocations(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": locations})
}

func (h *CategoryHandler) CreateLocation(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var location domain.Location
	if err := c.BodyParser(&location); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.catUsecase.CreateLocation(c.Context(), user.ID, &location); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": location})
}
