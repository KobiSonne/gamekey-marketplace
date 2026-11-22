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
	const dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

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