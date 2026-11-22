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