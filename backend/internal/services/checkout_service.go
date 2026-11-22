package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	//"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/KobiSonne/gamekey-marketplace/internal/models"
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
