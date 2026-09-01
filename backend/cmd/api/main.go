package main

import (
	"log"

	"equipflow-backend/internal/config"
	deliveryHttp "equipflow-backend/internal/delivery/http"
	"equipflow-backend/internal/delivery/http/handler"
	"equipflow-backend/internal/repository/postgres"
	"equipflow-backend/internal/usecase"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// 1. Load Configurations
	cfg := config.LoadConfig()

	log.Println("==================================================")
	log.Println("🚀 Initializing EquipFlow API Server...")
	log.Printf("Environment: %s | Port: %s\n", cfg.Env, cfg.Port)
	log.Println("==================================================")

	// 2. Connect to Supabase PostgreSQL
	if cfg.DatabaseURL == "" {
		log.Fatalf("❌ DATABASE_URL is not set in .env")
	}

	dbClient, err := postgres.NewPostgresDB(cfg.DatabaseURL, cfg.Env == "development")
	if err != nil {
		log.Fatalf("❌ Database connection error: %v", err)
	}

	// 3. Initialize Repositories
	assetRepo := postgres.NewAssetRepository(dbClient.DB)
	borrowRepo := postgres.NewBorrowRepository(dbClient.DB)
	auditRepo := postgres.NewAuditRepository(dbClient.DB)
	analyticsRepo := postgres.NewAnalyticsRepository(dbClient.DB)
	userRepo := postgres.NewUserRepository(dbClient.DB)
	catRepo, locRepo := postgres.NewCategoryRepository(dbClient.DB)
	notifRepo := postgres.NewNotificationRepository(dbClient.DB)

	// 4. Initialize Usecases (Business Logic)
	assetUsecase := usecase.NewAssetUsecase(assetRepo, auditRepo)
	borrowUsecase := usecase.NewBorrowUsecase(borrowRepo, assetRepo, auditRepo, notifRepo)
	analyticsUsecase := usecase.NewAnalyticsUsecase(analyticsRepo)
	userUsecase := usecase.NewUserUsecase(userRepo, auditRepo)
	catUsecase := usecase.NewCategoryUsecase(catRepo, locRepo, auditRepo)

	// 5. Initialize Delivery Handlers
	assetHandler := handler.NewAssetHandler(assetUsecase)
	borrowHandler := handler.NewBorrowHandler(borrowUsecase)
	analyticsHandler := handler.NewAnalyticsHandler(analyticsUsecase)
	auditHandler := handler.NewAuditHandler(auditRepo)
	userHandler := handler.NewUserHandler(userUsecase)
	catHandler := handler.NewCategoryHandler(catUsecase)
	notifHandler := handler.NewNotificationHandler(notifRepo)

	// 6. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "EquipFlow Backend v1.0",
	})

	// 7. Register Global Middlewares
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Dev-Role, x-dev-role",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: false,
	}))

	// 8. Health Check & Database Ping Test Route
	app.Get("/health", func(c *fiber.Ctx) error {
		sqlDB, err := dbClient.DB.DB()
		dbStatus := "connected"
		if err != nil || sqlDB.Ping() != nil {
			dbStatus = "disconnected"
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"status":   "healthy",
			"app":      "EquipFlow Backend API",
			"database": dbStatus,
		})
	})

	// 9. Wire Application Routes (Clean Architecture)
	deliveryHttp.SetupRoutes(deliveryHttp.RouterConfig{
		App:                 app,
		Cfg:                 cfg,
		DB:                  dbClient.DB,
		AssetHandler:        assetHandler,
		BorrowHandler:       borrowHandler,
		AnalyticsHandler:    analyticsHandler,
		AuditHandler:        auditHandler,
		UserHandler:         userHandler,
		CategoryHandler:     catHandler,
		NotificationHandler: notifHandler,
	})

	// 10. Start Server
	log.Printf("🚀 Server is running on port :%s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("❌ Server failed to start: %v", err)
	}
}
