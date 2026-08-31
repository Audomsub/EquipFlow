package handler

import (
	"strconv"

	"equipflow-backend/internal/delivery/http/middleware"
	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AssetHandler struct {
	assetUsecase domain.AssetUsecase
}

func NewAssetHandler(assetUsecase domain.AssetUsecase) *AssetHandler {
	return &AssetHandler{assetUsecase: assetUsecase}
}

// ListAssets handles GET /api/v1/assets
func (h *AssetHandler) ListAssets(c *fiber.Ctx) error {
	var filter domain.AssetFilter
	filter.Search = c.Query("search")
	
	if catID := c.Query("category_id"); catID != "" {
		if id, err := uuid.Parse(catID); err == nil {
			filter.CategoryID = &id
		}
	}
	if status := c.Query("status"); status != "" {
		s := domain.AssetStatus(status)
		filter.Status = &s
	}
	if isBorrowable := c.Query("is_borrowable"); isBorrowable != "" {
		b, _ := strconv.ParseBool(isBorrowable)
		filter.IsBorrowable = &b
	}
	filter.Page, _ = strconv.Atoi(c.Query("page", "1"))
	filter.Limit, _ = strconv.Atoi(c.Query("limit", "10"))

	assets, total, err := h.assetUsecase.ListAssets(c.Context(), filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": assets,
		"meta": fiber.Map{
			"total": total,
			"page":  filter.Page,
			"limit": filter.Limit,
		},
	})
}

// GetAssetByID handles GET /api/v1/assets/:id
func (h *AssetHandler) GetAssetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid asset ID format"})
	}

	asset, err := h.assetUsecase.GetAssetByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Asset not found"})
	}

	return c.JSON(fiber.Map{"data": asset})
}

// ScanAssetByTag handles GET /api/v1/assets/scan/:tag (QR Code Scanner)
func (h *AssetHandler) ScanAssetByTag(c *fiber.Ctx) error {
	tag := c.Params("tag")
	if tag == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Asset tag is required"})
	}

	// Clean tag if it has prefix EQUIPFLOW:ASSET:
	if len(tag) > 16 && tag[:16] == "EQUIPFLOW:ASSET:" {
		tag = tag[16:]
	}

	if parsedUUID, err := uuid.Parse(tag); err == nil {
		if asset, err := h.assetUsecase.GetAssetByID(c.Context(), parsedUUID); err == nil {
			return c.JSON(fiber.Map{"data": asset})
		}
	}

	// Fallback to tag search
	var assets []domain.Asset
	assets, _, _ = h.assetUsecase.ListAssets(c.Context(), domain.AssetFilter{Search: tag, Limit: 1})
	if len(assets) > 0 {
		return c.JSON(fiber.Map{"data": assets[0]})
	}
	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Asset not found for scanned tag"})
}

// CreateAsset handles POST /api/v1/assets (IT_ADMIN, SUPER_ADMIN)
func (h *AssetHandler) CreateAsset(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var asset domain.Asset
	if err := c.BodyParser(&asset); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if asset.Name == "" || asset.AssetTag == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name and asset_tag are required"})
	}

	if err := h.assetUsecase.CreateAsset(c.Context(), user.ID, &asset); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": asset})
}

// UpdateAsset handles PUT /api/v1/assets/:id (IT_ADMIN, SUPER_ADMIN)
func (h *AssetHandler) UpdateAsset(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid asset ID"})
	}

	var asset domain.Asset
	if err := c.BodyParser(&asset); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	asset.ID = id

	if err := h.assetUsecase.UpdateAsset(c.Context(), user.ID, &asset); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": asset})
}

// DeleteAsset handles DELETE /api/v1/assets/:id (SUPER_ADMIN)
func (h *AssetHandler) DeleteAsset(c *fiber.Ctx) error {
	user, err := middleware.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid asset ID"})
	}

	if err := h.assetUsecase.DeleteAsset(c.Context(), user.ID, id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Asset deleted successfully"})
}
