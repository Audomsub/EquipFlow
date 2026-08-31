package postgres

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DBClient encapsulates *gorm.DB and its connection pool settings
type DBClient struct {
	DB *gorm.DB
}

// NewPostgresDB establishes and configures a connection pool to Supabase PostgreSQL
func NewPostgresDB(databaseURL string, isDev bool) (*DBClient, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	// Configure GORM log level based on environment
	gormLogLevel := logger.Warn
	if isDev {
		gormLogLevel = logger.Info
	}

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(gormLogLevel),
		// PrepareStmt enables prepared statement caching.
		// NOTE: Supported in Supabase Session Mode (Port 5432) and Direct Connection (Port 5432).
		// If using Supabase Transaction Mode (Port 6543), set this to false.
		PrepareStmt: true,
	}

	db, err := gorm.Open(postgres.Open(databaseURL), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Supabase PostgreSQL: %w", err)
	}

	// Retrieve underlying sql.DB to tune the enterprise connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to access database generic interface: %w", err)
	}

	// -------------------------------------------------------------------------
	// Connection Pool Optimization for Supabase (Supavisor / Direct)
	// -------------------------------------------------------------------------
	// MaxOpenConns: Maximum number of open connections to the database.
	// Keep within reasonable limits so we don't exhaust Supabase's max_connections limit.
	sqlDB.SetMaxOpenConns(25)

	// MaxIdleConns: Maximum number of connections in the idle connection pool.
	sqlDB.SetMaxIdleConns(10)

	// ConnMaxLifetime: Maximum amount of time a connection may be reused.
	// Supabase recommends expiring connections before network timeouts terminate them (e.g. 15-30m).
	sqlDB.SetConnMaxLifetime(15 * time.Minute)

	// ConnMaxIdleTime: Maximum amount of time a connection may be idle before being closed.
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Ping database with a timeout context to verify connection immediately
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("database ping check failed: %w", err)
	}

	log.Println("[Database] Successfully connected to Supabase PostgreSQL and verified connection pool.")

	return &DBClient{DB: db}, nil
}
