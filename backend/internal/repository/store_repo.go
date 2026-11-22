package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	//"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/KobiSonne/gamekey-marketplace/internal/models"
)

type StoreRepository struct {
	db *pgxpool.Pool
}

func NewStoreRepository(db *pgxpool.Pool) *StoreRepository {
	return &StoreRepository{db: db}
}

// GetHomepageBlocks fetches active blocks ordered by sort_order
func (r *StoreRepository) GetHomepageBlocks(ctx context.Context) ([]models.HomepageBlock, error) {

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
	Query    string
	Platform string
	Region   string
	MinPrice *int
	MaxPrice *int
	Sort     string // price_asc, price_desc, popularity, newest
	Limit    int
	Offset   int
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
