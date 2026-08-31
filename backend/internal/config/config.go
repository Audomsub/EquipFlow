package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	Env               string
	DatabaseURL       string
	SupabaseURL       string
	SupabaseJWTSecret string
	SupabaseAnonKey   string
}

func LoadConfig() *Config {
	// Try to load .env file if it exists, otherwise use environment variables
	if err := godotenv.Load(".env"); err != nil {
		log.Println("[Config] Notice: .env file not found, using system environment variables")
	}

	port := getEnv("PORT", "8081")
	env := getEnv("ENV", "development")
	dbURL := getEnv("DATABASE_URL", "")
	supabaseURL := getEnv("SUPABASE_URL", "")
	jwtSecret := getEnv("SUPABASE_JWT_SECRET", "")
	anonKey := getEnv("SUPABASE_ANON_KEY", "")

	return &Config{
		Port:              port,
		Env:               env,
		DatabaseURL:       dbURL,
		SupabaseURL:       supabaseURL,
		SupabaseJWTSecret: jwtSecret,
		SupabaseAnonKey:   anonKey,
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}
