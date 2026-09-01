package domain

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

type AssetStatus string

const (
	AssetStatusAvailable   AssetStatus = "AVAILABLE"
	AssetStatusReserved    AssetStatus = "RESERVED"
	AssetStatusBorrowed    AssetStatus = "BORROWED"
	AssetStatusMaintenance AssetStatus = "MAINTENANCE"
	AssetStatusLost        AssetStatus = "LOST"
	AssetStatusDisposed    AssetStatus = "DISPOSED"
)

type ConditionStatus string

const (
	ConditionExcellent ConditionStatus = "EXCELLENT"
	ConditionGood      ConditionStatus = "GOOD"
	ConditionFair      ConditionStatus = "FAIR"
	ConditionDamaged   ConditionStatus = "DAMAGED"
	ConditionBroken    ConditionStatus = "BROKEN"
)

// JSONB for PostgreSQL jsonb fields in GORM
type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return json.Marshal(map[string]interface{}{})
	}
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = make(map[string]interface{})
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed for JSONB")
	}
	return json.Unmarshal(bytes, j)
}

// Category Entity
type Category struct {
	ID                 uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name               string    `gorm:"type:text;not null;unique" json:"name"`
	Description        *string   `gorm:"type:text" json:"description,omitempty"`
	Icon               string    `gorm:"type:text;default:'box'" json:"icon"`
	RequiredFormFields JSONB     `gorm:"type:jsonb;default:'[]'" json:"required_form_fields"`
	ChecklistTemplate  JSONB     `gorm:"type:jsonb;default:'[]'" json:"checklist_template"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Category) TableName() string {
	return "public.categories"
}

// Location Entity
type Location struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name      string    `gorm:"type:text;not null" json:"name"`
	Building  *string   `gorm:"type:text" json:"building,omitempty"`
	Room      *string   `gorm:"type:text" json:"room,omitempty"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Location) TableName() string {
	return "public.locations"
}

// CategoryRepository interface defines database operations for Categories
type CategoryRepository interface {
	List(ctx context.Context) ([]Category, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Category, error)
	Create(ctx context.Context, category *Category) error
	Update(ctx context.Context, category *Category) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// LocationRepository interface defines database operations for Locations
type LocationRepository interface {
	List(ctx context.Context) ([]Location, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Location, error)
	Create(ctx context.Context, location *Location) error
}

// CategoryUsecase interface defines business logic for Categories & Locations
type CategoryUsecase interface {
	ListCategories(ctx context.Context) ([]Category, error)
	GetCategoryByID(ctx context.Context, id uuid.UUID) (*Category, error)
	CreateCategory(ctx context.Context, actorID uuid.UUID, category *Category) error
	UpdateCategory(ctx context.Context, actorID uuid.UUID, category *Category) error
	DeleteCategory(ctx context.Context, actorID uuid.UUID, id uuid.UUID) error
	ListLocations(ctx context.Context) ([]Location, error)
	CreateLocation(ctx context.Context, actorID uuid.UUID, location *Location) error
}

// Asset Entity
type Asset struct {
	ID               uuid.UUID       `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	AssetTag         string          `gorm:"type:text;not null;unique" json:"asset_tag"`
	SerialNumber     *string         `gorm:"type:text;unique" json:"serial_number,omitempty"`
	Name             string          `gorm:"type:text;not null" json:"name"`
	Model            *string         `gorm:"type:text" json:"model,omitempty"`
	Brand            *string         `gorm:"type:text" json:"brand,omitempty"`
	CategoryID       *uuid.UUID      `gorm:"type:uuid" json:"category_id,omitempty"`
	Category         *Category       `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	LocationID       *uuid.UUID      `gorm:"type:uuid" json:"location_id,omitempty"`
	Location         *Location       `gorm:"foreignKey:LocationID" json:"location,omitempty"`
	Status           AssetStatus     `gorm:"type:asset_status_enum;not null;default:'AVAILABLE'" json:"status"`
	CurrentCondition ConditionStatus `gorm:"type:condition_status_enum;not null;default:'GOOD'" json:"current_condition"`
	ImageURL         *string         `gorm:"type:text" json:"image_url,omitempty"`
	Specifications   JSONB           `gorm:"type:jsonb;default:'{}'" json:"specifications"`
	Notes            *string         `gorm:"type:text" json:"notes,omitempty"`
	IsBorrowable     bool            `gorm:"not null;default:true" json:"is_borrowable"`
	CreatedAt        time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Asset) TableName() string {
	return "public.assets"
}

// Filter params for asset list
type AssetFilter struct {
	Search       string       `query:"search"`
	CategoryID   *uuid.UUID   `query:"category_id"`
	Status       *AssetStatus `query:"status"`
	IsBorrowable *bool        `query:"is_borrowable"`
	Page         int          `query:"page"`
	Limit        int          `query:"limit"`
}

// AssetRepository interface defines methods for asset data operations
type AssetRepository interface {
	Create(ctx context.Context, asset *Asset) error
	GetByID(ctx context.Context, id uuid.UUID) (*Asset, error)
	GetByAssetTag(ctx context.Context, assetTag string) (*Asset, error)
	List(ctx context.Context, filter AssetFilter) ([]Asset, int64, error)
	Update(ctx context.Context, asset *Asset) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status AssetStatus) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// AssetUsecase interface defines business rules for assets
type AssetUsecase interface {
	CreateAsset(ctx context.Context, actorID uuid.UUID, asset *Asset) error
	GetAssetByID(ctx context.Context, id uuid.UUID) (*Asset, error)
	ListAssets(ctx context.Context, filter AssetFilter) ([]Asset, int64, error)
	UpdateAsset(ctx context.Context, actorID uuid.UUID, asset *Asset) error
	DeleteAsset(ctx context.Context, actorID uuid.UUID, id uuid.UUID) error
}
