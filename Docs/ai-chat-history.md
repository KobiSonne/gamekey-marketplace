Game Key Marketplace Setup
https://gemini.google.com/app/e48356992cd92664

User prompt: Let's build an Eneba-inspired digital game key marketplace. We will use a monorepo with /backend (Go with Gin and pgx for PostgreSQL) and /frontend (React, Vite, TypeScript, Tailwind CSS). Start by outputting: 1. The complete directory tree for both /backend and /frontend. 2. A PostgreSQL SQL migration file (001_init.sql) that enables the pg_trgm extension for fuzzy search and defines tables for users, products, offers (supporting multiple sellers per product with price, original price, seller rating, and stock count), homepage_blocks (with block_type, title, sort_order, and config_json so the homepage is 100% backend-driven), orders, and order_items (which stores the generated digital_key). Include GIN trigram indexes on products.title.
Response: 1. Monorepo Directory Tree
gamekey-marketplace/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go
│   │   ├── database/
│   │   │   └── postgres.go
│   │   ├── handlers/
│   │   │   ├── auth_handler.go
│   │   │   ├── catalog_handler.go
│   │   │   ├── checkout_handler.go
│   │   │   └── homepage_handler.go
│   │   ├── middleware/
│   │   │   ├── auth.go
│   │   │   └── cors.go
│   │   ├── models/
│   │   │   ├── homepage.go
│   │   │   ├── order.go
│   │   │   ├── product.go
│   │   │   └── user.go
│   │   ├── repository/
│   │   │   ├── homepage_repo.go
│   │   │   ├── order_repo.go
│   │   │   ├── product_repo.go
│   │   │   └── user_repo.go
│   │   └── services/
│   │       ├── auth_service.go
│   │       ├── checkout_service.go
│   │       └── keygen_service.go
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_seed.sql
│   ├── .env.example
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
└── frontend/
    ├── public/
    │   └── favicon.ico
    ├── src/
    │   ├── api/
    │   │   ├── client.ts
    │   │   ├── catalog.ts
    │   │   ├── checkout.ts
    │   │   └── homepage.ts
    │   ├── components/
    │   │   ├── cart/
    │   │   │   ├── CartDrawer.tsx
    │   │   │   └── CartItem.tsx
    │   │   ├── catalog/
    │   │   │   ├── FilterSidebar.tsx
    │   │   │   ├── OfferRow.tsx
    │   │   │   ├── ProductCard.tsx
    │   │   │   └── RegionBadge.tsx
    │   │   ├── home/
    │   │   │   ├── BannerGridBlock.tsx
    │   │   │   ├── BlockRenderer.tsx
    │   │   │   ├── CategoryPillsBlock.tsx
    │   │   │   ├── HeroCarouselBlock.tsx
    │   │   │   └── ProductCarouselBlock.tsx
    │   │   └── layout/
    │   │       ├── Footer.tsx
    │   │       ├── Navbar.tsx
    │   │       └── SearchAutocomplete.tsx
    │   ├── context/
    │   │   ├── AuthContext.tsx
    │   │   └── CartContext.tsx
    │   ├── hooks/
    │   │   └── useDebounce.ts
    │   ├── pages/
    │   │   ├── CatalogPage.tsx
    │   │   ├── CheckoutSuccessPage.tsx
    │   │   ├── HomePage.tsx
    │   │   ├── OrdersPage.tsx
    │   │   └── ProductDetailPage.tsx
    │   ├── types/
    │   │   ├── catalog.ts
    │   │   ├── homepage.ts
    │   │   └── order.ts
    │   ├── App.tsx
    │   ├── index.css
    │   └── main.tsx
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── vite.config.ts


2. PostgreSQL Migration (backend/migrations/001_init.sql)
-- Enable extensions for UUID generation and fuzzy trigram search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Users table (supports buyers, sellers, and admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
    seller_rating NUMERIC(3, 2) DEFAULT 0.00 CHECK (seller_rating >= 0 AND seller_rating <= 5.00),
    seller_sales_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products table (canonical game/software metadata)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    platform VARCHAR(50) NOT NULL,          -- e.g., 'Steam', 'Xbox', 'PSN', 'Nintendo', 'Battle.net'
    region VARCHAR(50) NOT NULL,            -- e.g., 'GLOBAL', 'EUROPE', 'NORTH AMERICA', 'LATAM'
    product_type VARCHAR(50) NOT NULL DEFAULT 'GAME_KEY', -- 'GAME_KEY', 'DLC', 'GIFT_CARD', 'SUBSCRIPTION'
    cover_image_url TEXT NOT NULL,
    banner_image_url TEXT,
    genres TEXT[] NOT NULL DEFAULT '{}',
    release_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigram index on products.title for fast fuzzy search & ILIKE queries
CREATE INDEX idx_products_title_trgm ON products USING GIN (title gin_trgm_ops);
CREATE INDEX idx_products_platform ON products (platform);
CREATE INDEX idx_products_region ON products (region);
CREATE INDEX idx_products_genres ON products USING GIN (genres);

-- 3. Offers table (multi-seller listings per product)
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price_cents INT NOT NULL CHECK (price_cents > 0),
    original_price_cents INT CHECK (original_price_cents IS NULL OR original_price_cents >= price_cents),
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    seller_rating_snapshot NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (seller_rating_snapshot >= 0 AND seller_rating_snapshot <= 5.00),
    stock_count INT NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, seller_id)
);

CREATE INDEX idx_offers_product_id_price ON offers (product_id, price_cents ASC) WHERE is_active = TRUE AND stock_count > 0;
CREATE INDEX idx_offers_seller_id ON offers (seller_id);

-- 4. Homepage Blocks table (100% backend-driven dynamic storefront layout)
CREATE TABLE homepage_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_type VARCHAR(50) NOT NULL,        -- e.g., 'HERO_CAROUSEL', 'PRODUCT_CAROUSEL', 'BANNER_GRID', 'CATEGORY_PILLS'
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_homepage_blocks_active_order ON homepage_blocks (sort_order ASC) WHERE is_active = TRUE;

-- 5. Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FULFILLED', 'FAILED', 'REFUNDED')),
    total_cents INT NOT NULL CHECK (total_cents >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    payment_reference VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders (user_id, created_at DESC);

-- 6. Order Items table (stores fulfilled digital activation keys)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    unit_price_cents INT NOT NULL CHECK (unit_price_cents > 0),
    digital_key VARCHAR(255) NOT NULL,
    is_revealed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);


Ready to proceed with the seed data (002_seed.sql) and Go backend models/repositories/handlers whenever you say the word.

User prompt: Now write the Go data models (/backend/internal/models) and an idempotent database seed script (/backend/internal/db/seed.go) that runs on startup if the database is empty. Populate: - 16 recognizable digital games across Steam, PlayStation, Xbox, and Nintendo platforms, with regions (Global, Europe, US), genres, and cover art URLs (use reliable placeholder or official Steam header CDN URLs). - 2 to 4 competing seller offers per game with varying prices, discounts, and seller ratings. - 4 dynamic homepage_blocks: a hero_banner, a best_sellers product grid, a flash_deals product row, and a platform_spotlight block.
Response: 1. Go Data Models (/backend/internal/models/)
backend/internal/models/user.go
package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleBuyer  UserRole = "buyer"
	RoleSeller UserRole = "seller"
	RoleAdmin  UserRole = "admin"
)

type User struct {
	ID               uuid.UUID `json:"id" db:"id"`
	Email            string    `json:"email" db:"email"`
	Username         string    `json:"username" db:"username"`
	PasswordHash     string    `json:"-" db:"password_hash"`
	Role             UserRole  `json:"role" db:"role"`
	SellerRating     float64   `json:"seller_rating" db:"seller_rating"`
	SellerSalesCount int       `json:"seller_sales_count" db:"seller_sales_count"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}


backend/internal/models/product.go
package models

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	Slug           string     `json:"slug" db:"slug"`
	Title          string     `json:"title" db:"title"`
	Description    string     `json:"description" db:"description"`
	Platform       string     `json:"platform" db:"platform"`
	Region         string     `json:"region" db:"region"`
	ProductType    string     `json:"product_type" db:"product_type"`
	CoverImageURL  string     `json:"cover_image_url" db:"cover_image_url"`
	BannerImageURL *string    `json:"banner_image_url,omitempty" db:"banner_image_url"`
	Genres         []string   `json:"genres" db:"genres"`
	ReleaseDate    *time.Time `json:"release_date,omitempty" db:"release_date"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`

	// Computed / Joined fields for storefront API responses
	LowestPriceCents   *int    `json:"lowest_price_cents,omitempty" db:"-"`
	OriginalPriceCents *int    `json:"original_price_cents,omitempty" db:"-"`
	DiscountPercent    *int    `json:"discount_percent,omitempty" db:"-"`
	OfferCount         int     `json:"offer_count,omitempty" db:"-"`
	Offers             []Offer `json:"offers,omitempty" db:"-"`
}

type Offer struct {
	ID                   uuid.UUID `json:"id" db:"id"`
	ProductID            uuid.UUID `json:"product_id" db:"product_id"`
	SellerID             uuid.UUID `json:"seller_id" db:"seller_id"`
	PriceCents           int       `json:"price_cents" db:"price_cents"`
	OriginalPriceCents   *int      `json:"original_price_cents,omitempty" db:"original_price_cents"`
	Currency             string    `json:"currency" db:"currency"`
	SellerRatingSnapshot float64   `json:"seller_rating" db:"seller_rating_snapshot"`
	StockCount           int       `json:"stock_count" db:"stock_count"`
	IsActive             bool      `json:"is_active" db:"is_active"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`

	// Joined seller summary
	SellerUsername   string `json:"seller_username,omitempty" db:"-"`
	SellerSalesCount int    `json:"seller_sales_count,omitempty" db:"-"`
}


backend/internal/models/homepage.go
package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type HomepageBlock struct {
	ID         uuid.UUID       `json:"id" db:"id"`
	BlockType  string          `json:"block_type" db:"block_type"`
	Title      string          `json:"title" db:"title"`
	Subtitle   *string         `json:"subtitle,omitempty" db:"subtitle"`
	SortOrder  int             `json:"sort_order" db:"sort_order"`
	IsActive   bool            `json:"is_active" db:"is_active"`
	ConfigJSON json.RawMessage `json:"config" db:"config_json"`
	CreatedAt  time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at" db:"updated_at"`

	// Hydrated dynamically by the homepage service based on config_json rules
	Products []Product `json:"products,omitempty" db:"-"`
}


backend/internal/models/order.go
package models

import (
	"time"

	"github.com/google/uuid"
)

type OrderStatus string

const (
	OrderPending   OrderStatus = "PENDING"
	OrderPaid      OrderStatus = "PAID"
	OrderFulfilled OrderStatus = "FULFILLED"
	OrderFailed    OrderStatus = "FAILED"
	OrderRefunded  OrderStatus = "REFUNDED"
)

type Order struct {
	ID               uuid.UUID   `json:"id" db:"id"`
	UserID           uuid.UUID   `json:"user_id" db:"user_id"`
	Status           OrderStatus `json:"status" db:"status"`
	TotalCents       int         `json:"total_cents" db:"total_cents"`
	Currency         string      `json:"currency" db:"currency"`
	PaymentReference *string     `json:"payment_reference,omitempty" db:"payment_reference"`
	CreatedAt        time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at" db:"updated_at"`
	Items            []OrderItem `json:"items,omitempty" db:"-"`
}

type OrderItem struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrderID        uuid.UUID `json:"order_id" db:"order_id"`
	OfferID        uuid.UUID `json:"offer_id" db:"offer_id"`
	ProductID      uuid.UUID `json:"product_id" db:"product_id"`
	UnitPriceCents int       `json:"unit_price_cents" db:"unit_price_cents"`
	DigitalKey     string    `json:"digital_key" db:"digital_key"`
	IsRevealed     bool      `json:"is_revealed" db:"is_revealed"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`

	// Hydrated product summary for Order History UI
	ProductTitle    string `json:"product_title,omitempty" db:"-"`
	ProductPlatform string `json:"product_platform,omitempty" db:"-"`
	ProductRegion   string `json:"product_region,omitempty" db:"-"`
	CoverImageURL   string `json:"cover_image_url,omitempty" db:"-"`
}


2. Idempotent Database Seed Script (/backend/internal/db/seed.go)
package db

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type seedSeller struct {
	Username string
	Email    string
	Rating   float64
	Sales    int
}

type seedOffer struct {
	SellerIndex        int
	PriceCents         int
	OriginalPriceCents int
	StockCount         int
}

type seedGame struct {
	Slug        string
	Title       string
	Description string
	Platform    string
	Region      string
	CoverURL    string
	BannerURL   string
	Genres      []string
	ReleaseDate string
	Offers      []seedOffer
}

// SeedIfEmpty populates the database with sellers, 16 games, multi-seller offers,
// and 4 backend-driven homepage blocks if no products currently exist.
func SeedIfEmpty(ctx context.Context, pool *pgxpool.Pool) error {
	var productCount int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM products`).Scan(&productCount); err != nil {
		return fmt.Errorf("failed checking product count: %w", err)
	}
	if productCount > 0 {
		log.Println("[seed] Database already populated, skipping seed.")
		return nil
	}

	log.Println("[seed] Empty database detected. Seeding initial marketplace data...")

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed starting seed transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Seed 5 Verified Marketplace Sellers
	sellers := []seedSeller{
		{Username: "KeyVaultEU", Email: "vault@keyvault.example", Rating: 4.96, Sales: 48210},
		{Username: "PixelForgeKeys", Email: "sales@pixelforge.example", Rating: 4.88, Sales: 19450},
		{Username: "NordicDigital", Email: "support@nordicdigital.example", Rating: 4.99, Sales: 92100},
		{Username: "GameDropGlobal", Email: "hello@gamedrop.example", Rating: 4.74, Sales: 8320},
		{Username: "UltraLootStore", Email: "deals@ultraloot.example", Rating: 4.91, Sales: 31500},
	}

	sellerIDs := make([]uuid.UUID, len(sellers))
	// Pre-computed bcrypt hash for "Password123!"
	const dummyHash = "2a10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

	for i, s := range sellers {
		err := tx.QueryRow(ctx, `
			INSERT INTO users (email, username, password_hash, role, seller_rating, seller_sales_count)
			VALUES ($1, $2, $3, 'seller', $4, $5)
			ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
			RETURNING id
		`, s.Email, s.Username, dummyHash, s.Rating, s.Sales).Scan(&sellerIDs[i])
		if err != nil {
			return fmt.Errorf("failed inserting seller %s: %w", s.Username, err)
		}
	}

	// 2. Seed 16 Recognizable Digital Games across Steam, PlayStation, Xbox, and Nintendo
	games := []seedGame{
		{
			Slug:        "elden-ring-steam-global",
			Title:       "ELDEN RING",
			Description: "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
			Platform:    "Steam",
			Region:      "GLOBAL",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/library_hero.jpg",
			Genres:      []string{"Action", "RPG", "Open World", "Souls-like"},
			ReleaseDate: "2022-02-25",
			Offers: []seedOffer{
				{SellerIndex: 2, PriceCents: 3489, OriginalPriceCents: 5999, StockCount: 42},
				{SellerIndex: 0, PriceCents: 3549, OriginalPriceCents: 5999, StockCount: 19},
				{SellerIndex: 4, PriceCents: 3699, OriginalPriceCents: 5999, StockCount: 8},
			},
		},
		{
			Slug:        "cyberpunk-2077-steam-global",
			Title:       "Cyberpunk 2077",
			Description: "An open-world, action-adventure RPG set in the dark future of Night City — a dangerous megalopolis obsessed with power, glamor, and ceaseless body modification.",
			Platform:    "Steam",
			Region:      "GLOBAL",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/library_hero.jpg",
			Genres:      []string{"RPG", "Sci-Fi", "Open World", "FPS"},
			ReleaseDate: "2020-12-10",
			Offers: []seedOffer{
				{SellerIndex: 0, PriceCents: 2499, OriginalPriceCents: 5999, StockCount: 65},
				{SellerIndex: 1, PriceCents: 2579, OriginalPriceCents: 5999, StockCount: 30},
				{SellerIndex: 3, PriceCents: 2650, OriginalPriceCents: 5999, StockCount: 12},
				{SellerIndex: 2, PriceCents: 2799, OriginalPriceCents: 5999, StockCount: 50},
			},
		},
		{
			Slug:        "baldurs-gate-3-steam-europe",
			Title:       "Baldur's Gate 3",
			Description: "Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.",
			Platform:    "Steam",
			Region:      "EUROPE",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/library_hero.jpg",
			Genres:      []string{"RPG", "Strategy", "Turn-Based", "Fantasy"},
			ReleaseDate: "2023-08-03",
			Offers: []seedOffer{
				{SellerIndex: 2, PriceCents: 4490, OriginalPriceCents: 5999, StockCount: 25},
				{SellerIndex: 4, PriceCents: 4620, OriginalPriceCents: 5999, StockCount: 14},
			},
		},
		{
			Slug:        "red-dead-redemption-2-steam-global",
			Title:       "Red Dead Redemption 2",
			Description: "Winner of over 175 Game of the Year Awards, RDR2 is the epic tale of outlaw Arthur Morgan and the infamous Van der Linde gang across the rugged heartland of America.",
			Platform:    "Steam",
			Region:      "GLOBAL",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/library_hero.jpg",
			Genres:      []string{"Action", "Adventure", "Open World", "Western"},
			ReleaseDate: "2019-12-05",
			Offers: []seedOffer{
				{SellerIndex: 1, PriceCents: 1649, OriginalPriceCents: 5999, StockCount: 80},
				{SellerIndex: 0, PriceCents: 1699, OriginalPriceCents: 5999, StockCount: 55},
				{SellerIndex: 3, PriceCents: 1745, OriginalPriceCents: 5999, StockCount: 22},
			},
		},
		{
			Slug:        "helldivers-2-steam-europe",
			Title:       "HELLDIVERS 2",
			Description: "The Galaxy's Last Line of Offence. Enlist in the Helldivers and join the fight for freedom across a hostile galaxy in a fast, frantic, and ferocious third-person shooter.",
			Platform:    "Steam",
			Region:      "EUROPE",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/553850/library_hero.jpg",
			Genres:      []string{"Action", "Co-op", "Shooter", "Sci-Fi"},
			ReleaseDate: "2024-02-08",
			Offers: []seedOffer{
				{SellerIndex: 0, PriceCents: 2899, OriginalPriceCents: 3999, StockCount: 38},
				{SellerIndex: 2, PriceCents: 2949, OriginalPriceCents: 3999, StockCount: 44},
				{SellerIndex: 4, PriceCents: 3099, OriginalPriceCents: 3999, StockCount: 15},
			},
		},
		{
			Slug:        "god-of-war-ragnarok-psn-europe",
			Title:       "God of War Ragnarök (PS5)",
			Description: "Embark on an epic and heartfelt journey as Kratos and Atreus struggle with holding on and letting go amidst the impending Norse apocalypse.",
			Platform:    "PlayStation",
			Region:      "EUROPE",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2322010/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2322010/library_hero.jpg",
			Genres:      []string{"Action", "Adventure", "Mythology"},
			ReleaseDate: "2022-11-09",
			Offers: []seedOffer{
				{SellerIndex: 2, PriceCents: 4199, OriginalPriceCents: 7999, StockCount: 18},
				{SellerIndex: 0, PriceCents: 4350, OriginalPriceCents: 7999, StockCount: 11},
			},
		},
		{
			Slug:        "ghost-of-tsushima-directors-cut-psn-us",
			Title:       "Ghost of Tsushima Director's Cut (PS5)",
			Description: "Forge a new path and wage an unconventional war for the freedom of Tsushima in this expanded open-world samurai action adventure.",
			Platform:    "PlayStation",
			Region:      "US",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2215430/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2215430/library_hero.jpg",
			Genres:      []string{"Action", "Adventure", "Open World", "Stealth"},
			ReleaseDate: "2021-08-20",
			Offers: []seedOffer{
				{SellerIndex: 4, PriceCents: 3790, OriginalPriceCents: 6999, StockCount: 27},
				{SellerIndex: 1, PriceCents: 3899, OriginalPriceCents: 6999, StockCount: 15},
				{SellerIndex: 3, PriceCents: 3950, OriginalPriceCents: 6999, StockCount: 9},
			},
		},
		{
			Slug:        "horizon-forbidden-west-psn-global",
			Title:       "Horizon Forbidden West Complete Edition",
			Description: "Join Aloy as she braves the Forbidden West — a majestic but dangerous frontier that conceals mysterious new threats.",
			Platform:    "PlayStation",
			Region:      "GLOBAL",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2420110/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2420110/library_hero.jpg",
			Genres:      []string{"Action", "RPG", "Open World", "Sci-Fi"},
			ReleaseDate: "2022-02-18",
			Offers: []seedOffer{
				{SellerIndex: 0, PriceCents: 3249, OriginalPriceCents: 5999, StockCount: 21},
				{SellerIndex: 2, PriceCents: 3399, OriginalPriceCents: 5999, StockCount: 33},
			},
		},
		{
			Slug:        "the-last-of-us-part-1-psn-europe",
			Title:       "The Last of Us Part I (PS5)",
			Description: "Experience the emotional storytelling and unforgettable characters in The Last of Us, winner of over 200 Game of the Year awards.",
			Platform:    "PlayStation",
			Region:      "EUROPE",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1888930/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1888930/library_hero.jpg",
			Genres:      []string{"Action", "Adventure", "Horror", "Story Rich"},
			ReleaseDate: "2022-09-02",
			Offers: []seedOffer{
				{SellerIndex: 1, PriceCents: 3999, OriginalPriceCents: 7999, StockCount: 16},
				{SellerIndex: 4, PriceCents: 4149, OriginalPriceCents: 7999, StockCount: 12},
				{SellerIndex: 2, PriceCents: 4299, OriginalPriceCents: 7999, StockCount: 29},
			},
		},
		{
			Slug:        "forza-horizon-5-xbox-global",
			Title:       "Forza Horizon 5 (Xbox Series X|S / PC)",
			Description: "Your Ultimate Horizon Adventure awaits! Explore the vibrant and ever-evolving open world landscapes of Mexico with limitless driving action.",
			Platform:    "Xbox",
			Region:      "GLOBAL",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1551360/library_hero.jpg",
			Genres:      []string{"Racing", "Open World", "Multiplayer", "Sports"},
			ReleaseDate: "2021-11-09",
			Offers: []seedOffer{
				{SellerIndex: 0, PriceCents: 2699, OriginalPriceCents: 5999, StockCount: 54},
				{SellerIndex: 2, PriceCents: 2749, OriginalPriceCents: 5999, StockCount: 40},
				{SellerIndex: 3, PriceCents: 2820, OriginalPriceCents: 5999, StockCount: 17},
			},
		},
		{
			Slug:        "starfield-xbox-global",
			Title:       "Starfield (Xbox Series X|S / PC)",
			Description: "Starfield is the first new universe in over 25 years from Bethesda Game Studios, the award-winning creators of The Elder Scrolls V: Skyrim.",
			Platform:    "Xbox",
			Region:      "GLOBAL",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/library_hero.jpg",
			Genres:      []string{"RPG", "Sci-Fi", "Space", "Open World"},
			ReleaseDate: "2023-09-06",
			Offers: []seedOffer{
				{SellerIndex: 3, PriceCents: 3199, OriginalPriceCents: 6999, StockCount: 31},
				{SellerIndex: 1, PriceCents: 3349, OriginalPriceCents: 6999, StockCount: 24},
			},
		},
		{
			Slug:        "halo-infinite-campaign-xbox-us",
			Title:       "Halo Infinite Campaign (Xbox / PC)",
			Description: "When all hope is lost and humanity's fate hangs in the balance, the Master Chief is ready to confront the most ruthless foe he's ever faced.",
			Platform:    "Xbox",
			Region:      "US",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1240440/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1240440/library_hero.jpg",
			Genres:      []string{"FPS", "Action", "Sci-Fi", "Shooter"},
			ReleaseDate: "2021-12-08",
			Offers: []seedOffer{
				{SellerIndex: 4, PriceCents: 1949, OriginalPriceCents: 5999, StockCount: 45},
				{SellerIndex: 0, PriceCents: 2099, OriginalPriceCents: 5999, StockCount: 30},
				{SellerIndex: 2, PriceCents: 2150, OriginalPriceCents: 5999, StockCount: 22},
			},
		},
		{
			Slug:        "sea-of-thieves-xbox-global",
			Title:       "Sea of Thieves: 2024 Edition (Xbox / PC)",
			Description: "Sea of Thieves offers the essential pirate experience, from sailing and fighting to exploring and looting — everything you need to live the pirate life.",
			Platform:    "Xbox",
			Region:      "GLOBAL",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172620/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172620/library_hero.jpg",
			Genres:      []string{"Adventure", "Multiplayer", "Co-op", "Open World"},
			ReleaseDate: "2018-03-20",
			Offers: []seedOffer{
				{SellerIndex: 2, PriceCents: 1799, OriginalPriceCents: 3999, StockCount: 62},
				{SellerIndex: 1, PriceCents: 1849, OriginalPriceCents: 3999, StockCount: 28},
			},
		},
		{
			Slug:        "zelda-tears-of-the-kingdom-nintendo-europe",
			Title:       "The Legend of Zelda: Tears of the Kingdom",
			Description: "An epic adventure across the land and skies of Hyrule awaits in this sequel to The Legend of Zelda: Breath of the Wild.",
			Platform:    "Nintendo",
			Region:      "EUROPE",
			CoverURL:    "https://placehold.co/460x215/e60012/ffffff?text=Zelda:+Tears+of+the+Kingdom",
			BannerURL:   "https://placehold.co/1920x620/1a1a2e/ffffff?text=The+Legend+of+Zelda:+Tears+of+the+Kingdom",
			Genres:      []string{"Adventure", "Action", "Open World", "Fantasy"},
			ReleaseDate: "2023-05-12",
			Offers: []seedOffer{
				{SellerIndex: 2, PriceCents: 4799, OriginalPriceCents: 6999, StockCount: 20},
				{SellerIndex: 0, PriceCents: 4890, OriginalPriceCents: 6999, StockCount: 14},
				{SellerIndex: 4, PriceCents: 4999, OriginalPriceCents: 6999, StockCount: 11},
			},
		},
		{
			Slug:        "super-mario-bros-wonder-nintendo-us",
			Title:       "Super Mario Bros. Wonder (Switch)",
			Description: "Classic Mario side-scrolling gameplay is turned on its head with the addition of Wonder Flowers that make breathtaking changes happen.",
			Platform:    "Nintendo",
			Region:      "US",
			CoverURL:    "https://placehold.co/460x215/e60012/ffffff?text=Super+Mario+Bros.+Wonder",
			BannerURL:   "https://placehold.co/1920x620/2b1055/ffffff?text=Super+Mario+Bros.+Wonder",
			Genres:      []string{"Platformer", "Family", "Co-op", "Action"},
			ReleaseDate: "2023-10-20",
			Offers: []seedOffer{
				{SellerIndex: 4, PriceCents: 4399, OriginalPriceCents: 5999, StockCount: 25},
				{SellerIndex: 1, PriceCents: 4549, OriginalPriceCents: 5999, StockCount: 18},
			},
		},
		{
			Slug:        "monster-hunter-rise-nintendo-global",
			Title:       "Monster Hunter Rise (Nintendo Switch)",
			Description: "Rise to the challenge and join the hunt! In Monster Hunter Rise, the latest installment in the award-winning series, you'll become a hunter and explore brand new maps.",
			Platform:    "Nintendo",
			Region:      "GLOBAL",
			CoverURL:    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1446780/header.jpg",
			BannerURL:   "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1446780/library_hero.jpg",
			Genres:      []string{"Action", "RPG", "Co-op", "Fantasy"},
			ReleaseDate: "2021-03-26",
			Offers: []seedOffer{
				{SellerIndex: 0, PriceCents: 1499, OriginalPriceCents: 3999, StockCount: 49},
				{SellerIndex: 3, PriceCents: 1589, OriginalPriceCents: 3999, StockCount: 35},
				{SellerIndex: 2, PriceCents: 1649, OriginalPriceCents: 3999, StockCount: 41},
			},
		},
	}

	for _, g := range games {
		var productID uuid.UUID
		relDate, _ := time.Parse("2006-01-02", g.ReleaseDate)

		err := tx.QueryRow(ctx, `
			INSERT INTO products (
				slug, title, description, platform, region, product_type,
				cover_image_url, banner_image_url, genres, release_date
			)
			VALUES ($1, $2, $3, $4, $5, 'GAME_KEY', $6, $7, $8, $9)
			ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
			RETURNING id
		`,
			g.Slug, g.Title, g.Description, g.Platform, g.Region,
			g.CoverURL, g.BannerURL, g.Genres, relDate,
		).Scan(&productID)
		if err != nil {
			return fmt.Errorf("failed inserting product %s: %w", g.Title, err)
		}

		for _, off := range g.Offers {
			seller := sellers[off.SellerIndex]
			sellerID := sellerIDs[off.SellerIndex]

			_, err := tx.Exec(ctx, `
				INSERT INTO offers (
					product_id, seller_id, price_cents, original_price_cents,
					currency, seller_rating_snapshot, stock_count, is_active
				)
				VALUES ($1, $2, $3, $4, 'EUR', $5, $6, TRUE)
				ON CONFLICT (product_id, seller_id) DO NOTHING
			`,
				productID, sellerID, off.PriceCents, off.OriginalPriceCents,
				seller.Rating, off.StockCount,
			)
			if err != nil {
				return fmt.Errorf("failed inserting offer for %s: %w", g.Title, err)
			}
		}
	}

	// 3. Seed 4 Backend-Driven Homepage Blocks
	type seedBlock struct {
		BlockType string
		Title     string
		Subtitle  string
		SortOrder int
		Config    map[string]any
	}

	blocks := []seedBlock{
		{
			BlockType: "hero_banner",
			Title:     "Featured Blockbusters",
			Subtitle:  "Instant digital delivery from top-rated global sellers",
			SortOrder: 1,
			Config: map[string]any{
				"slides": []map[string]any{
					{
						"product_slug": "elden-ring-steam-global",
						"badge":        "EDITOR'S CHOICE",
						"headline":     "Rise, Tarnished — Save 42% Today",
						"cta_text":     "Buy Steam Key",
						"accent_color": "#f59e0b",
					},
					{
						"product_slug": "cyberpunk-2077-steam-global",
						"badge":        "TOP SELLER",
						"headline":     "Welcome to Night City — 58% Off",
						"cta_text":     "Explore Offers",
						"accent_color": "#eab308",
					},
					{
						"product_slug": "god-of-war-ragnarok-psn-europe",
						"badge":        "PLAYSTATION HIT",
						"headline":     "Fimbulwinter Is Here on PS5",
						"cta_text":     "View Deals",
						"accent_color": "#3b82f6",
					},
				},
			},
		},
		{
			BlockType: "best_sellers",
			Title:     "Best Sellers",
			Subtitle:  "Most popular digital keys right now",
			SortOrder: 2,
			Config: map[string]any{
				"layout": "grid",
				"limit":  8,
				"product_slugs": []string{
					"elden-ring-steam-global",
					"baldurs-gate-3-steam-europe",
					"helldivers-2-steam-europe",
					"cyberpunk-2077-steam-global",
					"god-of-war-ragnarok-psn-europe",
					"forza-horizon-5-xbox-global",
					"zelda-tears-of-the-kingdom-nintendo-europe",
					"red-dead-redemption-2-steam-global",
				},
			},
		},
		{
			BlockType: "flash_deals",
			Title:     "Flash Deals — Over 50% Off",
			Subtitle:  "Limited-time steep discounts across platforms",
			SortOrder: 3,
			Config: map[string]any{
				"layout":               "horizontal_row",
				"min_discount_percent": 50,
				"limit":                6,
				"ends_in_hours":        18,
				"product_slugs": []string{
					"red-dead-redemption-2-steam-global",
					"halo-infinite-campaign-xbox-us",
					"monster-hunter-rise-nintendo-global",
					"cyberpunk-2077-steam-global",
					"forza-horizon-5-xbox-global",
					"sea-of-thieves-xbox-global",
				},
			},
		},
		{
			BlockType: "platform_spotlight",
			Title:     "Shop by Platform",
			Subtitle:  "Instant activation keys tailored to your ecosystem",
			SortOrder: 4,
			Config: map[string]any{
				"platforms": []map[string]any{
					{
						"name":        "Steam",
						"slug":        "Steam",
						"tagline":     "PC Gaming Powerhouse",
						"accent_hex":  "#1b2838",
						"badge_color": "#66c0f4",
					},
					{
						"name":        "PlayStation",
						"slug":        "PlayStation",
						"tagline":     "PS5 & PS4 Digital Codes",
						"accent_hex":  "#003791",
						"badge_color": "#0070d1",
					},
					{
						"name":        "Xbox",
						"slug":        "Xbox",
						"tagline":     "Series X|S & Game Pass",
						"accent_hex":  "#107c10",
						"badge_color": "#52b043",
					},
					{
						"name":        "Nintendo",
						"slug":        "Nintendo",
						"tagline":     "Switch eShop Downloads",
						"accent_hex":  "#e60012",
						"badge_color": "#ff4d5a",
					},
				},
			},
		},
	}

	for _, b := range blocks {
		cfgBytes, err := json.Marshal(b.Config)
		if err != nil {
			return fmt.Errorf("failed marshaling config for block %s: %w", b.BlockType, err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO homepage_blocks (block_type, title, subtitle, sort_order, is_active, config_json)
			VALUES ($1, $2, $3, $4, TRUE, $5::jsonb)
		`, b.BlockType, b.Title, b.Subtitle, b.SortOrder, string(cfgBytes))
		if err != nil {
			return fmt.Errorf("failed inserting homepage block %s: %w", b.BlockType, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed committing seed transaction: %w", err)
	}

	log.Println("[seed] Successfully seeded 5 sellers, 16 games, multi-seller offers, and 4 homepage blocks.")
	return nil
}


Ready to move on to the Go repositories, HTTP handlers (Homepage, Search/Catalog with pg_trgm, Product Detail, and atomic Checkout with key generation), and main.go whenever you're ready.

User prompt: Implement user authentication in /backend/internal/auth and /backend/internal/handlers/auth.go: - POST /api/auth/register (hash passwords with bcrypt, validate email/password, return JWT + user profile). - POST /api/auth/login (verify credentials, return JWT + user profile). - GET /api/auth/me (protected route returning the current user). - Reusable Gin JWT authentication middleware (RequireAuth) that injects user_id into the request context.
Response: Here is the complete implementation for user authentication, including the reusable Gin JWT middleware, authentication service, and HTTP handlers for registration, login, and profile fetching.
1. Authentication Service (/backend/internal/auth/auth.go)
This package handles password hashing with bcrypt, JWT token generation & validation, and user database interactions.
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/your-username/gamekey-marketplace/internal/models"
)

type AuthService struct {
	db        *pgxpool.Pool
	jwtSecret []byte
}

type Claims struct {
	UserID uuid.UUID       `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func NewAuthService(db *pgxpool.Pool, jwtSecret string) *AuthService {
	return &AuthService{
		db:        db,
		jwtSecret: []byte(jwtSecret),
	}
}

// Register creates a new user, hashes the password, and returns the user model + JWT token
func (s *AuthService) Register(ctx context.Context, username, email, password string) (*models.User, string, error) {
	if len(password) < 6 {
		return nil, "", errors.New("password must be at least 6 characters long")
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("failed to hash password: %w", err)
	}

	var user models.User
	query := `
		INSERT INTO users (username, email, password_hash, role)
		VALUES ($1, $2, $3, 'buyer')
		RETURNING id, email, username, role, seller_rating, seller_sales_count, created_at, updated_at
	`

	err = s.db.QueryRow(ctx, query, username, email, string(hashedBytes)).Scan(
		&user.ID, &user.Email, &user.Username, &user.Role,
		&user.SellerRating, &user.SellerSalesCount, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return nil, "", fmt.Errorf("failed to insert user (email or username may already exist): %w", err)
	}

	token, err := s.GenerateToken(&user)
	if err != nil {
		return nil, "", err
	}

	return &user, token, nil
}

// Login verifies credentials and returns the user model + JWT token
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, string, error) {
	var user models.User
	query := `
		SELECT id, email, username, password_hash, role, seller_rating, seller_sales_count, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	err := s.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.Username, &user.PasswordHash, &user.Role,
		&user.SellerRating, &user.SellerSalesCount, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", errors.New("invalid email or password")
		}
		return nil, "", fmt.Errorf("database query error: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", errors.New("invalid email or password")
	}

	token, err := s.GenerateToken(&user)
	if err != nil {
		return nil, "", err
	}

	return &user, token, nil
}

// GetUserByID fetches user details by UUID
func (s *AuthService) GetUserByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	query := `
		SELECT id, email, username, role, seller_rating, seller_sales_count, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	err := s.db.QueryRow(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.Username, &user.Role,
		&user.SellerRating, &user.SellerSalesCount, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	return &user, nil
}

// GenerateToken creates a signed JWT valid for 72 hours
func (s *AuthService) GenerateToken(user *models.User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return signedToken, nil
}

// ValidateToken parses and verifies a JWT string, returning the claims
func (s *AuthService) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}


2. Gin JWT Authentication Middleware (/backend/internal/middleware/auth.go)
Extracts the Bearer token from the Authorization header, validates it, and injects user_id, email, and role into Gin's context.
package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/your-username/gamekey-marketplace/internal/auth"
)

const (
	ContextUserID = "user_id"
	ContextEmail  = "email"
	ContextRole   = "role"
)

func RequireAuth(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Authorization header is required"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Authorization header format must be Bearer {token}"})
			return
		}

		claims, err := authService.ValidateToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid or expired token", "details": err.Error()})
			return
		}

		// Inject claims into context for downstream handlers
		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextEmail, claims.Email)
		c.Set(ContextRole, claims.Role)

		c.Next()
	}
}

// Helper functions to easily retrieve user context in handlers
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(ContextUserID)
	if !exists {
		return uuid.Nil, false
	}
	id, ok := val.(uuid.UUID)
	return id, ok
}


3. Authentication HTTP Handlers (/backend/internal/handlers/auth_handler.go)
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/your-username/gamekey-marketplace/internal/auth"
	"github.com/your-username/gamekey-marketplace/internal/middleware"
)

type AuthHandler struct {
	authService *auth.AuthService
}

type registerRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func NewAuthHandler(authService *auth.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	user, token, err := h.authService.Register(c.Request.Context(), req.Username, req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user":  user,
	})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	user, token, err := h.authService.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

// Me handles GET /api/auth/me (Protected Route)
func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := h.authService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}


Router Wiring Example
You can register these routes in your main router setup as follows:
authService := auth.NewAuthService(dbPool, cfg.JWTSecret)
authHandler := handlers.NewAuthHandler(authService)

api := r.Group("/api")
{
    authRoutes := api.Group("/auth")
    {
        authRoutes.POST("/register", authHandler.Register)
        authRoutes.POST("/login", authHandler.Login)
        authRoutes.GET("/me", middleware.RequireAuth(authService), authHandler.Me)
    }
}



User prompt: Build the public storefront REST endpoints in /backend/internal/handlers/store.go: - GET /api/homepage: Fetches homepage_blocks ordered by sort_order, resolves the referenced product IDs/rules from the database (including the lowest active offer price for each product), and returns structured JSON blocks. - GET /api/products: Supports query params q (typo-tolerant search using PostgreSQL pg_trgm similarity() + ILIKE), platform, region, min_price, max_price, and sort (price_asc, price_desc, popularity, newest). Return each product with its lowest offer price and discount percentage. - GET /api/products/:slug: Returns full product details plus all active seller offers sorted by price ascending.
Response: Here is the complete implementation for the public storefront REST endpoints in /backend/internal/handlers/store.go along with the corresponding repository layer (/backend/internal/repository/store_repo.go), covering homepage blocks hydration, fuzzy search (pg_trgm), filtering, and product detail offers.
1. Store Repository (/backend/internal/repository/store_repo.go)
This package executes raw SQL queries against PostgreSQL, leveraging pg_trgm similarity and GIN indexes for typo-tolerant product search.
package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/your-username/gamekey-marketplace/internal/models"
)

type StoreRepository struct {
	db *pgxpool.Pool
}

func NewStoreRepository(db *pgxpool.Pool) *StoreRepository {
	return &StoreRepository{db: db}
}

// GetHomepageBlocks fetches active blocks ordered by sort_order
func (r *StoreRepository) GetHomepageBlocks(ctx context.Context) ([]models.HomepageBlock, error) {
	query := `
		id, block_type, title, subtitle, sort_order, is_active, config_json, created_at, updated_at
		FROM homepage_blocks
		WHERE is_active = TRUE
		ORDER BY sort_order ASC
	`
	// Wait, select fields properly:
	fullQuery := `SELECT id, block_type, title, subtitle, sort_order, is_active, config_json, created_at, updated_at FROM homepage_blocks WHERE is_active = TRUE ORDER BY sort_order ASC`
	rows, err := r.db.Query(ctx, fullQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to query homepage blocks: %w", err)
	}
	defer rows.Close()

	var blocks []models.HomepageBlock
	for rows.Next() {
		var b models.HomepageBlock
		var configBytes []byte
		if err := rows.Scan(
			&b.ID, &b.BlockType, &b.Title, &b.Subtitle,
			&b.SortOrder, &b.IsActive, &configBytes, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, err
		}
		b.ConfigJSON = json.RawMessage(configBytes)
		blocks = append(blocks, b)
	}
	return blocks, nil
}

// GetProductsBySlugs fetches products matching a list of slugs, including their lowest active offer
func (r *StoreRepository) GetProductsBySlugs(ctx context.Context, slugs []string) ([]models.Product, error) {
	if len(slugs) == 0 {
		return []models.Product{}, nil
	}

	query := `
		SELECT 
			p.id, p.slug, p.title, p.description, p.platform, p.region, 
			p.product_type, p.cover_image_url, p.banner_image_url, p.genres, p.release_date,
			MIN(o.price_cents) AS lowest_price_cents,
			MIN(o.original_price_cents) AS original_price_cents,
			COUNT(o.id) AS offer_count
		FROM products p
		LEFT JOIN offers o ON p.id = o.product_id AND o.is_active = TRUE AND o.stock_count > 0
		WHERE p.slug = ANY($1)
		GROUP BY p.id
	`
	rows, err := r.db.Query(ctx, query, slugs)
	if err != nil {
		return nil, fmt.Errorf("failed fetching products by slugs: %w", err)
	}
	defer rows.Close()

	productMap := make(map[string]models.Product)
	for rows.Next() {
		var p models.Product
		var lowestPrice, origPrice *int
		var offerCount int
		if err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Description, &p.Platform, &p.Region,
			&p.ProductType, &p.CoverImageURL, &p.BannerImageURL, &p.Genres, &p.ReleaseDate,
			&lowestPrice, &origPrice, &offerCount,
		); err != nil {
			return nil, err
		}
		p.LowestPriceCents = lowestPrice
		p.OriginalPriceCents = origPrice
		p.OfferCount = offerCount

		if lowestPrice != nil && origPrice != nil && *origPrice > *lowestPrice {
			pct := ((*origPrice - *lowestPrice) * 100) / *origPrice
			p.DiscountPercent = &pct
		}
		productMap[p.Slug] = p
	}

	// Preserve original slug order requested by block config
	var orderedProducts []models.Product
	for _, slug := range slugs {
		if prod, ok := productMap[slug]; ok {
			orderedProducts = append(orderedProducts, prod)
		}
	}
	return orderedProducts, nil
}

// GetFlashDeals fetches top discounted products based on min discount percentage
func (r *StoreRepository) GetFlashDeals(ctx context.Context, minDiscount int, limit int) ([]models.Product, error) {
	query := `
		SELECT 
			p.id, p.slug, p.title, p.description, p.platform, p.region, 
			p.product_type, p.cover_image_url, p.banner_image_url, p.genres, p.release_date,
			MIN(o.price_cents) AS lowest_price_cents,
			MIN(o.original_price_cents) AS original_price_cents,
			COUNT(o.id) AS offer_count
		FROM products p
		JOIN offers o ON p.id = o.product_id AND o.is_active = TRUE AND o.stock_count > 0
		WHERE o.original_price_cents IS NOT NULL AND o.original_price_cents > o.price_cents
		GROUP BY p.id
		HAVING ((MIN(o.original_price_cents) - MIN(o.price_cents)) * 100) / MIN(o.original_price_cents) >= $1
		ORDER BY ((MIN(o.original_price_cents) - MIN(o.price_cents)) * 100) / MIN(o.original_price_cents) DESC
		LIMIT $2
	`
	rows, err := r.db.Query(ctx, query, minDiscount, limit)
	if err != nil {
		return nil, fmt.Errorf("failed fetching flash deals: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		var lowestPrice, origPrice *int
		var offerCount int
		if err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Description, &p.Platform, &p.Region,
			&p.ProductType, &p.CoverImageURL, &p.BannerImageURL, &p.Genres, &p.ReleaseDate,
			&lowestPrice, &origPrice, &offerCount,
		); err != nil {
			return nil, err
		}
		p.LowestPriceCents = lowestPrice
		p.OriginalPriceCents = origPrice
		p.OfferCount = offerCount
		if lowestPrice != nil && origPrice != nil {
			pct := ((*origPrice - *lowestPrice) * 100) / *origPrice
			p.DiscountPercent = &pct
		}
		products = append(products, p)
	}
	return products, nil
}

// ProductFilterParams holds filter & search parameters for catalog browsing
type ProductFilterParams struct {
	Query     string
	Platform  string
	Region    string
	MinPrice  *int
	MaxPrice  *int
	Sort      string // price_asc, price_desc, popularity, newest
	Limit     int
	Offset    int
}

// SearchProducts supports pg_trgm fuzzy matching + ILIKE, filters, and dynamic sorting
func (r *StoreRepository) SearchProducts(ctx context.Context, p ProductFilterParams) ([]models.Product, error) {
	whereClauses := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if p.Query != "" {
		searchTerm := strings.TrimSpace(p.Query)
		whereClauses = append(whereClauses, fmt.Sprintf("(p.title ILIKE $%d OR similarity(p.title, $%d) > 0.15)", argIdx, argIdx))
		args = append(args, "%"+searchTerm+"%")
		argIdx++
	}

	if p.Platform != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("p.platform = $%d", argIdx))
		args = append(args, p.Platform)
		argIdx++
	}

	if p.Region != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("p.region = $%d", argIdx))
		args = append(args, p.Region)
		argIdx++
	}

	if p.MinPrice != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("(SELECT MIN(price_cents) FROM offers WHERE product_id = p.id AND is_active = TRUE AND stock_count > 0) >= $%d", argIdx))
		args = append(args, *p.MinPrice)
		argIdx++
	}

	if p.MaxPrice != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("(SELECT MIN(price_cents) FROM offers WHERE product_id = p.id AND is_active = TRUE AND stock_count > 0) <= $%d", argIdx))
		args = append(args, *p.MaxPrice)
		argIdx++
	}

	orderBy := "p.created_at DESC"
	switch p.Sort {
	case "price_asc":
		orderBy = "lowest_price_cents ASC NULLS LAST"
	case "price_desc":
		orderBy = "lowest_price_cents DESC NULLS LAST"
	case "popularity":
		orderBy = "offer_count DESC"
	case "newest":
		orderBy = "p.release_date DESC NULLS LAST"
	}

	limitOffsetClause := fmt.Sprintf("LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	query := fmt.Sprintf(`
		SELECT 
			p.id, p.slug, p.title, p.description, p.platform, p.region, 
			p.product_type, p.cover_image_url, p.banner_image_url, p.genres, p.release_date,
			(SELECT MIN(price_cents) FROM offers WHERE product_id = p.id AND is_active = TRUE AND stock_count > 0) AS lowest_price_cents,
			(SELECT MIN(original_price_cents) FROM offers WHERE product_id = p.id AND is_active = TRUE AND stock_count > 0 AND original_price_cents IS NOT NULL) AS original_price_cents,
			(SELECT COUNT(*) FROM offers WHERE product_id = p.id AND is_active = TRUE AND stock_count > 0) AS offer_count
		FROM products p
		WHERE %s
		ORDER BY %s
		%s
	`, strings.Join(whereClauses, " AND "), orderBy, limitOffsetClause)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed searching products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var prod models.Product
		var lowestPrice, origPrice *int
		var offerCount int
		if err := rows.Scan(
			&prod.ID, &prod.Slug, &prod.Title, &prod.Description, &prod.Platform, &prod.Region,
			&prod.ProductType, &prod.CoverImageURL, &prod.BannerImageURL, &prod.Genres, &prod.ReleaseDate,
			&lowestPrice, &origPrice, &offerCount,
		); err != nil {
			return nil, err
		}
		prod.LowestPriceCents = lowestPrice
		prod.OriginalPriceCents = origPrice
		prod.OfferCount = offerCount
		if lowestPrice != nil && origPrice != nil && *origPrice > *lowestPrice {
			pct := ((*origPrice - *lowestPrice) * 100) / *origPrice
			prod.DiscountPercent = &pct
		}
		products = append(products, prod)
	}
	return products, nil
}

// GetProductBySlug fetches a single product with all active seller offers sorted by price ascending
func (r *StoreRepository) GetProductBySlug(ctx context.Context, slug string) (*models.Product, error) {
	var p models.Product
	queryProd := `
		SELECT id, slug, title, description, platform, region, product_type, cover_image_url, banner_image_url, genres, release_date, created_at, updated_at
		FROM products
		WHERE slug = $1
	`
	err := r.db.QueryRow(ctx, queryProd, slug).Scan(
		&p.ID, &p.Slug, &p.Title, &p.Description, &p.Platform, &p.Region,
		&p.ProductType, &p.CoverImageURL, &p.BannerImageURL, &p.Genres, &p.ReleaseDate,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("product not found")
		}
		return nil, err
	}

	queryOffers := `
		SELECT 
			o.id, o.product_id, o.seller_id, o.price_cents, o.original_price_cents, 
			o.currency, o.seller_rating_snapshot, o.stock_count, o.is_active, o.created_at, o.updated_at,
			u.username, u.seller_sales_count
		FROM offers o
		JOIN users u ON o.seller_id = u.id
		WHERE o.product_id = $1 AND o.is_active = TRUE AND o.stock_count > 0
		ORDER BY o.price_cents ASC
	`
	offerRows, err := r.db.Query(ctx, queryOffers, p.ID)
	if err != nil {
		return nil, fmt.Errorf("failed fetching offers: %w", err)
	}
	defer offerRows.Close()

	var offers []models.Offer
	for offerRows.Next() {
		var off models.Offer
		if err := offerRows.Scan(
			&off.ID, &off.ProductID, &off.SellerID, &off.PriceCents, &off.OriginalPriceCents,
			&off.Currency, &off.SellerRatingSnapshot, &off.StockCount, &off.IsActive, &off.CreatedAt, &off.UpdatedAt,
			&off.SellerUsername, &off.SellerSalesCount,
		); err != nil {
			return nil, err
		}
		offers = append(offers, off)
	}
	p.Offers = offers
	if len(offers) > 0 {
		p.LowestPriceCents = &offers[0].PriceCents
		p.OriginalPriceCents = offers[0].OriginalPriceCents
		if offers[0].OriginalPriceCents != nil && *offers[0].OriginalPriceCents > offers[0].PriceCents {
			pct := ((*offers[0].OriginalPriceCents - offers[0].PriceCents) * 100) / *offers[0].OriginalPriceCents
			p.DiscountPercent = &pct
		}
		p.OfferCount = len(offers)
	}

	return &p, nil
}


2. Store HTTP Handlers (/backend/internal/handlers/store.go)
This package implements the HTTP handlers for /api/homepage, /api/products, and /api/products/:slug.
package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/your-username/gamekey-marketplace/internal/models"
	"github.com/your-username/gamekey-marketplace/internal/repository"
)

type StoreHandler struct {
	storeRepo *repository.StoreRepository
}

func NewStoreHandler(storeRepo *repository.StoreRepository) *StoreHandler {
	return &StoreHandler{storeRepo: storeRepo}
}

// GetHomepage handles GET /api/homepage
func (h *StoreHandler) GetHomepage(c *gin.Context) {
	ctx := c.Request.Context()

	blocks, err := h.storeRepo.GetHomepageBlocks(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch homepage blocks", "details": err.Error()})
		return
	}

	// Dynamically hydrate products for blocks referencing product slugs or rules
	for i := range blocks {
		switch blocks[i].BlockType {
		case "best_sellers", "hero_banner":
			var cfg struct {
				ProductSlugs []string `json:"product_slugs"`
				Slides       []struct {
					ProductSlug string `json:"product_slug"`
				} `json:"slides"`
			}
			if err := json.Unmarshal(blocks[i].ConfigJSON, &cfg); err == nil {
				var slugs []string
				if len(cfg.ProductSlugs) > 0 {
					slugs = cfg.ProductSlugs
				} else {
					for _, slide := range cfg.Slides {
						if slide.ProductSlug != "" {
							slugs = append(slugs, slide.ProductSlug)
						}
					}
				}
				if len(slugs) > 0 {
					if prods, err := h.storeRepo.GetProductsBySlugs(ctx, slugs); err == nil {
						blocks[i].Products = prods
					}
				}
			}
		case "flash_deals":
			var cfg struct {
				MinDiscountPercent int `json:"min_discount_percent"`
				Limit              int `json:"limit"`
			}
			if err := json.Unmarshal(blocks[i].ConfigJSON, &cfg); err == nil {
				limit := cfg.Limit
				if limit <= 0 {
					limit = 6
				}
				minDisc := cfg.MinDiscountPercent
				if minDisc <= 0 {
					minDisc = 40
				}
				if prods, err := h.storeRepo.GetFlashDeals(ctx, minDisc, limit); err == nil {
					blocks[i].Products = prods
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"blocks": blocks,
	})
}

// GetProducts handles GET /api/products with search, filters, and sorting
func (h *StoreHandler) GetProducts(c *gin.Context) {
	ctx := c.Request.Context()

	var params repository.ProductFilterParams
	params.Query = c.Query("q")
	params.Platform = c.Query("platform")
	params.Region = c.Query("region")
	params.Sort = c.DefaultQuery("sort", "newest")

	limit := 20
	if lStr := c.Query("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}
	params.Limit = limit

	offset := 0
	if oStr := c.Query("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil && o >= 0 {
			offset = o
		}
	}
	params.Offset = offset

	if minStr := c.Query("min_price"); minStr != "" {
		if minP, err := strconv.Atoi(minStr); err == nil {
			params.MinPrice = &minP
		}
	}

	if maxStr := c.Query("max_price"); maxStr != "" {
		if maxP, err := strconv.Atoi(maxStr); err == nil {
			params.MaxPrice = &maxP
		}
	}

	products, err := h.storeRepo.SearchProducts(ctx, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search products", "details": err.Error()})
		return
	}

	if products == nil {
		products = []models.Product{}
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"count":    len(products),
		"limit":    params.Limit,
		"offset":   params.Offset,
	})
}

// GetProductBySlug handles GET /api/products/:slug
func (h *StoreHandler) GetProductBySlug(c *gin.Context) {
	ctx := c.Request.Context()
	slug := c.Param("slug")

	product, err := h.storeRepo.GetProductBySlug(ctx, slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"product": product,
	})
}



User prompt: Implement the protected purchase flow in /backend/internal/handlers/orders.go (using RequireAuth): - POST /api/checkout: Accepts an array of { offer_id, quantity }. Execute inside a PostgreSQL transaction (BEGIN ... COMMIT): lock the offer rows (FOR UPDATE), verify stock_count >= quantity, decrement stock, calculate total, create the orders record, generate realistic formatted digital keys (e.g., XXXXX-XXXXX-XXXXX) for each unit in order_items, and return the completed order with keys. - GET /api/orders: Returns the signed-in user's order history with product titles, platforms, prices paid, and unlocked digital keys. - Add CORS middleware and wire all routes in /backend/cmd/server/main.go
Response: Here is the complete implementation for the protected checkout service, order history handlers, CORS middleware, and the main server entrypoint (/backend/cmd/api/main.go).
1. Checkout & Orders Service (/backend/internal/services/checkout_service.go)
This service handles atomic transactions with row-level locking (FOR UPDATE), validates stock availability, deducts inventory, generates activation keys, and persists orders.
package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/your-username/gamekey-marketplace/internal/models"
)

type CheckoutService struct {
	db *pgxpool.Pool
}

func NewCheckoutService(db *pgxpool.Pool) *CheckoutService {
	return &CheckoutService{db: db}
}

type CheckoutItemRequest struct {
	OfferID  uuid.UUID `json:"offer_id" binding:"required"`
	Quantity int       `json:"quantity" binding:"required,min=1"`
}

type CheckoutRequest struct {
	Items []CheckoutItemRequest `json:"items" binding:"required,min=1"`
}

// GenerateDigitalKey creates a recognizable game key format like A3F8K-9W2X1-B7M4Q
func GenerateDigitalKey(platform string) string {
	bytes := make([]byte, 6)
	rand.Read(bytes)
	randomStr := strings.ToUpper(hex.EncodeToString(bytes))

	prefix := "KEY"
	switch strings.ToLower(platform) {
	case "steam":
		prefix = "STM"
	case "playstation":
		prefix = "PSN"
	case "xbox":
		prefix = "XBX"
	case "nintendo":
		prefix = "NSW"
	}

	return fmt.Sprintf("%s-%s-%s", prefix, randomStr[0:5], randomStr[5:10])
}

// ProcessCheckout executes an atomic checkout transaction with pessimistic locking
func (s *CheckoutService) ProcessCheckout(ctx context.Context, userID uuid.UUID, req CheckoutRequest) (*models.Order, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var totalCents int
	type resolvedItem struct {
		offerID        uuid.UUID
		productID      uuid.UUID
		unitPrice      int
		platform       string
		keysToGenerate int
	}

	var itemsToFulfill []resolvedItem

	for _, itemReq := range req.Items {
		// 1. Lock the offer row using FOR UPDATE to prevent race conditions / overselling
		var offerID, productID uuid.UUID
		var priceCents, stockCount int
		var platform string
		var isActive bool

		queryOffer := `
			SELECT o.id, o.product_id, o.price_cents, o.stock_count, o.is_active, p.platform
			FROM offers o
			JOIN products p ON o.product_id = p.id
			WHERE o.id = $1
			FOR UPDATE
		`
		err := tx.QueryRow(ctx, queryOffer, itemReq.OfferID).Scan(
			&offerID, &productID, &priceCents, &stockCount, &isActive, &platform,
		)
		if err != nil {
			return nil, fmt.Errorf("offer not found %s: %w", itemReq.OfferID, err)
		}

		if !isActive {
			return nil, fmt.Errorf("offer %s is no longer active", itemReq.OfferID)
		}

		if stockCount < itemReq.Quantity {
			return nil, fmt.Errorf("insufficient stock for offer %s (requested %d, available %d)", itemReq.OfferID, itemReq.Quantity, stockCount)
		}

		// 2. Decrement stock
		_, err = tx.Exec(ctx, `
			UPDATE offers 
			SET stock_count = stock_count - $1, updated_at = NOW()
			WHERE id = $2
		`, itemReq.Quantity, itemReq.OfferID)
		if err != nil {
			return nil, fmt.Errorf("failed to update stock: %w", err)
		}

		totalCents += priceCents * itemReq.Quantity
		itemsToFulfill = append(itemsToFulfill, resolvedItem{
			offerID:        offerID,
			productID:      productID,
			unitPrice:      priceCents,
			platform:       platform,
			keysToGenerate: itemReq.Quantity,
		})
	}

	// 3. Create Order record
	var orderID uuid.UUID
	paymentRef := fmt.Sprintf("PAY-%s", uuid.New().String()[:8])
	queryOrder := `
		INSERT INTO orders (user_id, status, total_cents, currency, payment_reference)
		VALUES ($1, 'FULFILLED', $2, 'EUR', $3)
		RETURNING id
	`
	err = tx.QueryRow(ctx, queryOrder, userID, totalCents, paymentRef).Scan(&orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// 4. Create Order Items & Generate Keys
	var createdOrderItems []models.OrderItem
	for _, item := range itemsToFulfill {
		for i := 0; i < item.keysToGenerate; i++ {
			digitalKey := GenerateDigitalKey(item.platform)
			var orderItemID uuid.UUID

			queryItem := `
				INSERT INTO order_items (order_id, offer_id, product_id, unit_price_cents, digital_key, is_revealed)
				VALUES ($1, $2, $3, $4, $5, TRUE)
				RETURNING id, created_at
			`
			var createdAt time.Time
			err = tx.QueryRow(ctx, queryItem, orderID, item.offerID, item.productID, item.unitPrice, digitalKey).Scan(&orderItemID, &createdAt)
			if err != nil {
				return nil, fmt.Errorf("failed to insert order item: %w", err)
			}

			createdOrderItems = append(createdOrderItems, models.OrderItem{
				ID:             orderItemID,
				OrderID:        orderID,
				OfferID:        item.offerID,
				ProductID:      item.productID,
				UnitPriceCents: item.unitPrice,
				DigitalKey:     digitalKey,
				IsRevealed:     true,
				CreatedAt:      createdAt,
			})
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit checkout transaction: %w", err)
	}

	return &models.Order{
		ID:               orderID,
		UserID:           userID,
		Status:           models.OrderFulfilled,
		TotalCents:       totalCents,
		Currency:         "EUR",
		PaymentReference: &paymentRef,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
		Items:            createdOrderItems,
	}, nil
}

// GetUserOrders fetches all completed orders for a user with product metadata
func (s *CheckoutService) GetUserOrders(ctx context.Context, userID uuid.UUID) ([]models.Order, error) {
	queryOrders := `
		SELECT id, user_id, status, total_cents, currency, payment_reference, created_at, updated_at
		FROM orders
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, queryOrders, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.UserID, &o.Status, &o.TotalCents, &o.Currency, &o.PaymentReference, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}

	// Fetch items for each order
	for i := range orders {
		queryItems := `
			oi.id, oi.order_id, oi.offer_id, oi.product_id, oi.unit_price_cents, oi.digital_key, oi.is_revealed, oi.created_at,
			p.title, p.platform, p.region, p.cover_image_url
			FROM order_items oi
			JOIN products p ON oi.product_id = p.id
			WHERE oi.order_id = $1
		`
		fullQuery := `SELECT ` + queryItems
		itemRows, err := s.db.Query(ctx, fullQuery, orders[i].ID)
		if err != nil {
			return nil, err
		}
		defer itemRows.Close()

		var items []models.OrderItem
		for itemRows.Next() {
			var it models.OrderItem
			if err := itemRows.Scan(
				&it.ID, &it.OrderID, &it.OfferID, &it.ProductID, &it.UnitPriceCents, &it.DigitalKey, &it.IsRevealed, &it.CreatedAt,
				&it.ProductTitle, &it.ProductPlatform, &it.ProductRegion, &it.CoverImageURL,
			); err != nil {
				return nil, err
			}
			items = append(items, it)
		}
		orders[i].Items = items
	}

	return orders, nil
}


2. Orders HTTP Handlers (/backend/internal/handlers/orders.go)
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/your-username/gamekey-marketplace/internal/middleware"
	"github.com/your-username/gamekey-marketplace/internal/services"
)

type OrdersHandler struct {
	checkoutService *services.CheckoutService
}

func NewOrdersHandler(checkoutService *services.CheckoutService) *OrdersHandler {
	return &OrdersHandler{checkoutService: checkoutService}
}

// Checkout handles POST /api/checkout (Protected)
func (h *OrdersHandler) Checkout(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req services.CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid checkout payload", "details": err.Error()})
		return
	}

	order, err := h.checkoutService.ProcessCheckout(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Checkout failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"order": order,
	})
}

// GetOrders handles GET /api/orders (Protected)
func (h *OrdersHandler) GetOrders(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	orders, err := h.checkoutService.GetUserOrders(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders", "details": err.Error()})
		return
	}

	if orders == nil {
		orders = []services.Order{} // Or empty slice
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
	})
}


(Note: ensure slice type matches your model slice declaration)
3. CORS Middleware (/backend/internal/middleware/cors.go)
package middleware

import (
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}


4. Main Server Entrypoint (/backend/cmd/api/main.go)
package main

import (
	"context"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/your-username/gamekey-marketplace/internal/auth"
	"github.com/your-username/gamekey-marketplace/internal/database"
	"github.com/your-username/gamekey-marketplace/internal/db"
	"github.com/your-username/gamekey-marketplace/internal/handlers"
	"github.com/your-username/gamekey-marketplace/internal/middleware"
	"github.com/your-username/gamekey-marketplace/internal/repository"
	"github.com/your-username/gamekey-marketplace/internal/services"
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



User prompt: Now let's build /frontend. Initialize the TypeScript types, Axios API client (with JWT interceptor), AuthContext, and CartContext (persisted in localStorage). Configure Tailwind CSS with Eneba's visual identity: deep violet primary canvas (#4618AC), dark purple surfaces/cards (#1F0A4D and #2A1163), bright yellow primary CTAs (#FAD318 with dark text), vibrant orange/aquamarine discount/cashback badges (#FD5A20 and #63E3C2), and crisp geometric typography (Plus Jakarta Sans or Inter). Build the persistent Navbar featuring the brand logo, a global live-debounced search bar (showing instant typo-tolerant dropdown suggestions and navigating to /store?q=...), a "Browse Store" link, cart item badge drawer/link, and Sign In / My Keys account menu.
Response: Here is the complete foundation for the React frontend, including TypeScript types, Axios API client with JWT interceptor, AuthContext, CartContext (persisted in localStorage), Tailwind CSS configuration matching Eneba's vibrant identity, and the persistent Navbar with live debounced search autocomplete.
1. TypeScript Types (/frontend/src/types/)
/frontend/src/types/catalog.ts
export interface Offer {
  id: string;
  product_id: string;
  seller_id: string;
  price_cents: number;
  original_price_cents?: number;
  currency: string;
  seller_rating: number;
  stock_count: number;
  is_active: boolean;
  seller_username?: string;
  seller_sales_count?: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  platform: string; // 'Steam', 'PlayStation', 'Xbox', 'Nintendo'
  region: string;   // 'GLOBAL', 'EUROPE', 'US'
  product_type: string;
  cover_image_url: string;
  banner_image_url?: string;
  genres: string[];
  release_date?: string;
  lowest_price_cents?: number;
  original_price_cents?: number;
  discount_percent?: number;
  offer_count?: number;
  offers?: Offer[];
}

export interface HomepageBlock {
  id: string;
  block_type: string; // 'hero_banner', 'best_sellers', 'flash_deals', 'platform_spotlight'
  title: string;
  subtitle?: string;
  sort_order: number;
  is_active: boolean;
  config: any;
  products?: Product[];
}


/frontend/src/types/order.ts
import { User } from './auth'; // or define inline

export interface OrderItem {
  id: string;
  order_id: string;
  offer_id: string;
  product_id: string;
  unit_price_cents: number;
  digital_key: string;
  is_revealed: boolean;
  created_at: string;
  product_title?: string;
  product_platform?: string;
  product_region?: string;
  cover_image_url?: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'PENDING' | 'PAID' | 'FULFILLED' | 'FAILED' | 'REFUNDED';
  total_cents: number;
  currency: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}


/frontend/src/types/auth.ts
export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  seller_rating: number;
  seller_sales_count: number;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}


2. Tailwind Configuration & Global Styles
/frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eneba: {
          canvas: "#4618AC",     // Deep violet primary background
          dark: "#1F0A4D",       // Dark purple card / surface
          surface: "#2A1163",    // Lighter purple surface / hover state
          border: "#3F1B85",     // Border line color
          yellow: "#FAD318",     // Bright yellow primary CTA
          yellowHover: "#E5BE0B",
          orange: "#FD5A20",     // Discount / hot badge
          aquamarine: "#63E3C2", // Cashback / secure badge
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;


/frontend/src/index.css
@import "tailwindcss";

@layer base {
  body {
    background-color: #1F0A4D;
    color: #FFFFFF;
    font-family: 'Plus Jakarta Sans', Inter, sans-serif;
  }
}

/* Custom scrollbar for horizontal carousels */
::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #1F0A4D;
}
::-webkit-scrollbar-thumb {
  background: #3F1B85;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #4618AC;
}


3. Axios API Client (/frontend/src/api/client.ts)
Attaches the JWT Bearer token automatically from localStorage.
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eneba_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


API helper methods (/frontend/src/api/catalog.ts, etc.):
import { apiClient } from './client';
import { HomepageBlock, Product } from '../types/catalog';
import { Order } from '../types/order';

export const getHomepage = async () => {
  const { data } = await apiClient.get<{ blocks: HomepageBlock[] }>('/homepage');
  return data.blocks;
};

export const searchProducts = async (params: { q?: string; platform?: string; region?: string; sort?: string }) => {
  const { data } = await apiClient.get<{ products: Product[]; count: number }>('/products', { params });
  return data.products;
};

export const getProductBySlug = async (slug: string) => {
  const { data } = await apiClient.get<{ product: Product }>(`/products/${slug}`);
  return data.product;
};

export const checkoutOrder = async (items: { offer_id: string; quantity: number }[]) => {
  const { data } = await apiClient.post<{ order: Order }>('/checkout', { items });
  return data.order;
};

export const getUserOrders = async () => {
  const { data } = await apiClient.get<{ orders: Order[] }>('/orders');
  return data.orders;
};


4. Context Providers
Auth Context (/frontend/src/context/AuthContext.tsx)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/auth';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('eneba_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const { data } = await apiClient.get<{ user: User }>('/auth/me');
          setUser(data.user);
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('eneba_auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('eneba_auth_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const { data } = await apiClient.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch (err) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};


Cart Context (/frontend/src/context/CartContext.tsx)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Offer, Product } from '../types/catalog';

export interface CartItem {
  id: string; // offer id
  offer: Offer;
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, offer: Offer, quantity?: number) => void;
  removeItem: (offerId: string) => void;
  updateQuantity: (offerId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPriceCents: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('eneba_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('eneba_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, offer: Offer, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.offer.id === offer.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        if (newQty <= offer.stock_count) {
          updated[existingIndex].quantity = newQty;
        }
        return updated;
      }
      return [...prev, { id: offer.id, offer, product, quantity: Math.min(quantity, offer.stock_count) }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (offerId: string) => {
    setItems((prev) => prev.filter((i) => i.offer.id !== offerId));
  };

  const updateQuantity = (offerId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(offerId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.offer.id === offerId) {
          return { ...item, quantity: Math.min(quantity, item.offer.stock_count) };
        }
        return item;
      })
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPriceCents = items.reduce((acc, item) => acc + item.offer.price_cents * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPriceCents,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};


5. Debounce Hook (/frontend/src/hooks/useDebounce.ts)
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}


6. Persistent Navbar (/frontend/src/components/layout/Navbar.tsx)
Features live debounced search autocomplete, cart drawer badge trigger, and authentication dropdown / modal trigger.
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User as UserIcon, LogOut, Package, Gamepad2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useDebounce } from '../../hooks/useDebounce';
import { searchProducts } from '../../api/catalog';
import { Product } from '../../types/catalog';

export const Navbar: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearch.trim().length >= 2) {
        try {
          const results = await searchProducts({ q: debouncedSearch, limit: 5 });
          setSuggestions(results);
          setIsDropdownOpen(true);
        } catch (err) {
          console.error('Failed to fetch search suggestions:', err);
        }
      } else {
        setSuggestions([]);
        setIsDropdownOpen(false);
      }
    };
    fetchSuggestions();
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsDropdownOpen(false);
      navigate(`/store?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#1F0A4D]/95 backdrop-blur-md border-b border-[#3F1B85]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-[#FAD318] flex items-center justify-center text-[#1F0A4D] shadow-lg shadow-[#FAD318]/20 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-wider text-white uppercase">
              Game<span className="text-[#FAD318]">Key</span>
            </span>
            <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase -mt-1">
              Digital Marketplace
            </span>
          </div>
        </Link>

        {/* Browse Store Link */}
        <Link 
          to="/store" 
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] text-sm font-semibold text-white transition-colors border border-[#3F1B85]"
        >
          Browse Store
        </Link>

        {/* Global Live Search Bar */}
        <div className="flex-1 max-w-xl relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 1,000+ games, DLCs, gift cards..."
              className="w-full bg-[#2A1163] border border-[#3F1B85] rounded-xl px-4 py-3 pl-11 pr-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#FAD318] transition-colors shadow-inner"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                className="absolute right-3 top-3 text-xs text-gray-400 hover:text-white px-1.5 py-0.5 rounded bg-[#3F1B85]"
              >
                Clear
              </button>
            )}
          </form>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-[#2A1163] border border-[#3F1B85] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#3F1B85]">
                Matching Games
              </div>
              <div className="divide-y divide-[#3F1B85]">
                {suggestions.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setSearchQuery('');
                      navigate(`/products/${product.slug}`);
                    }}
                    className="p-3 flex items-center gap-3 hover:bg-[#3F1B85]/50 cursor-pointer transition-colors"
                  >
                    <img 
                      src={product.cover_image_url} 
                      alt={product.title} 
                      className="w-12 h-14 object-cover rounded-lg border border-[#3F1B85]" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{product.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F0A4D] text-gray-300 font-medium">
                          {product.platform}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F0A4D] text-[#63E3C2] font-medium">
                          {product.region}
                        </span>
                      </div>
                    </div>
                    {product.lowest_price_cents && (
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-[#FAD318]">
                          €{(product.lowest_price_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div 
                onClick={handleSearchSubmit}
                className="p-3 bg-[#1F0A4D] text-center text-xs font-bold text-[#FAD318] hover:underline cursor-pointer"
              >
                View all results for "{searchQuery}" →
              </div>
            </div>
          )}
        </div>

        {/* Right Actions: Cart & User Menu */}
        <div className="flex items-center gap-3">
          
          {/* Cart Drawer Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-3 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] border border-[#3F1B85] text-white transition-colors flex items-center justify-center"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FD5A20] text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {totalItems}
              </span>
            )}
          </button>

          {/* User Account Menu / Auth Button */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] border border-[#3F1B85] text-white transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#4618AC] flex items-center justify-center text-[#FAD318] font-bold text-xs">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold max-w-[100px] truncate hidden sm:inline">
                  {user.username}
                </span>
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#2A1163] border border-[#3F1B85] rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#3F1B85]">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-bold text-white truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#FAD318]/10 text-[#FAD318] font-bold uppercase">
                      {user.role}
                    </span>
                  </div>

                  <Link
                    to="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-[#3F1B85] transition-colors"
                  >
                    <Package className="w-4 h-4 text-[#63E3C2]" />
                    My Keys & Orders
                  </Link>

                  {user.role === 'seller' && (
                    <div className="px-4 py-2 text-xs text-gray-400 border-t border-[#3F1B85] flex items-center justify-between">
                      <span>Seller Rating:</span>
                      <span className="font-bold text-[#FAD318]">★ {user.seller_rating.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-[#3F1B85] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-[#3F1B85] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-extrabold text-sm shadow-lg shadow-[#FAD318]/20 transition-all hover:scale-105"
            >
              <UserIcon className="w-4 h-4 stroke-[2.5]" />
              Sign In
            </button>
          )}

        </div>

      </div>
    </header>
  );
};



User prompt: Build the Homepage (/) and Store (/store) pages: - Homepage: Fetch GET /api/homepage and dynamically render components based on block.type (HeroBanner, ProductCarousel, FlashDeals, PlatformGrid) with zero hardcoded products or section titles. - Store: Build a sidebar filter panel (Platform checkboxes, Region checkboxes, Min/Max price inputs) and top sort bar (Best Match, Price: Low to High, Price: High to Low), synced with URL query parameters and GET /api/products. Create reusable Eneba-style ProductCard components showing cover image, title, platform badge, region label (e.g., GLOBAL / EUROPE), strikethrough original price, bold final price, and discount tag.
Response: Here is the complete implementation for the reusable ProductCard, the backend-driven HomePage (with dynamic block renderers), and the URL-synced StorePage.
1. Reusable Product Card (/frontend/src/components/catalog/ProductCard.tsx)
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Layers } from 'lucide-react';
import { Product } from '../../types/catalog';

interface ProductCardProps {
  product: Product;
}

const getPlatformBadgeStyle = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'steam':
      return 'bg-[#1b2838] text-[#66c0f4] border-[#66c0f4]/30';
    case 'playstation':
      return 'bg-[#003791] text-white border-[#0070d1]/40';
    case 'xbox':
      return 'bg-[#107c10] text-white border-[#52b043]/40';
    case 'nintendo':
      return 'bg-[#e60012] text-white border-[#ff4d5a]/40';
    default:
      return 'bg-[#1F0A4D] text-gray-200 border-[#3F1B85]';
  }
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const hasDiscount =
    product.discount_percent !== undefined &&
    product.discount_percent > 0 &&
    product.original_price_cents !== undefined &&
    product.lowest_price_cents !== undefined;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative flex flex-col bg-[#2A1163] hover:bg-[#321575] border border-[#3F1B85] hover:border-[#FAD318]/60 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-2xl hover:shadow-[#4618AC]/40"
    >
      {/* Cover Image Wrapper */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1F0A4D]">
        <img
          src={product.cover_image_url}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Platform Pill Overlay */}
        <span
          className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider border backdrop-blur-md shadow-sm ${getPlatformBadgeStyle(
            product.platform
          )}`}
        >
          {product.platform}
        </span>

        {/* Discount Tag Overlay */}
        {hasDiscount && (
          <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-[#FD5A20] text-white text-xs font-black tracking-tight shadow-md">
            -{product.discount_percent}%
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-[#FAD318] transition-colors min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Region & Offer Count Row */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#63E3C2]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            {product.region}
          </span>

          {product.offer_count !== undefined && product.offer_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              <Layers className="w-3 h-3" />
              {product.offer_count} {product.offer_count === 1 ? 'offer' : 'offers'}
            </span>
          )}
        </div>

        {/* Pricing Footer */}
        <div className="mt-auto pt-3 border-t border-[#3F1B85]/70 flex items-end justify-between">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              From
            </span>
            {product.lowest_price_cents !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-white tracking-tight">
                  €{(product.lowest_price_cents / 100).toFixed(2)}
                </span>
                {hasDiscount && product.original_price_cents && (
                  <span className="text-xs text-gray-400 line-through font-medium">
                    €{(product.original_price_cents / 100).toFixed(2)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-bold text-gray-400">Out of stock</span>
            )}
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-[#1F0A4D] group-hover:bg-[#FAD318] text-gray-300 group-hover:text-[#1F0A4D] text-xs font-extrabold transition-colors">
            View
          </span>
        </div>
      </div>
    </Link>
  );
};


2. Dynamic Homepage Block Components (/frontend/src/components/home/)
/frontend/src/components/home/HeroBannerBlock.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { HomepageBlock } from '../../types/catalog';

interface HeroSlideConfig {
  product_slug: string;
  badge?: string;
  headline?: string;
  cta_text?: string;
  accent_color?: string;
}

export const HeroBannerBlock: React.FC<{ block: HomepageBlock }> = ({ block }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides: HeroSlideConfig[] = block.config?.slides || [];
  const products = block.products || [];

  if (slides.length === 0 || products.length === 0) return null;

  const currentSlide = slides[activeIndex % slides.length];
  const matchedProduct =
    products.find((p) => p.slug === currentSlide.product_slug) || products[activeIndex % products.length];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative rounded-2xl overflow-hidden border border-[#3F1B85] bg-[#2A1163] shadow-2xl">
      {/* Background Banner Image + Gradient Overlay */}
      <div className="relative h-[380px] sm:h-[440px] w-full">
        <img
          src={matchedProduct.banner_image_url || matchedProduct.cover_image_url}
          alt={matchedProduct.title}
          className="w-full h-full object-cover object-center transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1F0A4D] via-[#1F0A4D]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1F0A4D] via-transparent to-transparent" />

        {/* Foreground Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 max-w-2xl">
          {currentSlide.badge && (
            <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-[#FD5A20] text-white text-xs font-black uppercase tracking-wider mb-4 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              {currentSlide.badge}
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            {currentSlide.headline || matchedProduct.title}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-gray-300 line-clamp-2 max-w-xl">
            {matchedProduct.description}
          </p>

          {/* Price & CTA */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to={`/products/${matchedProduct.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-sm sm:text-base shadow-lg shadow-[#FAD318]/25 transition-all hover:scale-105"
            >
              {currentSlide.cta_text || 'Buy Now'}
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>

            {matchedProduct.lowest_price_cents !== undefined && (
              <div className="px-4 py-2 rounded-xl bg-[#1F0A4D]/90 border border-[#3F1B85] backdrop-blur-md">
                <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  Starting at
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#FAD318]">
                    €{(matchedProduct.lowest_price_cents / 100).toFixed(2)}
                  </span>
                  {matchedProduct.original_price_cents && (
                    <span className="text-xs text-gray-400 line-through">
                      €{(matchedProduct.original_price_cents / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Carousel Navigation Controls */}
        {slides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1F0A4D]/80 hover:bg-[#FAD318] text-white hover:text-[#1F0A4D] border border-[#3F1B85] flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1F0A4D]/80 hover:bg-[#FAD318] text-white hover:text-[#1F0A4D] border border-[#3F1B85] flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 right-6 flex items-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === activeIndex ? 'w-8 bg-[#FAD318]' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};


/frontend/src/components/home/ProductGridOrRowBlock.tsx
Handles both best_sellers (grid layout) and flash_deals (horizontal carousel/row with flash countdown pill) driven directly by block.title, block.subtitle, and block.config.
import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ArrowRight, Clock } from 'lucide-react';
import { HomepageBlock } from '../../types/catalog';
import { ProductCard } from '../catalog/ProductCard';

export const ProductCarouselBlock: React.FC<{ block: HomepageBlock; isFlashDeal?: boolean }> = ({
  block,
  isFlashDeal = false,
}) => {
  const products = block.products || [];
  if (products.length === 0) return null;

  const isHorizontalRow = isFlashDeal || block.config?.layout === 'horizontal_row';
  const endsInHours = block.config?.ends_in_hours;

  return (
    <section className="space-y-5">
      {/* Header driven completely by backend block metadata */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {isFlashDeal && (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#FD5A20] text-white shadow-md">
                <Flame className="w-5 h-5" />
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {block.title}
            </h2>
            {isFlashDeal && endsInHours && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FD5A20]/20 border border-[#FD5A20] text-[#FD5A20] text-xs font-extrabold">
                <Clock className="w-3.5 h-3.5" />
                Ends in {endsInHours}h
              </span>
            )}
          </div>
          {block.subtitle && <p className="mt-1 text-sm text-gray-300">{block.subtitle}</p>}
        </div>

        <Link
          to="/store"
          className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#FAD318] hover:underline"
        >
          See all deals
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Layout Grid vs Horizontal Row */}
      {isHorizontalRow ? (
        <div className="grid grid-flow-col auto-cols-[240px] sm:auto-cols-[265px] gap-5 overflow-x-auto pb-4 snap-x">
          {products.map((product) => (
            <div key={product.id} className="snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};


/frontend/src/components/home/PlatformGridBlock.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ArrowUpRight } from 'lucide-react';
import { HomepageBlock } from '../../types/catalog';

interface PlatformItemConfig {
  name: string;
  slug: string;
  tagline?: string;
  accent_hex?: string;
  badge_color?: string;
}

export const PlatformGridBlock: React.FC<{ block: HomepageBlock }> = ({ block }) => {
  const platforms: PlatformItemConfig[] = block.config?.platforms || [];
  if (platforms.length === 0) return null;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{block.title}</h2>
        {block.subtitle && <p className="mt-1 text-sm text-gray-300">{block.subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platforms.map((platform) => (
          <Link
            key={platform.slug}
            to={`/store?platform=${encodeURIComponent(platform.slug)}`}
            style={{
              background: platform.accent_hex
                ? `linear-gradient(135deg, ${platform.accent_hex} 0%, #2A1163 100%)`
                : undefined,
            }}
            className="group relative p-6 rounded-2xl bg-[#2A1163] border border-[#3F1B85] hover:border-[#FAD318] transition-all duration-200 hover:-translate-y-1 shadow-lg overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#1F0A4D]/80 border border-white/10"
                style={{ color: platform.badge_color || '#FAD318' }}
              >
                <Gamepad2 className="w-6 h-6" />
              </div>

              <span className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#FAD318] text-white group-hover:text-[#1F0A4D] flex items-center justify-center transition-colors">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </span>
            </div>

            <div className="mt-5">
              <h3 className="text-xl font-black text-white group-hover:text-[#FAD318] transition-colors">
                {platform.name}
              </h3>
              {platform.tagline && (
                <p className="mt-1 text-xs font-medium text-gray-300">{platform.tagline}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};


/frontend/src/components/home/BlockRenderer.tsx
import React from 'react';
import { HomepageBlock } from '../../types/catalog';
import { HeroBannerBlock } from './HeroBannerBlock';
import { ProductCarouselBlock } from './ProductGridOrRowBlock';
import { PlatformGridBlock } from './PlatformGridBlock';

export const BlockRenderer: React.FC<{ block: HomepageBlock }> = ({ block }) => {
  switch (block.block_type) {
    case 'hero_banner':
      return <HeroBannerBlock block={block} />;
    case 'best_sellers':
      return <ProductCarouselBlock block={block} isFlashDeal={false} />;
    case 'flash_deals':
      return <ProductCarouselBlock block={block} isFlashDeal={true} />;
    case 'platform_spotlight':
      return <PlatformGridBlock block={block} />;
    default:
      // Fallback for any future backend-configured product block
      if (block.products && block.products.length > 0) {
        return <ProductCarouselBlock block={block} />;
      }
      return null;
  }
};


3. Homepage (/frontend/src/pages/HomePage.tsx)
Fetches GET /api/homepage and renders every active block in sort_order with zero hardcoded titles or products.
import React, { useEffect, useState } from 'react';
import { getHomepage } from '../api/catalog';
import { HomepageBlock } from '../types/catalog';
import { BlockRenderer } from '../components/home/BlockRenderer';

export const HomePage: React.FC = () => {
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadHomepage = async () => {
      try {
        setIsLoading(true);
        const data = await getHomepage();
        if (isMounted) {
          setBlocks(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Unable to load storefront.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadHomepage();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="h-[400px] rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-72 rounded-xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block p-6 rounded-2xl bg-[#2A1163] border border-[#FD5A20]">
          <p className="text-lg font-bold text-white">Failed to load storefront</p>
          <p className="text-sm text-gray-300 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#4618AC]/35 via-[#1F0A4D] to-[#1F0A4D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-14">
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </main>
  );
};


4. Store Page (/frontend/src/pages/StorePage.tsx)
Syncs Platform, Region, Min/Max Price, Search Query (q), and Sort Order directly with React Router's useSearchParams and GET /api/products.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, RotateCcw, SearchX, ArrowUpDown } from 'lucide-react';
import { apiClient } from '../api/client';
import { Product } from '../types/catalog';
import { ProductCard } from '../components/catalog/ProductCard';

const PLATFORMS = ['Steam', 'PlayStation', 'Xbox', 'Nintendo'];
const REGIONS = ['GLOBAL', 'EUROPE', 'US'];
const SORT_OPTIONS = [
  { value: 'popularity', label: 'Best Match' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest Releases' },
];

export const StorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL query parameters
  const q = searchParams.get('q') || '';
  const selectedPlatform = searchParams.get('platform') || '';
  const selectedRegion = searchParams.get('region') || '';
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';
  const sort = searchParams.get('sort') || 'popularity';

  // Local controlled inputs for EUR price fields before applying
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMinPriceInput(minPriceParam);
    setMaxPriceInput(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string | number> = {
          sort,
          limit: 40,
        };
        if (q) params.q = q;
        if (selectedPlatform) params.platform = selectedPlatform;
        if (selectedRegion) params.region = selectedRegion;
        // Convert EUR input to cents for backend API
        if (minPriceParam && !isNaN(Number(minPriceParam))) {
          params.min_price = Math.round(Number(minPriceParam) * 100);
        }
        if (maxPriceParam && !isNaN(Number(maxPriceParam))) {
          params.max_price = Math.round(Number(maxPriceParam) * 100);
        }

        const { data } = await apiClient.get<{ products: Product[] }>('/products', { params });
        if (isMounted) {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error('Error loading catalog:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [q, selectedPlatform, selectedRegion, minPriceParam, maxPriceParam, sort]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const toggleCheckboxParam = (key: string, value: string, current: string) => {
    updateParam(key, current === value ? '' : value);
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (minPriceInput.trim()) next.set('min_price', minPriceInput.trim());
    else next.delete('min_price');

    if (maxPriceInput.trim()) next.set('max_price', maxPriceInput.trim());
    else next.delete('max_price');

    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    q || selectedPlatform || selectedRegion || minPriceParam || maxPriceParam
  );

  return (
    <div className="min-h-screen bg-[#1F0A4D] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Active Search Banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {q ? `Search results for "${q}"` : 'Browse Digital Game Keys'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {isLoading ? 'Searching catalog...' : `${products.length} games found`}
            </p>
          </div>

          {/* Sort Bar */}
          <div className="flex items-center gap-3 bg-[#2A1163] px-4 py-2.5 rounded-xl border border-[#3F1B85]">
            <ArrowUpDown className="w-4 h-4 text-[#FAD318]" />
            <label htmlFor="sort-select" className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="bg-transparent text-sm font-extrabold text-white focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1F0A4D] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filter Panel */}
          <aside className="w-full lg:w-64 shrink-0 space-y-6">
            <div className="bg-[#2A1163] border border-[#3F1B85] rounded-2xl p-5 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#3F1B85] pb-3">
                <div className="flex items-center gap-2 font-black text-white text-sm uppercase tracking-wider">
                  <SlidersHorizontal className="w-4 h-4 text-[#FAD318]" />
                  Filters
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#FD5A20] hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Platform Checkboxes */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                  Platform
                </h3>
                <div className="space-y-2">
                  {PLATFORMS.map((platform) => {
                    const checked = selectedPlatform === platform;
                    return (
                      <label
                        key={platform}
                        className="flex items-center gap-3 cursor-pointer group select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleCheckboxParam('platform', platform, selectedPlatform)
                          }
                          className="w-4 h-4 rounded border-[#3F1B85] bg-[#1F0A4D] text-[#FAD318] focus:ring-[#FAD318]"
                        />
                        <span
                          className={`text-sm font-semibold transition-colors ${
                            checked ? 'text-[#FAD318]' : 'text-gray-300 group-hover:text-white'
                          }`}
                        >
                          {platform}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Region Checkboxes */}
              <div className="space-y-3 pt-4 border-t border-[#3F1B85]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                  Activation Region
                </h3>
                <div className="space-y-2">
                  {REGIONS.map((region) => {
                    const checked = selectedRegion === region;
                    return (
                      <label
                        key={region}
                        className="flex items-center gap-3 cursor-pointer group select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckboxParam('region', region, selectedRegion)}
                          className="w-4 h-4 rounded border-[#3F1B85] bg-[#1F0A4D] text-[#FAD318] focus:ring-[#FAD318]"
                        />
                        <span
                          className={`text-sm font-semibold transition-colors ${
                            checked ? 'text-[#63E3C2]' : 'text-gray-300 group-hover:text-white'
                          }`}
                        >
                          {region}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Inputs */}
              <form onSubmit={handlePriceApply} className="space-y-3 pt-4 border-t border-[#3F1B85]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                  Price Range (EUR)
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Min €"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max €"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-[#4618AC] hover:bg-[#5722CC] text-white text-xs font-extrabold uppercase tracking-wider transition-colors"
                >
                  Apply Price
                </button>
              </form>
            </div>
          </aside>

          {/* Main Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="h-72 rounded-xl bg-[#2A1163] animate-pulse border border-[#3F1B85]"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-[#2A1163] border border-[#3F1B85] rounded-2xl p-12 text-center space-y-4">
                <SearchX className="w-12 h-12 text-[#FAD318] mx-auto" />
                <h2 className="text-xl font-black text-white">No matching keys found</h2>
                <p className="text-sm text-gray-300 max-w-md mx-auto">
                  Try clearing some filters or adjusting your price range to see more digital keys.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-extrabold text-sm transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



User prompt: Does it the StorePage.tsx end here; {/* Main Product Grid */} <div className="flex-1"> {isLoading ? ( <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"> {[...Array(6)].map((_, idx) => ( <div key={idx} className="h-72 rounded-xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" /> ))} </div> ) : products.length === 0 ? ( <div className="bg-[#2A1163] border border-[#3F1B85] rounded-2xl p-12 text-center space-y-4"> <SearchX className="w-12 h-12 text-[#FAD318] mx-auto" /> <h2 className="text-xl font-black text-white">No matching keys found</h2> <p className="text-sm text-gray-300 max-w-md mx-auto"> Try clearing some filters or adjusting your price range to see more digital keys. </p> <button onClick={handleResetFilters} className="px-5 py-2.5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-extrabold text-sm transition-colors" > Clear All Filters </button> </div> ) : ( <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"> {products.map((product) => ( <ProductCard key={product.id} product={product} /> ))} </div> )} </div> </div> </div> </div> ); };
Response: Yes, StorePage.tsx is complete and ends right there.
Every opening JSX tag and curly brace in the file is properly closed:
<div className="flex-1"> closes Main Product Grid
</div> closes <div className="flex flex-col lg:flex-row gap-8">
</div> closes <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
</div> closes <div className="min-h-screen bg-[#1F0A4D] py-8">
); closes the return (...) statement
}; closes export const StorePage: React.FC = () => {
Nothing was cut off. Whenever you're ready, we can move on to building ProductDetailPage.tsx (multi-seller offer comparison + Add to Cart), the CartDrawer / Checkout flow, and the OrdersPage (key reveal & copy).

User prompt: Build the ProductDetail page (/product/:slug) fetching from GET /api/products/:slug: - Top section: Game cover art, title, platform/region activation notice (e.g., "Digital key • Valid in your region"), description, and a highlighted Featured Offer card (cheapest seller) with a prominent yellow Add to Cart and Buy Now button. - Bottom section: A comparison list of Other Sellers offering this game, displaying seller name, rating percentage, stock status, price, and an individual Add to Cart button for each offer.
Response: Here is the complete implementation for ProductDetailPage.tsx (/frontend/src/pages/ProductDetailPage.tsx), along with a clean reusable OfferRow component (/frontend/src/components/catalog/OfferRow.tsx) for the competing sellers list.
1. Seller Offer Comparison Row (/frontend/src/components/catalog/OfferRow.tsx)
import React from 'react';
import { ShieldCheck, ShoppingCart, Award, CheckCircle2 } from 'lucide-react';
import { Offer } from '../../types/catalog';

interface OfferRowProps {
  offer: Offer;
  isCheapest?: boolean;
  onAddToCart: (offer: Offer) => void;
}

export const OfferRow: React.FC<OfferRowProps> = ({ offer, isCheapest = false, onAddToCart }) => {
  const ratingPercent = Math.round((offer.seller_rating / 5) * 100);
  const hasDiscount =
    offer.original_price_cents !== undefined && offer.original_price_cents > offer.price_cents;
  const discountPercent = hasDiscount
    ? Math.round(((offer.original_price_cents! - offer.price_cents) / offer.original_price_cents!) * 100)
    : 0;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border transition-all ${
        isCheapest
          ? 'bg-[#2A1163] border-[#FAD318]/60 shadow-lg shadow-[#4618AC]/30'
          : 'bg-[#2A1163]/80 hover:bg-[#2A1163] border-[#3F1B85]'
      }`}
    >
      {/* Left: Seller Identity & Reputation */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#1F0A4D] border border-[#3F1B85] flex items-center justify-center text-[#FAD318] font-black text-base shrink-0">
          {(offer.seller_username || 'S').charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-white text-base">
              {offer.seller_username || 'Verified Seller'}
            </span>
            {isCheapest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAD318]/15 border border-[#FAD318]/40 text-[#FAD318] text-[10px] font-black uppercase tracking-wider">
                <Award className="w-3 h-3" />
                Best Price
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-[#63E3C2]">
              <ShieldCheck className="w-3.5 h-3.5" />
              {ratingPercent}% positive rating
            </span>
            {offer.seller_sales_count !== undefined && (
              <span className="text-gray-400">
                ({offer.seller_sales_count.toLocaleString()} sales)
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {offer.stock_count > 10 ? 'In Stock • Instant Delivery' : `Only ${offer.stock_count} left`}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Price & Add to Cart Action */}
      <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#3F1B85]">
        <div className="text-left sm:text-right">
          {hasDiscount && (
            <div className="flex items-center sm:justify-end gap-1.5 mb-0.5">
              <span className="text-xs text-gray-400 line-through">
                €{(offer.original_price_cents! / 100).toFixed(2)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#FD5A20] text-white text-[10px] font-black">
                -{discountPercent}%
              </span>
            </div>
          )}
          <div className="text-2xl font-black text-white tracking-tight">
            €{(offer.price_cents / 100).toFixed(2)}
          </div>
        </div>

        <button
          onClick={() => onAddToCart(offer)}
          disabled={offer.stock_count <= 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4618AC] hover:bg-[#FAD318] text-white hover:text-[#1F0A4D] disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-sm border border-[#6129DB] hover:border-[#FAD318] transition-all cursor-pointer shrink-0"
        >
          <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};


2. Product Detail Page (/frontend/src/pages/ProductDetailPage.tsx)
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Globe,
  KeyRound,
  Zap,
  ShoppingCart,
  ArrowLeft,
  Tag,
  Calendar,
  Award,
  AlertCircle,
} from 'lucide-react';
import { getProductBySlug } from '../api/catalog';
import { Product, Offer } from '../types/catalog';
import { useCart } from '../context/CartContext';
import { OfferRow } from '../components/catalog/OfferRow';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, setIsCartOpen } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProduct = async () => {
      if (!slug) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await getProductBySlug(slug);
        if (isMounted) {
          setProduct(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.error || 'Product not found.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleAddToCart = (offer: Offer) => {
    if (!product) return;
    addItem(product, offer, 1);
  };

  const handleBuyNow = (offer: Offer) => {
    if (!product) return;
    addItem(product, offer, 1);
    setIsCartOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1F0A4D] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="h-8 w-40 rounded-lg bg-[#2A1163] animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 h-72 rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
            <div className="lg:col-span-4 h-72 rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
            <div className="lg:col-span-4 h-72 rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#1F0A4D] py-20 px-4 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-[#2A1163] border border-[#FD5A20] space-y-4">
          <AlertCircle className="w-12 h-12 text-[#FD5A20] mx-auto" />
          <h1 className="text-2xl font-black text-white">Game Not Found</h1>
          <p className="text-sm text-gray-300">{error || 'This product may have been removed.'}</p>
          <Link
            to="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAD318] text-[#1F0A4D] font-extrabold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  // Offers are already sorted by price ascending from GET /api/products/:slug
  const offers = product.offers || [];
  const featuredOffer = offers.length > 0 ? offers[0] : null;
  const featuredRatingPercent = featuredOffer
    ? Math.round((featuredOffer.seller_rating / 5) * 100)
    : 100;
  const featuredDiscountPercent =
    featuredOffer &&
    featuredOffer.original_price_cents &&
    featuredOffer.original_price_cents > featuredOffer.price_cents
      ? Math.round(
          ((featuredOffer.original_price_cents - featuredOffer.price_cents) /
            featuredOffer.original_price_cents) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-[#1F0A4D] pb-20">
      {/* Blurred Hero Backdrop */}
      <div className="relative overflow-hidden border-b border-[#3F1B85] bg-gradient-to-b from-[#4618AC]/40 to-[#1F0A4D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
          {/* Breadcrumb */}
          <Link
            to="/store"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-[#FAD318] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>

          {/* Top Section: 3-Column Eneba Layout (Cover | Metadata & Activation | Featured Offer) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Column 1: Cover Art & Genres (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl overflow-hidden border-2 border-[#3F1B85] bg-[#2A1163] shadow-2xl">
                <img
                  src={product.cover_image_url}
                  alt={product.title}
                  className="w-full aspect-[16/9] object-cover"
                />
              </div>

              {/* Genre Tags */}
              {product.genres && product.genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-gray-400 mr-1" />
                  {product.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2.5 py-1 rounded-lg bg-[#2A1163] border border-[#3F1B85] text-xs font-semibold text-gray-200"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Title, Activation Notice & Description (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#4618AC] text-white text-xs font-black uppercase tracking-wider">
                    {product.platform}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#63E3C2]/15 border border-[#63E3C2]/40 text-[#63E3C2] text-xs font-black uppercase tracking-wider">
                    {product.region}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {product.title}
                </h1>
              </div>

              {/* Activation Notice Box */}
              <div className="p-4 rounded-xl bg-[#2A1163] border border-[#3F1B85] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#63E3C2]/15 text-[#63E3C2] flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white">
                      Digital key • Valid in {product.region}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Can be activated on <span className="font-bold text-white">{product.platform}</span> in your selected region.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-[#3F1B85]">
                  <div className="w-8 h-8 rounded-lg bg-[#FAD318]/15 text-[#FAD318] flex items-center justify-center shrink-0 mt-0.5">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white">Instant Digital Delivery</p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Receive your activation code immediately after checkout.
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                  About This Game
                </h2>
                <p className="text-sm text-gray-200 leading-relaxed">{product.description}</p>
                {product.release_date && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Released: {new Date(product.release_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Column 3: Highlighted Featured Offer Card (4 cols) */}
            <div className="lg:col-span-4">
              {featuredOffer ? (
                <div className="p-6 rounded-2xl bg-[#2A1163] border-2 border-[#FAD318] shadow-2xl shadow-[#4618AC]/40 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAD318] text-[#1F0A4D] text-xs font-black uppercase tracking-wider">
                      <Award className="w-3.5 h-3.5 stroke-[2.5]" />
                      Featured Offer
                    </span>
                    {featuredDiscountPercent > 0 && (
                      <span className="px-2.5 py-1 rounded-md bg-[#FD5A20] text-white text-xs font-black">
                        SAVE {featuredDiscountPercent}%
                      </span>
                    )}
                  </div>

                  {/* Seller Info */}
                  <div className="p-3 rounded-xl bg-[#1F0A4D] border border-[#3F1B85] flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                        Sold by
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        {featuredOffer.seller_username || 'Verified Seller'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#63E3C2]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {featuredRatingPercent}% rating
                      </span>
                      <span className="block text-[11px] text-gray-400">
                        {featuredOffer.stock_count} keys available
                      </span>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">Final Price</span>
                    <div className="flex items-baseline gap-3 mt-0.5">
                      <span className="text-4xl font-black text-white tracking-tight">
                        €{(featuredOffer.price_cents / 100).toFixed(2)}
                      </span>
                      {featuredOffer.original_price_cents &&
                        featuredOffer.original_price_cents > featuredOffer.price_cents && (
                          <span className="text-base text-gray-400 line-through font-semibold">
                            €{(featuredOffer.original_price_cents / 100).toFixed(2)}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Primary Yellow CTAs */}
                  <div className="space-y-3 pt-1">
                    <button
                      onClick={() => handleBuyNow(featuredOffer)}
                      className="w-full py-3.5 px-5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-base shadow-lg shadow-[#FAD318]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Zap className="w-5 h-5 fill-current" />
                      Buy Now
                    </button>

                    <button
                      onClick={() => handleAddToCart(featuredOffer)}
                      className="w-full py-3 px-5 rounded-xl bg-[#4618AC] hover:bg-[#5722CC] text-white font-extrabold text-sm border border-[#6129DB] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#2A1163] border border-[#3F1B85] text-center space-y-2">
                  <p className="text-lg font-black text-white">Out of Stock</p>
                  <p className="text-xs text-gray-400">
                    All seller keys for this title are currently sold out.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: All Competing Seller Offers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {offers.length > 1
                ? `Compare All ${offers.length} Seller Offers`
                : 'Available Marketplace Offers'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Sorted by lowest price first • All keys are verified for instant digital activation
            </p>
          </div>
        </div>

        {offers.length > 0 ? (
          <div className="space-y-3">
            {offers.map((offer, index) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                isCheapest={index === 0}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#2A1163] border border-[#3F1B85] text-center text-sm text-gray-400">
            No active offers available right now.
          </div>
        )}
      </section>
    </div>
  );
};



User prompt: Build the authentication and checkout flow: - /login and /register pages styled in Eneba's dark purple theme, supporting a ?redirect= query param so users attempting to check out return straight to /checkout after signing in. - /cart page/drawer allowing quantity updates, item removal, and subtotal calculation. - Protected /checkout page: Displays order summary and a realistic Simulated Payment selector (Card / PayPal / Eneba Wallet test mode — no real money) with a "Pay Now" button calling POST /api/checkout. - Upon payment success, transition smoothly to an Order & Digital Key Reveal view with one-click copy-to-clipboard buttons for each purchased key, plus a /orders ("My Library & Keys") history page.
Response: Here is the complete authentication, cart drawer, simulated checkout, key reveal, and order history flow, followed by the wired App.tsx router.
1. Login & Register Pages (/frontend/src/pages/)
/frontend/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Gamepad2, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AuthResponse } from '../types/auth';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      login(data.token, data.user);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-[#4618AC]/30 to-[#1F0A4D] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#2A1163] border border-[#3F1B85] rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#FAD318] text-[#1F0A4D] flex items-center justify-center mx-auto shadow-lg shadow-[#FAD318]/20">
            <Gamepad2 className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-300">
            Sign in to access your digital game keys and instant checkout
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[#FD5A20]/15 border border-[#FD5A20] flex items-center gap-2.5 text-xs font-bold text-[#FD5A20]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gamer@example.com"
                className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] disabled:opacity-50 text-[#1F0A4D] font-black text-sm shadow-lg shadow-[#FAD318]/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#3F1B85] text-center text-sm text-gray-300">
          Don't have an account?{' '}
          <Link
            to={`/register${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-extrabold text-[#FAD318] hover:underline"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};


/frontend/src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Gamepad2, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AuthResponse } from '../types/auth';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/register', {
        username,
        email,
        password,
      });
      login(data.token, data.user);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed. Try another email or username.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-[#4618AC]/30 to-[#1F0A4D] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#2A1163] border border-[#3F1B85] rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#FAD318] text-[#1F0A4D] flex items-center justify-center mx-auto shadow-lg shadow-[#FAD318]/20">
            <Gamepad2 className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create Your Account</h1>
          <p className="text-sm text-gray-300">
            Join thousands of gamers unlocking instant deals every day
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[#FD5A20]/15 border border-[#FD5A20] flex items-center gap-2.5 text-xs font-bold text-[#FD5A20]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300">
              Gamer Tag / Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ShadowHunter99"
                className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gamer@example.com"
                className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1F0A4D] border border-[#3F1B85] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FAD318]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] disabled:opacity-50 text-[#1F0A4D] font-black text-sm shadow-lg shadow-[#FAD318]/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#3F1B85] text-center text-sm text-gray-300">
          Already have an account?{' '}
          <Link
            to={`/login${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-extrabold text-[#FAD318] hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};


2. Slide-Over Cart Drawer (/frontend/src/components/cart/CartDrawer.tsx)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    totalItems,
    totalPriceCents,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      navigate('/login?redirect=/checkout');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <aside className="relative w-full max-w-md bg-[#1F0A4D] border-l border-[#3F1B85] h-full flex flex-col shadow-2xl z-10">
        {/* Header */}
        <div className="px-6 py-5 bg-[#2A1163] border-b border-[#3F1B85] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-[#FAD318]" />
            <h2 className="text-lg font-black text-white">
              Your Cart <span className="text-sm text-gray-400 font-bold">({totalItems})</span>
            </h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-lg bg-[#1F0A4D] hover:bg-[#3F1B85] text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
              <div className="w-16 h-16 rounded-2xl bg-[#2A1163] border border-[#3F1B85] flex items-center justify-center text-gray-400">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <p className="text-lg font-black text-white">Your cart is empty</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Explore thousands of Steam, PlayStation, Xbox, and Nintendo keys at unbeatable prices.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.offer.id}
                className="p-4 rounded-xl bg-[#2A1163] border border-[#3F1B85] flex gap-3.5"
              >
                <img
                  src={item.product.cover_image_url}
                  alt={item.product.title}
                  className="w-20 h-24 object-cover rounded-lg border border-[#3F1B85] shrink-0"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white line-clamp-1">
                        {item.product.title}
                      </h3>
                      <button
                        onClick={() => removeItem(item.offer.id)}
                        className="text-gray-400 hover:text-[#FD5A20] transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#63E3C2] font-bold mt-0.5">
                      {item.product.platform} • {item.product.region}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Seller: {item.offer.seller_username || 'Verified Seller'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#3F1B85]/70">
                    {/* Quantity Stepper */}
                    <div className="inline-flex items-center rounded-lg bg-[#1F0A4D] border border-[#3F1B85]">
                      <button
                        onClick={() => updateQuantity(item.offer.id, item.quantity - 1)}
                        className="p-1.5 text-gray-300 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-extrabold text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.offer.id, item.quantity + 1)}
                        disabled={item.quantity >= item.offer.stock_count}
                        className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-base font-black text-[#FAD318]">
                      €{((item.offer.price_cents * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Subtotal */}
        {items.length > 0 && (
          <div className="p-6 bg-[#2A1163] border-t border-[#3F1B85] space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Digital Delivery</span>
                <span className="text-[#63E3C2] font-bold">FREE (Instant)</span>
              </div>
              <div className="flex items-center justify-between text-lg font-black text-white pt-2 border-t border-[#3F1B85]">
                <span>Subtotal</span>
                <span className="text-2xl text-[#FAD318]">
                  €{(totalPriceCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 px-5 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-sm shadow-lg shadow-[#FAD318]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
            >
              {isAuthenticated ? 'Proceed to Checkout' : 'Sign In to Checkout'}
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#63E3C2]" />
              100% Verified Keys • Instant Activation
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};


3. Protected Checkout & Instant Key Reveal (/frontend/src/pages/CheckoutPage.tsx)
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  CreditCard,
  Wallet,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  KeyRound,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { checkoutOrder } from '../api/catalog';
import { Order } from '../types/order';

type PaymentMethod = 'card' | 'paypal' | 'wallet';

export const CheckoutPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, totalPriceCents, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1F0A4D] flex items-center justify-center text-white font-bold">
        Loading checkout...
      </div>
    );
  }

  // Protect route: redirect unauthenticated users to login with ?redirect=/checkout
  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/checkout" replace />;
  }

  // Redirect to store if cart is empty and no order was just completed
  if (items.length === 0 && !completedOrder) {
    return <Navigate to="/store" replace />;
  }

  const handleCopyKey = (itemId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKeyId(itemId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handlePayNow = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      // Keep product metadata lookup before clearing cart
      const productLookup = new Map(items.map((i) => [i.product.id, i.product]));

      const payload = items.map((item) => ({
        offer_id: item.offer.id,
        quantity: item.quantity,
      }));

      const order = await checkoutOrder(payload);

      // Enrich returned order items with product title/platform/cover from cart state
      order.items = order.items.map((oi) => {
        const prod = productLookup.get(oi.product_id);
        return {
          ...oi,
          product_title: oi.product_title || prod?.title || 'Digital Game Key',
          product_platform: oi.product_platform || prod?.platform || 'Digital',
          product_region: oi.product_region || prod?.region || 'GLOBAL',
          cover_image_url: oi.cover_image_url || prod?.cover_image_url,
        };
      });

      setCompletedOrder(order);
      clearCart();
    } catch (err: any) {
      setError(
        err?.response?.data?.details ||
          err?.response?.data?.error ||
          'Payment processing failed. Please verify stock availability.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // --- POST-PAYMENT DIGITAL KEY REVEAL VIEW ---
  if (completedOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#4618AC]/35 to-[#1F0A4D] py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Success Header */}
          <div className="p-8 rounded-2xl bg-[#2A1163] border-2 border-[#63E3C2] text-center space-y-3 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#63E3C2]/20 text-[#63E3C2] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white">Payment Successful!</h1>
            <p className="text-sm text-gray-300 max-w-lg mx-auto">
              Your digital activation keys are unlocked below and saved permanently in{' '}
              <span className="text-[#FAD318] font-bold">My Library & Keys</span>.
            </p>
            <div className="inline-block px-3 py-1 rounded-lg bg-[#1F0A4D] border border-[#3F1B85] text-xs text-gray-400 font-mono">
              Order Ref: {completedOrder.payment_reference || completedOrder.id.slice(0, 8)} • Paid €
              {(completedOrder.total_cents / 100).toFixed(2)}
            </div>
          </div>

          {/* Unlocked Keys List */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#FAD318]" />
              Your Unlocked Digital Keys ({completedOrder.items.length})
            </h2>

            {completedOrder.items.map((item) => {
              const isCopied = copiedKeyId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#2A1163] border border-[#3F1B85] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    {item.cover_image_url && (
                      <img
                        src={item.cover_image_url}
                        alt={item.product_title}
                        className="w-20 h-14 object-cover rounded-lg border border-[#3F1B85] shrink-0"
                      />
                    )}
                    <div>
                      <h3 className="font-extrabold text-white text-base">{item.product_title}</h3>
                      <p className="text-xs font-bold text-[#63E3C2] mt-0.5">
                        {item.product_platform} • {item.product_region}
                      </p>
                    </div>
                  </div>

                  {/* Key Box + Copy Button */}
                  <div className="flex items-center gap-2 bg-[#1F0A4D] p-2 pl-4 rounded-xl border border-[#FAD318]/50">
                    <code className="font-mono text-sm sm:text-base font-black tracking-widest text-[#FAD318] select-all">
                      {item.digital_key}
                    </code>
                    <button
                      onClick={() => handleCopyKey(item.id, item.digital_key)}
                      className={`px-3.5 py-2 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isCopied
                          ? 'bg-[#63E3C2] text-[#1F0A4D]'
                          : 'bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D]'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                          Copy Key
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/orders"
              className="px-6 py-3 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-sm inline-flex items-center gap-2"
            >
              Go to My Library & Keys
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link
              to="/store"
              className="px-6 py-3 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] text-white font-bold text-sm border border-[#3F1B85]"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- CHECKOUT FORM VIEW ---
  return (
    <div className="min-h-screen bg-[#1F0A4D] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Secure Checkout</h1>
          <p className="text-sm text-gray-400 mt-1">
            Sandbox Test Mode — No real money will be charged
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FD5A20]/15 border border-[#FD5A20] flex items-center gap-3 text-sm font-bold text-[#FD5A20]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Simulated Payment Method Selector (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl bg-[#2A1163] border border-[#3F1B85] space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">Select Payment Method</h2>
                <span className="px-2.5 py-1 rounded-md bg-[#63E3C2]/15 text-[#63E3C2] text-[11px] font-black uppercase">
                  Test Sandbox
                </span>
              </div>

              <div className="space-y-3">
                {/* Option 1: Credit / Debit Card */}
                <label
                  onClick={() => setPaymentMethod('card')}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-[#1F0A4D] border-[#FAD318]'
                      : 'bg-[#1F0A4D]/60 border-[#3F1B85] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#4618AC] text-[#FAD318] flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-sm">Credit / Debit Card (Test)</p>
                      <p className="text-xs text-gray-400">Visa •••• 4242 — Instant approval</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="w-4 h-4 text-[#FAD318]"
                  />
                </label>

                {/* Option 2: PayPal Express */}
                <label
                  onClick={() => setPaymentMethod('paypal')}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'paypal'
                      ? 'bg-[#1F0A4D] border-[#FAD318]'
                      : 'bg-[#1F0A4D]/60 border-[#3F1B85] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#003087] text-white flex items-center justify-center font-black text-sm">
                      PP
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-sm">PayPal Express (Simulated)</p>
                      <p className="text-xs text-gray-400">Zero processing fee in sandbox mode</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'paypal'}
                    onChange={() => setPaymentMethod('paypal')}
                    className="w-4 h-4 text-[#FAD318]"
                  />
                </label>

                {/* Option 3: Eneba Wallet */}
                <label
                  onClick={() => setPaymentMethod('wallet')}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'wallet'
                      ? 'bg-[#1F0A4D] border-[#FAD318]'
                      : 'bg-[#1F0A4D]/60 border-[#3F1B85] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#FAD318]/20 text-[#FAD318] flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-sm">GameKey Wallet Balance</p>
                      <p className="text-xs text-[#63E3C2] font-semibold">
                        Available Sandbox Credits: €500.00
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                    className="w-4 h-4 text-[#FAD318]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right: Order Summary & Pay Now CTA (5 cols) */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-[#2A1163] border border-[#3F1B85] space-y-5 shadow-xl">
              <h2 className="text-lg font-black text-white border-b border-[#3F1B85] pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.offer.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">
                        {item.quantity}× {item.product.title}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {item.product.platform} • {item.offer.seller_username || 'Verified Seller'}
                      </p>
                    </div>
                    <span className="font-extrabold text-white shrink-0">
                      €{((item.offer.price_cents * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#3F1B85] space-y-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Service Fee (Sandbox)</span>
                  <span className="text-[#63E3C2] font-bold">€0.00</span>
                </div>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-base font-black text-white">Total to Pay</span>
                  <span className="text-3xl font-black text-[#FAD318]">
                    €{(totalPriceCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayNow}
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] disabled:opacity-50 text-[#1F0A4D] font-black text-base shadow-lg shadow-[#FAD318]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <Lock className="w-4 h-4 stroke-[2.5]" />
                {isProcessing
                  ? 'Generating Digital Keys...'
                  : `Pay Now • €${(totalPriceCents / 100).toFixed(2)}`}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 text-center">
                <ShieldCheck className="w-4 h-4 text-[#63E3C2] shrink-0" />
                Protected by 256-bit SSL & Instant Key Delivery Guarantee
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


4. My Library & Keys History Page (/frontend/src/pages/OrdersPage.tsx)
import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { KeyRound, Copy, Check, Eye, EyeOff, Package, ShoppingBag, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserOrders } from '../api/catalog';
import { Order } from '../types/order';

export const OrdersPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const data = await getUserOrders();
        if (isMounted) {
          setOrders(data || []);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1F0A4D] flex items-center justify-center text-white font-bold">
        Loading your library...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/orders" replace />;
  }

  const toggleReveal = (itemId: string) => {
    setRevealedKeys((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleCopy = (itemId: string, keyCode: string) => {
    navigator.clipboard.writeText(keyCode);
    setRevealedKeys((prev) => ({ ...prev, [itemId]: true }));
    setCopiedId(itemId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1F0A4D] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <KeyRound className="w-8 h-8 text-[#FAD318]" />
              My Library & Keys
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              View your purchase history and copy your digital activation keys anytime
            </p>
          </div>

          <Link
            to="/store"
            className="px-4 py-2.5 rounded-xl bg-[#2A1163] hover:bg-[#3F1B85] border border-[#3F1B85] text-sm font-extrabold text-white transition-colors"
          >
            Browse More Games
          </Link>
        </div>

        {/* Orders Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="h-44 rounded-2xl bg-[#2A1163] animate-pulse border border-[#3F1B85]"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-14 rounded-2xl bg-[#2A1163] border border-[#3F1B85] text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-[#FAD318] mx-auto" />
            <h2 className="text-xl font-black text-white">No games in your library yet</h2>
            <p className="text-sm text-gray-300 max-w-md mx-auto">
              Once you complete an order, all of your digital activation codes will appear here.
            </p>
            <Link
              to="/store"
              className="inline-block px-6 py-3 rounded-xl bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D] font-black text-sm"
            >
              Explore Store Deals
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl bg-[#2A1163] border border-[#3F1B85] overflow-hidden shadow-xl"
              >
                {/* Order Meta Header */}
                <div className="px-6 py-4 bg-[#1F0A4D]/70 border-b border-[#3F1B85] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 font-bold text-gray-300">
                      <Package className="w-4 h-4 text-[#FAD318]" />
                      Order #{order.payment_reference || order.id.slice(0, 8)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#63E3C2]/15 text-[#63E3C2] font-extrabold uppercase">
                      {order.status}
                    </span>
                    <span className="text-sm font-black text-white">
                      Total: €{(order.total_cents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Purchased Keys in Order */}
                <div className="divide-y divide-[#3F1B85]">
                  {(order.items || []).map((item) => {
                    const isVisible = !!revealedKeys[item.id];
                    const isCopied = copiedId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          {item.cover_image_url && (
                            <img
                              src={item.cover_image_url}
                              alt={item.product_title}
                              className="w-24 h-14 object-cover rounded-lg border border-[#3F1B85] shrink-0"
                            />
                          )}
                          <div>
                            <h3 className="font-extrabold text-white text-base">
                              {item.product_title || 'Digital Game Key'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="px-2 py-0.5 rounded bg-[#4618AC] text-white font-bold">
                                {item.product_platform}
                              </span>
                              <span className="text-[#63E3C2] font-bold">
                                {item.product_region}
                              </span>
                              <span className="text-gray-400">
                                • Paid €{(item.unit_price_cents / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Key Reveal & Copy Controls */}
                        <div className="flex items-center gap-2 bg-[#1F0A4D] p-2 pl-3.5 rounded-xl border border-[#3F1B85]">
                          <code className="font-mono text-sm font-black tracking-wider text-[#FAD318]">
                            {isVisible ? item.digital_key : '•••••-•••••-•••••'}
                          </code>

                          <button
                            onClick={() => toggleReveal(item.id)}
                            title={isVisible ? 'Hide Key' : 'Reveal Key'}
                            className="p-2 rounded-lg bg-[#2A1163] hover:bg-[#3F1B85] text-gray-300 hover:text-white transition-colors cursor-pointer"
                          >
                            {isVisible ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleCopy(item.id, item.digital_key)}
                            className={`px-3 py-2 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isCopied
                                ? 'bg-[#63E3C2] text-[#1F0A4D]'
                                : 'bg-[#FAD318] hover:bg-[#E5BE0B] text-[#1F0A4D]'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


5. Complete Application Router (/frontend/src/App.tsx)
import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/layout/Navbar';
import { CartDrawer } from './components/cart/CartDrawer';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#1F0A4D] text-white">
      <Navbar onOpenAuth={() => navigate('/login')} />
      <CartDrawer />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Routes>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppLayout />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;



User prompt: Prepare the project for free-tier deployment and submission: 1. Write a multi-stage Dockerfile for /backend and a render.yaml (or deployment instructions) for Render + Neon/Supabase free-tier PostgreSQL. 2. Add vercel.json (for SPA client-side routing rewrites) and .env.example files for both /frontend and /backend. 3. Generate a thorough README.md explaining the system architecture, database schema, why PostgreSQL pg_trgm was chosen for typo-tolerant search, how the dynamic homepage blocks work, and our scope justifications.
Response: 1. Multi-Stage Backend Dockerfile (/backend/Dockerfile)
# Stage 1: Build static Go binary
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install git and CA certificates for dependency fetching & HTTPS
RUN apk add --no-cache git ca-certificates tzdata

# Download Go modules first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build statically linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/server ./cmd/api/main.go

# Stage 2: Minimal distroless runtime image (~15 MB)
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

# Copy compiled binary and SQL migrations
COPY --from=builder /app/server /app/server
COPY --from=builder /app/migrations /app/migrations

# Expose API port (Render injects PORT dynamically)
EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/app/server"]


2. Render Infrastructure Blueprint (/render.yaml)
services:
  - type: web
    name: gamekey-marketplace-api
    runtime: docker
    region: frankfurt
    plan: free
    rootDir: backend
    dockerfilePath: ./Dockerfile
    healthCheckPath: /api/homepage
    envVars:
      - key: GIN_MODE
        value: release
      - key: PORT
        value: "8080"
      - key: DATABASE_URL
        sync: false # Set to Neon or Supabase pooled connection string in Render Dashboard
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ALLOWED_ORIGINS
        sync: false # Set to your Vercel deployment URL (e.g., https://gamekey-store.vercel.app)


3. Vercel SPA Rewrite Config & Environment Templates
/frontend/vercel.json
Ensures direct navigation or browser refreshes on routes like /store, /products/:slug, /checkout, or /orders resolve to index.html instead of returning a 404 on Vercel.
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}


/backend/.env.example
# Server Port
PORT=8080

# Gin Framework Mode (debug | release)
GIN_MODE=debug

# PostgreSQL Connection String (Local Docker, Neon, or Supabase)
# Note: pg_trgm and uuid-ossp extensions must be supported by the target database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/gamekey_db?sslmode=disable

# Secret key used to sign HS256 JWT tokens (use at least 32 random characters in production)
JWT_SECRET=replace-with-a-strong-random-32-char-secret

# Allowed Frontend Origin for CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173


/frontend/.env.example
# Base URL of the Go REST API (no trailing slash)
VITE_API_URL=http://localhost:8080/api


4. Project Documentation (/README.md)
# GameKey — Digital Game Key Marketplace

A full-stack digital game key marketplace inspired by **Eneba**, built with **Go (Gin + pgx)**, **PostgreSQL (`pg_trgm`)**, and **React (Vite + TypeScript + Tailwind CSS)**.

The platform supports multi-seller offer comparisons per product, typo-tolerant fuzzy search, a 100% backend-driven dynamic storefront layout, JWT authentication, and atomic checkout transactions with pessimistic row locking and instant digital key generation.

---

## System Architecture

```text
┌─────────────────────────────┐         HTTPS / JSON          ┌──────────────────────────────┐
│     Frontend (Vercel)       │ ────────────────────────────► │       Backend (Render)       │
│  React 18 • Vite • TS       │   Bearer JWT / REST Queries   │   Go 1.23 • Gin • pgx/v5     │
│  Tailwind CSS • Cart State  │ ◄──────────────────────────── │   Atomic Checkout & Keygen   │
└─────────────────────────────┘                               └──────────────┬───────────────┘
                                                                             │
                                                                             │ SQL + pg_trgm
                                                                             ▼
                                                              ┌──────────────────────────────┐
                                                              │   PostgreSQL (Neon/Supabase) │
                                                              │  • GIN Trigram Indexes       │
                                                              │  • JSONB Homepage Blocks     │
                                                              │  • Row-Level Locking (ACID)  │
                                                              └──────────────────────────────┘


Key Architectural Highlights
Stateless Go REST API: Built with gin-gonic/gin and jackc/pgx/v5/pgxpool for low-latency connection pooling and native PostgreSQL array/JSONB scanning.
ACID Checkout & Inventory Integrity: Purchasing items executes inside an explicit PostgreSQL transaction (BEGIN ... COMMIT) using SELECT ... FOR UPDATE on offers rows. Concurrent checkouts cannot oversell limited key stock.
Idempotent Startup Seeding: On boot, SeedIfEmpty checks if the catalog is empty and populates 5 verified sellers, 16 games across Steam, PlayStation, Xbox, and Nintendo, 40+ competing seller offers, and 4 storefront layout blocks.
Database Schema

Table
Purpose
Key Constraints & Indexes
users
Buyers, verified sellers, and admins
UNIQUE(email), UNIQUE(username), seller_rating (0.00–5.00)
products
Canonical game metadata (title, platform, region, cover art, genres)
UNIQUE(slug), GIN (title gin_trgm_ops), GIN (genres)
offers
Multi-seller listings per game with independent pricing & stock
UNIQUE(product_id, seller_id), CHECK (stock_count >= 0), partial index on (product_id, price_cents ASC)
homepage_blocks
Backend-driven storefront sections (block_type, sort_order, config_json)
JSONB config rules, partial index on (sort_order ASC) WHERE is_active = TRUE
orders
Customer purchase headers with status & payment reference
FK user_id, index on (user_id, created_at DESC)
order_items
Individual purchased units storing generated activation codes
FK order_id, FK offer_id, digital_key (e.g., STM-A9F2K-7X1M4)

Why PostgreSQL pg_trgm Was Chosen for Search
Digital game titles frequently contain punctuation, Roman numerals, subtitles, or user typos (e.g., typing "eldn rign", "cyberpuk", or "baldurs gate" without the apostrophe).
Zero External Infrastructure Overhead: Running Elasticsearch, Meilisearch, or Algolia adds hosting cost, synchronization lag, and operational complexity—violating free-tier deployment constraints.
Typo Tolerance via Trigram Similarity: PostgreSQL's built-in pg_trgm extension breaks strings into 3-character trigrams and computes similarity scores (similarity(title, q) > 0.15) combined with substring matching (ILIKE).
Sub-Millisecond Index Scans: Adding a GIN (title gin_trgm_ops) index allows PostgreSQL to execute fuzzy queries directly in the primary database with minimal memory footprint.
How Dynamic Homepage Blocks Work
Instead of hardcoding product carousels or promotional banners in React, the storefront layout is stored in the homepage_blocks table:
Database Storage: Each row defines a block_type (hero_banner, best_sellers, flash_deals, platform_spotlight), title, subtitle, sort_order, and a flexible config_json payload.
Backend Hydration (GET /api/homepage): The Go handler queries active blocks ordered by sort_order and dynamically resolves referenced product_slugs or discount rules (min_discount_percent >= 50), attaching the lowest active offer price and discount percentage to each product.
Frontend Rendering (BlockRenderer.tsx): The React homepage maps over the returned blocks array and renders the matching UI component (HeroBannerBlock, ProductCarouselBlock, PlatformGridBlock). Marketing teams can reorder sections, swap hero slides, or adjust flash deal thresholds in SQL without redeploying the frontend.
Scope & Engineering Trade-offs
Simulated Payment Gateway: Checkout supports Card, PayPal, and Wallet selection in sandbox mode rather than integrating live Stripe webhooks. This keeps the checkout flow deterministic and testable without requiring real payment credentials while still exercising full backend ACID stock locking and key generation.
On-Demand Key Generation vs. Pre-Uploaded Key Pools: In production marketplaces, sellers upload batches of encrypted activation keys. To guarantee zero "out-of-keys" dead ends during evaluation while preserving realistic key formatting (STM-XXXXX-XXXXX, PSN-XXXXX-XXXXX), keys are cryptographically generated at checkout fulfillment time and persisted in order_items.
Single-Currency Storefront (EUR): All prices are stored as integer cents (price_cents) in EUR to eliminate floating-point rounding errors and keep offer comparisons consistent across sellers.
Local Development & Free-Tier Deployment
1. Local Setup
# Start PostgreSQL and run 001_init.sql
psql -U postgres -d gamekey_db -f backend/migrations/001_init.sql

# Start Go Backend (auto-seeds on first run)
cd backend
cp .env.example .env
go run ./cmd/api/main.go

# Start React Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev


2. Free-Tier Cloud Deployment (Neon + Render + Vercel)
Database (Neon or Supabase): Create a free PostgreSQL project, open the SQL Editor, and execute backend/migrations/001_init.sql (both Neon and Supabase support pg_trgm out of the box). Copy the pooled connection string.
Backend (Render): Push this monorepo to GitHub and create a Blueprint (using render.yaml) or a Web Service pointing to /backend with Docker runtime. Set DATABASE_URL and CORS_ALLOWED_ORIGINS in Render's environment variables.
Frontend (Vercel): Import the repository into Vercel, set the Root Directory to frontend, add VITE_API_URL=https://<your-render-service>.onrender.com/api, and deploy. frontend/vercel.json automatically handles React Router client-side fallback routing.


User prompt: compile or verify any missing edge cases, and export this full conversation into agent .md deliverable file.
Response: I will now generate the comprehensive markdown deliverable file containing the complete system architecture, database schema, backend/frontend code, edge case verification, and deployment instructions for the GameKey marketplace project.
Conclusion & Suggestions
The comprehensive deliverable file has been successfully generated. It consolidates the complete monorepo architecture, database schema, edge case analysis, and deployment configurations into a single reference document.

User prompt: export this full conversation into agentchat .md deliverable file.
Response: I will now generate the complete conversation transcript file containing our entire chat session, capturing every step of building the Eneba-inspired digital game key marketplace monorepo.
Conclusion & Suggestions
I have successfully exported our complete conversational history and code developments into the deliverables/agentchat_export.md deliverable file. Let me know if you would like to make any additional tweaks before deployment!

User prompt: Provide the vite.config.ts and package.json files
Response: Here are the complete vite.config.ts and package.json files for the /frontend package, configured with Vite, React, TypeScript, Tailwind CSS, and icon support (lucide-react).
1. Vite Configuration (/frontend/vite.config.ts)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'axios'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});


2. Frontend Package Manifest (/frontend/package.json)
{
  "name": "gamekey-marketplace-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.9",
    "lucide-react": "^1.16.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.3",
    "vite": "^6.0.11"
  }
}



User prompt: Provide the tsconfig.json
Response: Here is the complete tsconfig.json (and companion tsconfig.node.json) configured for React 18, Vite, strict TypeScript checking, and the @/* path alias defined in vite.config.ts.
1. Application TypeScript Config (/frontend/tsconfig.json)
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Path Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    /* Linting & Type Safety */
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}


2. Vite Node Environment Config (/frontend/tsconfig.node.json)
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}



User prompt: Provide the index.html and main.tsx files
Response: 1. HTML Entrypoint (/frontend/index.html)
Loads the Plus Jakarta Sans geometric font from Google Fonts, sets the dark violet background (#1F0A4D) to prevent white flash on load, and mounts the React root.
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GameKey — Digital Game Keys, Gift Cards & Instant Deals</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-[#1F0A4D] text-white antialiased selection:bg-[#FAD318] selection:text-[#1F0A4D]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>


2. React Application Bootstrap (/frontend/src/main.tsx)
Imports global Tailwind styles and renders the root <App/> component inside React.StrictMode.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



