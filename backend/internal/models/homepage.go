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