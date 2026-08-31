package middleware

import (
	"equipflow-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
)

// RequireRoles restricts endpoint access to specific roles (EMPLOYEE, IT_ADMIN, SUPER_ADMIN)
func RequireRoles(allowedRoles ...domain.UserRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, err := GetUserFromContext(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized request",
			})
		}

		// Check if user's role is in the allowed list
		isAllowed := false
		for _, role := range allowedRoles {
			if user.Role == role {
				isAllowed = true
				break
			}
		}

		if !isAllowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied: insufficient privileges",
			})
		}

		return c.Next()
	}
}

// RequireAdmin is shorthand for IT_ADMIN or SUPER_ADMIN
func RequireAdmin() fiber.Handler {
	return RequireRoles(domain.RoleITAdmin, domain.RoleSuperAdmin)
}

// RequireSuperAdmin is shorthand for SUPER_ADMIN only
func RequireSuperAdmin() fiber.Handler {
	return RequireRoles(domain.RoleSuperAdmin)
}
