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