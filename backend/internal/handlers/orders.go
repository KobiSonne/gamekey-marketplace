package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/KobiSonne/gamekey-marketplace/internal/middleware"
	"github.com/KobiSonne/gamekey-marketplace/internal/models"
	"github.com/KobiSonne/gamekey-marketplace/internal/services"
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
		orders = []models.Order{} // Or empty slice
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
	})
}
