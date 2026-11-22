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