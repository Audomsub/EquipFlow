package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleEmployee   UserRole = "EMPLOYEE"
	RoleITAdmin    UserRole = "IT_ADMIN"
	RoleSuperAdmin UserRole = "SUPER_ADMIN"
)

// Profile represents the public.profiles entity in PostgreSQL
type Profile struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Email        string    `gorm:"type:text;not null;unique" json:"email"`
	FullName     string    `gorm:"type:text;not null" json:"full_name"`
	EmployeeCode *string   `gorm:"type:text;unique" json:"employee_code,omitempty"`
	Department   *string   `gorm:"type:text" json:"department,omitempty"`
	PhoneNumber  *string   `gorm:"type:text" json:"phone_number,omitempty"`
	Role         UserRole  `gorm:"type:user_role_enum;not null;default:'EMPLOYEE'" json:"role"`
	IsActive     bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Profile) TableName() string {
	return "public.profiles"
}

// ContextUser represents authenticated user info stored in fiber.Ctx.Locals
type ContextUser struct {
	ID    uuid.UUID `json:"id"`
	Email string    `json:"email"`
	Role  UserRole  `json:"role"`
}

// UserRepository interface defines methods for user management
type UserRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Profile, error)
	GetByEmail(ctx context.Context, email string) (*Profile, error)
	UpdateRole(ctx context.Context, id uuid.UUID, role UserRole) error
	ListUsers(ctx context.Context) ([]Profile, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, isActive bool) error
}

// UserUsecase interface defines business logic for user management & RBAC granting
type UserUsecase interface {
	ListUsers(ctx context.Context) ([]Profile, error)
	GrantRole(ctx context.Context, targetUserID uuid.UUID, newRole UserRole, actorID uuid.UUID) error
	ToggleActive(ctx context.Context, targetUserID uuid.UUID, isActive bool, actorID uuid.UUID) error
}
