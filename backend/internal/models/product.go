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