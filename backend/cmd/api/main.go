package main

import (
	"context"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/KobiSonne/gamekey-marketplace/internal/auth"
	"github.com/KobiSonne/gamekey-marketplace/internal/database"
	"github.com/KobiSonne/gamekey-marketplace/internal/db"
	"github.com/KobiSonne/gamekey-marketplace/internal/handlers"
	"github.com/KobiSonne/gamekey-marketplace/internal/middleware"
	"github.com/KobiSonne/gamekey-marketplace/internal/repository"
	"github.com/KobiSonne/gamekey-marketplace/internal/services"
)

func main() {
	// Load .env file if present
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/gamekey_db?sslmode=disable"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-eneba-jwt-key-2026"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()

	// Connect to PostgreSQL with pgxpool
	dbPool, err := database.NewPostgresPool(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbPool.Close()

	// Run idempotent database seed if empty
	if err := db.SeedIfEmpty(ctx, dbPool); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	// Initialize Services & Repositories
	authService := auth.NewAuthService(dbPool, jwtSecret)
	storeRepo := repository.NewStoreRepository(dbPool)
	checkoutService := services.NewCheckoutService(dbPool)

	// Initialize Handlers
	authHandler := handlers.NewAuthHandler(authService)
	storeHandler := handlers.NewStoreHandler(storeRepo)
	ordersHandler := handlers.NewOrdersHandler(checkoutService)

	// Setup Gin Router
	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	api := r.Group("/api")
	{
		// Auth Routes
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.GET("/me", middleware.RequireAuth(authService), authHandler.Me)
		}

		// Public Storefront & Catalog Routes
		api.GET("/homepage", storeHandler.GetHomepage)
		api.GET("/products", storeHandler.GetProducts)
		api.GET("/products/:slug", storeHandler.GetProductBySlug)

		// Protected Checkout & Orders Routes
		protected := api.Group("/")
		protected.Use(middleware.RequireAuth(authService))
		{
			protected.POST("/checkout", ordersHandler.Checkout)
			protected.GET("/orders", ordersHandler.GetOrders)
		}
	}

	log.Printf("[server] Starting Eneba-inspired marketplace backend on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server shutdown: %v", err)
	}
}
