package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/KobiSonne/gamekey-marketplace/internal/models"
	"github.com/KobiSonne/gamekey-marketplace/internal/repository"
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
