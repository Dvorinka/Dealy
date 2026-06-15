package main

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func registerRoutes(r *gin.Engine) {
	api := r.Group("/api")
	api.POST("/login", login)
	api.GET("/me", authMiddleware(), getMe)
	api.PUT("/me", authMiddleware(), updateMe)
	api.GET("/settings", authMiddleware(), getPlatformSettingsHandler)
	api.PUT("/settings", authMiddleware(), adminMiddleware(), updatePlatformSettingsHandler)

	api.GET("/evidence", listEvidence)
	api.GET("/evidence/:id", getEvidence)
	api.POST("/evidence", createEvidence)
	api.PUT("/evidence/:id", updateEvidence)
	api.DELETE("/evidence/:id", deleteEvidence)

	api.GET("/evidence-types", listEvidenceTypes)
	api.GET("/locations", listLocations)
	api.GET("/gang-members", listGangMembers)

	api.GET("/customers", listCustomers)
	api.GET("/customers/:id", getCustomer)
	api.POST("/customers", createCustomer)
	api.PUT("/customers/:id", updateCustomer)
	api.DELETE("/customers/:id", deleteCustomer)

	api.GET("/orders", listOrders)
	api.GET("/orders/:id", getOrder)
	api.GET("/orders/next-code", getNextOrderCode)
	api.POST("/orders", createOrder)
	api.PUT("/orders/:id", updateOrder)
	api.DELETE("/orders/:id", deleteOrder)

	api.GET("/payments", listPayments)
	api.POST("/payments", createPayment)
	api.PUT("/payments/:id/status", updatePaymentStatus)

	api.GET("/stats", getStats)
	api.GET("/health", healthCheck)
}

const (
	CtxKeyUser = "user"
)

// Auth handlers
func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	var user User
	var hash string
	err := db.QueryRow(ctx, `SELECT id, username, password_hash, role, status, created_at FROM users WHERE username = $1`, req.Username).Scan(
		&user.ID, &user.Username, &hash, &user.Role, &user.Status, &user.CreatedAt)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if user.Status != "active" {
		c.JSON(http.StatusForbidden, gin.H{"error": "account suspended"})
		return
	}

	// Demo: password is "blue" for all demo accounts
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		// Also allow plaintext "blue" for demo
		if req.Password != "blue" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
	}

	token := generateToken(user.Username)
	c.JSON(http.StatusOK, LoginResponse{
		Token:   token,
		User:    user,
		Message: "Say my name.",
	})
}

func getMe(c *gin.Context) {
	username, _ := c.Get("username")
	ctx := context.Background()
	var user User
	err := db.QueryRow(ctx, `SELECT id, username, role, status, created_at FROM users WHERE username = $1`, username).Scan(
		&user.ID, &user.Username, &user.Role, &user.Status, &user.CreatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func updateMe(c *gin.Context) {
	username, _ := c.Get("username")
	var req UpdateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	var userID int
	var hash string
	var user User
	err := db.QueryRow(ctx, `SELECT id, username, password_hash, role, status, created_at FROM users WHERE username = $1`, username).Scan(
		&userID, &user.Username, &hash, &user.Role, &user.Status, &user.CreatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if req.NewPassword != "" {
		if req.CurrentPassword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "current password required"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.CurrentPassword)); err != nil {
			if req.CurrentPassword != "blue" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid current password"})
				return
			}
		}
		newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		_, err = db.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE id = $2`, string(newHash), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if req.Username != "" && req.Username != user.Username {
		var exists int
		err = db.QueryRow(ctx, `SELECT 1 FROM users WHERE username = $1 AND id != $2`, req.Username, userID).Scan(&exists)
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "username already taken"})
			return
		}
		_, err = db.Exec(ctx, `UPDATE users SET username = $1 WHERE id = $2`, req.Username, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		user.Username = req.Username
	}

	c.JSON(http.StatusOK, user)
}

func adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		username, _ := c.Get("username")
		ctx := c.Request.Context()
		var role string
		err := db.QueryRow(ctx, `SELECT role FROM users WHERE username = $1`, username).Scan(&role)
		if err != nil || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			return
		}
		c.Next()
	}
}

func getPlatformSettingsHandler(c *gin.Context) {
	settings, err := getPlatformSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func updatePlatformSettingsHandler(c *gin.Context) {
	var settings PlatformSettings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if settings.ShopName == "" {
		settings.ShopName = "The Shop"
	}
	if settings.DefaultTerritory == "" {
		settings.DefaultTerritory = "Albuquerque"
	}
	if settings.OrderCodePrefix == "" {
		settings.OrderCodePrefix = "ORD"
	}
	if settings.ShopWelcomeMessage == "" {
		settings.ShopWelcomeMessage = "Browse available product. Buyer discretion advised."
	}
	if err := savePlatformSettings(c.Request.Context(), settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		token := strings.TrimPrefix(auth, "Bearer ")
		if token == auth {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token format"})
			return
		}
		// Demo: token is just username for simplicity
		c.Set("username", token)
		c.Next()
	}
}

func generateToken(username string) string {
	// Demo token: just the username. In production use JWT.
	return username
}

// Evidence handlers
func listEvidence(c *gin.Context) {
	ctx := context.Background()
	rows, err := db.Query(ctx, `
		SELECT e.id, e.code, e.title, e.description, e.type_id, et.name,
		       e.location_id, l.name, e.collected_by, gm.codename,
		       e.weight_grams, e.purity_percent, e.street_value, e.image_url,
		       e.status, e.tags, e.created_at, e.updated_at
		FROM evidence e
		LEFT JOIN evidence_types et ON e.type_id = et.id
		LEFT JOIN locations l ON e.location_id = l.id
		LEFT JOIN gang_members gm ON e.collected_by = gm.id
		ORDER BY e.created_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var items []Evidence
	for rows.Next() {
		var ev Evidence
		var locID, colID *int
		var locName, colName *string
		err := rows.Scan(&ev.ID, &ev.Code, &ev.Title, &ev.Description, &ev.TypeID, &ev.TypeName,
			&locID, &locName, &colID, &colName,
			&ev.WeightGrams, &ev.PurityPercent, &ev.StreetValue, &ev.ImageURL,
			&ev.Status, &ev.Tags, &ev.CreatedAt, &ev.UpdatedAt)
		if err != nil {
			continue
		}
		if locID != nil {
			ev.LocationID = locID
			ev.LocationName = *locName
		}
		if colID != nil {
			ev.CollectedBy = colID
			ev.CollectorName = *colName
		}
		items = append(items, ev)
	}
	c.JSON(http.StatusOK, items)
}

func getEvidence(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ctx := context.Background()
	var ev Evidence
	var locID, colID *int
	var locName, colName *string
	err := db.QueryRow(ctx, `
		SELECT e.id, e.code, e.title, e.description, e.type_id, et.name,
		       e.location_id, l.name, e.collected_by, gm.codename,
		       e.weight_grams, e.purity_percent, e.street_value, e.image_url,
		       e.status, e.tags, e.created_at, e.updated_at
		FROM evidence e
		LEFT JOIN evidence_types et ON e.type_id = et.id
		LEFT JOIN locations l ON e.location_id = l.id
		LEFT JOIN gang_members gm ON e.collected_by = gm.id
		WHERE e.id = $1`, id).Scan(&ev.ID, &ev.Code, &ev.Title, &ev.Description, &ev.TypeID, &ev.TypeName,
		&locID, &locName, &colID, &colName,
		&ev.WeightGrams, &ev.PurityPercent, &ev.StreetValue, &ev.ImageURL,
		&ev.Status, &ev.Tags, &ev.CreatedAt, &ev.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if locID != nil {
		ev.LocationID = locID
		ev.LocationName = *locName
	}
	if colID != nil {
		ev.CollectedBy = colID
		ev.CollectorName = *colName
	}
	c.JSON(http.StatusOK, ev)
}

func createEvidence(c *gin.Context) {
	var req CreateEvidenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Status == "" {
		req.Status = "stored"
	}
	ctx := context.Background()
	var id int
	err := db.QueryRow(ctx, `
		INSERT INTO evidence (code, title, description, type_id, location_id, collected_by, weight_grams, purity_percent, street_value, image_url, status, tags)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id`,
		req.Code, req.Title, req.Description, req.TypeID, req.LocationID, req.CollectedBy,
		req.WeightGrams, req.PurityPercent, req.StreetValue, req.ImageURL, req.Status, req.Tags,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func updateEvidence(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req UpdateEvidenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := context.Background()
	_, err := db.Exec(ctx, `
		UPDATE evidence SET
			title = COALESCE(NULLIF($1, ''), title),
			description = COALESCE(NULLIF($2, ''), description),
			type_id = COALESCE(NULLIF($3, 0), type_id),
			location_id = $4,
			collected_by = $5,
			weight_grams = $6,
			purity_percent = $7,
			street_value = $8,
			image_url = COALESCE(NULLIF($9, ''), image_url),
			status = COALESCE(NULLIF($10, ''), status),
			tags = $11,
			updated_at = NOW()
		WHERE id = $12`,
		req.Title, req.Description, req.TypeID, req.LocationID, req.CollectedBy,
		req.WeightGrams, req.PurityPercent, req.StreetValue, req.ImageURL, req.Status, req.Tags, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
}

func deleteEvidence(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ctx := context.Background()
	_, err := db.Exec(ctx, `DELETE FROM evidence WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

func listEvidenceTypes(c *gin.Context) {
	ctx := context.Background()
	rows, err := db.Query(ctx, `SELECT id, name, description, icon, danger_level, created_at FROM evidence_types ORDER BY danger_level DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var items []EvidenceType
	for rows.Next() {
		var t EvidenceType
		rows.Scan(&t.ID, &t.Name, &t.Description, &t.Icon, &t.DangerLevel, &t.CreatedAt)
		items = append(items, t)
	}
	c.JSON(http.StatusOK, items)
}

func listLocations(c *gin.Context) {
	ctx := context.Background()
	rows, err := db.Query(ctx, `SELECT id, name, address, lat, lng, type, status, notes, created_at FROM locations ORDER BY name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var items []Location
	for rows.Next() {
		var l Location
		var lat, lng *float64
		rows.Scan(&l.ID, &l.Name, &l.Address, &lat, &lng, &l.Type, &l.Status, &l.Notes, &l.CreatedAt)
		if lat != nil {
			l.Lat = *lat
		}
		if lng != nil {
			l.Lng = *lng
		}
		items = append(items, l)
	}
	c.JSON(http.StatusOK, items)
}

func listGangMembers(c *gin.Context) {
	ctx := context.Background()
	rows, err := db.Query(ctx, `SELECT id, codename, real_name, role, status, trust_level, created_at FROM gang_members ORDER BY trust_level DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var items []GangMember
	for rows.Next() {
		var m GangMember
		rows.Scan(&m.ID, &m.Codename, &m.RealName, &m.Role, &m.Status, &m.TrustLevel, &m.CreatedAt)
		items = append(items, m)
	}
	c.JSON(http.StatusOK, items)
}

// Customer handlers
func listCustomers(c *gin.Context) {
	ctx := context.Background()
	rows, err := db.Query(ctx, `
		SELECT c.id, c.codename, c.real_name, c.contact, c.territory, c.trust_level, c.status, c.total_spent, c.created_at,
		       (SELECT COUNT(*) FROM orders WHERE customer_id = c.id)
		FROM customers c
		ORDER BY c.trust_level DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var items []Customer
	for rows.Next() {
		var cst Customer
		rows.Scan(&cst.ID, &cst.Codename, &cst.RealName, &cst.Contact, &cst.Territory, &cst.TrustLevel, &cst.Status, &cst.TotalSpent, &cst.CreatedAt, &cst.OrderCount)
		items = append(items, cst)
	}
	c.JSON(http.StatusOK, items)
}

func getCustomer(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ctx := context.Background()
	var cst Customer
	err := db.QueryRow(ctx, `
		SELECT id, codename, real_name, contact, territory, trust_level, status, total_spent, created_at
		FROM customers WHERE id = $1`, id).Scan(
		&cst.ID, &cst.Codename, &cst.RealName, &cst.Contact, &cst.Territory, &cst.TrustLevel, &cst.Status, &cst.TotalSpent, &cst.CreatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, cst)
}

func createCustomer(c *gin.Context) {
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Status == "" {
		req.Status = "active"
	}
	ctx := context.Background()
	var id int
	err := db.QueryRow(ctx, `
		INSERT INTO customers (codename, real_name, contact, territory, trust_level, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		req.Codename, req.RealName, req.Contact, req.Territory, req.TrustLevel, req.Status).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func updateCustomer(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := context.Background()
	_, err := db.Exec(ctx, `
		UPDATE customers SET
			codename = COALESCE(NULLIF($1, ''), codename),
			real_name = COALESCE(NULLIF($2, ''), real_name),
			contact = COALESCE(NULLIF($3, ''), contact),
			territory = COALESCE(NULLIF($4, ''), territory),
			trust_level = COALESCE(NULLIF($5, 0), trust_level),
			status = COALESCE(NULLIF($6, ''), status)
		WHERE id = $7`,
		req.Codename, req.RealName, req.Contact, req.Territory, req.TrustLevel, req.Status, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
}

func deleteCustomer(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ctx := context.Background()
	_, err := db.Exec(ctx, `DELETE FROM customers WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

// Order handlers
func listOrders(c *gin.Context) {
	ctx := context.Background()
	rows, err := db.Query(ctx, `
		SELECT o.id, o.order_code, o.customer_id, c.codename, o.status, o.total_value,
		       o.meetup_location_id, l.name, o.notes, o.created_at, o.updated_at
		FROM orders o
		LEFT JOIN customers c ON o.customer_id = c.id
		LEFT JOIN locations l ON o.meetup_location_id = l.id
		ORDER BY o.created_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var items []Order
	for rows.Next() {
		var o Order
		var locID *int
		var locName *string
		rows.Scan(&o.ID, &o.OrderCode, &o.CustomerID, &o.CustomerCodename, &o.Status, &o.TotalValue,
			&locID, &locName, &o.Notes, &o.CreatedAt, &o.UpdatedAt)
		if locID != nil {
			o.MeetupLocationID = locID
			o.MeetupName = *locName
		}
		items = append(items, o)
	}
	c.JSON(http.StatusOK, items)
}

func getOrder(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ctx := context.Background()
	var o Order
	var locID *int
	var locName *string
	err := db.QueryRow(ctx, `
		SELECT o.id, o.order_code, o.customer_id, c.codename, o.status, o.total_value,
		       o.meetup_location_id, l.name, o.notes, o.created_at, o.updated_at
		FROM orders o
		LEFT JOIN customers c ON o.customer_id = c.id
		LEFT JOIN locations l ON o.meetup_location_id = l.id
		WHERE o.id = $1`, id).Scan(
		&o.ID, &o.OrderCode, &o.CustomerID, &o.CustomerCodename, &o.Status, &o.TotalValue,
		&locID, &locName, &o.Notes, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if locID != nil {
		o.MeetupLocationID = locID
		o.MeetupName = *locName
	}

	// Load items
	itemRows, err := db.Query(ctx, `
		SELECT oi.id, oi.order_id, oi.evidence_id, e.code, e.title, oi.quantity, oi.unit_price, oi.total_price, oi.created_at
		FROM order_items oi
		LEFT JOIN evidence e ON oi.evidence_id = e.id
		WHERE oi.order_id = $1`, id)
	if err == nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var item OrderItem
			itemRows.Scan(&item.ID, &item.OrderID, &item.EvidenceID, &item.EvidenceCode, &item.EvidenceTitle,
				&item.Quantity, &item.UnitPrice, &item.TotalPrice, &item.CreatedAt)
			o.Items = append(o.Items, item)
		}
	}

	// Load payment
	var p Payment
	err = db.QueryRow(ctx, `SELECT id, order_id, amount, method, status, transaction_ref, created_at FROM payments WHERE order_id = $1`, id).Scan(
		&p.ID, &p.OrderID, &p.Amount, &p.Method, &p.Status, &p.TransactionRef, &p.CreatedAt)
	if err == nil {
		o.Payment = &p
	}

	c.JSON(http.StatusOK, o)
}

func createOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := context.Background()

	// Calculate total
	var total float64
	for _, item := range req.Items {
		total += item.Quantity * item.UnitPrice
	}

	var orderID int
	err := db.QueryRow(ctx, `
		INSERT INTO orders (order_code, customer_id, status, total_value, meetup_location_id, notes)
		VALUES ($1, $2, 'pending', $3, $4, $5)
		RETURNING id`,
		req.OrderCode, req.CustomerID, total, req.MeetupLocationID, req.Notes).Scan(&orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Insert items
	for _, item := range req.Items {
		db.Exec(ctx, `
			INSERT INTO order_items (order_id, evidence_id, quantity, unit_price, total_price)
			VALUES ($1, $2, $3, $4, $5)`,
			orderID, item.EvidenceID, item.Quantity, item.UnitPrice, item.Quantity*item.UnitPrice)
	}

	c.JSON(http.StatusCreated, gin.H{"id": orderID, "total_value": total})
}

func updateOrder(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req UpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := context.Background()
	_, err := db.Exec(ctx, `
		UPDATE orders SET
			status = COALESCE(NULLIF($1, ''), status),
			meetup_location_id = $2,
			notes = COALESCE(NULLIF($3, ''), notes),
			updated_at = NOW()
		WHERE id = $4`,
		req.Status, req.MeetupLocationID, req.Notes, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
}

func deleteOrder(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ctx := context.Background()
	_, err := db.Exec(ctx, `DELETE FROM orders WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

func getNextOrderCode(c *gin.Context) {
	code, err := generateOrderCode(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"order_code": code})
}

// Payment handlers
func listPayments(c *gin.Context) {
	ctx := context.Background()
	rows, err := db.Query(ctx, `
		SELECT p.id, p.order_id, p.amount, p.method, p.status, p.transaction_ref, p.created_at
		FROM payments p
		ORDER BY p.created_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var items []Payment
	for rows.Next() {
		var p Payment
		rows.Scan(&p.ID, &p.OrderID, &p.Amount, &p.Method, &p.Status, &p.TransactionRef, &p.CreatedAt)
		items = append(items, p)
	}
	c.JSON(http.StatusOK, items)
}

func createPayment(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := context.Background()
	var id int
	err := db.QueryRow(ctx, `
		INSERT INTO payments (order_id, amount, method, status, transaction_ref)
		VALUES ($1, $2, $3, 'pending', $4)
		RETURNING id`,
		req.OrderID, req.Amount, req.Method, req.TransactionRef).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func updatePaymentStatus(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := context.Background()
	_, err := db.Exec(ctx, `UPDATE payments SET status = $1 WHERE id = $2`, req.Status, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
}

// Stats
func getStats(c *gin.Context) {
	ctx := context.Background()
	var totalEvidence int
	var totalValue, avgPurity, totalWeight float64
	var totalOrders, pendingOrders, totalCustomers, activeCustomers int
	var revenue float64

	db.QueryRow(ctx, `SELECT COUNT(*) FROM evidence`).Scan(&totalEvidence)
	db.QueryRow(ctx, `SELECT COALESCE(SUM(street_value), 0) FROM evidence`).Scan(&totalValue)
	db.QueryRow(ctx, `SELECT COALESCE(AVG(purity_percent), 0) FROM evidence WHERE purity_percent > 0`).Scan(&avgPurity)
	db.QueryRow(ctx, `SELECT COALESCE(SUM(weight_grams), 0) FROM evidence WHERE weight_grams > 0`).Scan(&totalWeight)
	db.QueryRow(ctx, `SELECT COUNT(*) FROM orders`).Scan(&totalOrders)
	db.QueryRow(ctx, `SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'confirmed', 'in_transit')`).Scan(&pendingOrders)
	db.QueryRow(ctx, `SELECT COUNT(*) FROM customers`).Scan(&totalCustomers)
	db.QueryRow(ctx, `SELECT COUNT(*) FROM customers WHERE status = 'active'`).Scan(&activeCustomers)
	db.QueryRow(ctx, `SELECT COALESCE(SUM(total_value), 0) FROM orders WHERE status = 'delivered'`).Scan(&revenue)

	c.JSON(http.StatusOK, StatsResponse{
		TotalEvidence:   totalEvidence,
		TotalValue:      totalValue,
		AvgPurity:       int(avgPurity),
		TotalWeight:     totalWeight,
		TotalOrders:     totalOrders,
		PendingOrders:   pendingOrders,
		TotalCustomers:  totalCustomers,
		ActiveCustomers: activeCustomers,
		Revenue:         revenue,
	})
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "alive", "gang": "Heisenberg", "time": time.Now().Unix()})
}

// Public-facing customers request DTO
type PublicCustomerRequest struct {
	Codename   string `json:"codename" binding:"required"`
	RealName   string `json:"real_name"`
	Contact    string `json:"contact"`
	Territory  string `json:"territory"`
}

type PublicOrderRequest struct {
	CustomerID       *int                           `json:"customer_id"`
	NewCustomer      *PublicCustomerRequest         `json:"new_customer"`
	MeetupLocationID *int                           `json:"meetup_location_id"`
	Notes            string                         `json:"notes"`
	Items            []PublicOrderItemRequest       `json:"items" binding:"required"`
}

type PublicOrderItemRequest struct {
	EvidenceID int64   `json:"evidence_id" binding:"required"`
	Quantity   float64 `json:"quantity" binding:"required"`
	UnitPrice  float64 `json:"unit_price" binding:"required"`
}

// Public product view DTO (no internal fields)
type PublicProduct struct {
	ID           int64    `json:"id"`
	Code         string   `json:"code"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	TypeName     string   `json:"type_name"`
	WeightGrams  float64  `json:"weight_grams"`
	Purity       float64  `json:"purity_percent"`
	StreetValue  float64  `json:"street_value"`
	ImageURL     string   `json:"image_url"`
	Status       string   `json:"status"`
	LocationName *string  `json:"location_name"`
}

type PublicProductDetail struct {
	PublicProduct
	Tags        []string  `json:"tags"`
	LocationID  *int      `json:"location_id"`
	Lat         *float64  `json:"lat"`
	Lng         *float64  `json:"lng"`
	Address     *string   `json:"address"`
}

type PublicOrder struct {
	OrderCode    string              `json:"order_code"`
	Status       string              `json:"status"`
	TotalValue   float64             `json:"total_value"`
	Customer     string              `json:"customer"`
	MeetupName   *string             `json:"meetup_name"`
	CreatedAt    string              `json:"created_at"`
	Items        []PublicOrderItem   `json:"items"`
}

type PublicOrderItem struct {
	Title       string  `json:"title"`
	EvidenceCode string `json:"evidence_code"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64  `json:"unit_price"`
	TotalPrice  float64  `json:"total_price"`
}

// Public shop handlers (no auth required)

// GET /shop/products
func listPublicProducts(c *gin.Context) {
	ctx := c.Request.Context()
	rows, err := db.Query(ctx, `
		SELECT e.id, e.code, e.title, e.description,
		       COALESCE(et.name, 'Unclassified'),
		       e.weight_grams, e.purity_percent, e.street_value,
		       e.image_url, e.status,
		       l.name
		FROM evidence e
		LEFT JOIN evidence_types et ON e.type_id = et.id
		LEFT JOIN locations l ON e.location_id = l.id
		WHERE e.status = 'stored'
		ORDER BY e.created_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var items []PublicProduct
	for rows.Next() {
		var p PublicProduct
		var locName *string
		if err := rows.Scan(&p.ID, &p.Code, &p.Title, &p.Description,
			&p.TypeName, &p.WeightGrams, &p.Purity, &p.StreetValue,
			&p.ImageURL, &p.Status, &locName); err != nil {
			continue
		}
		if locName != nil {
			p.LocationName = locName
		}
		items = append(items, p)
	}
	c.JSON(http.StatusOK, items)
}

// GET /shop/products/:id
func getPublicProduct(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ctx := c.Request.Context()

	var p PublicProductDetail
	var locName, locAddr *string
	var lat, lng *float64
	var locID *int
	err := db.QueryRow(ctx, `
		SELECT e.id, e.code, e.title, e.description,
		       COALESCE(et.name, 'Unclassified'),
		       e.weight_grams, e.purity_percent, e.street_value,
		       e.image_url, e.status,
		       l.id, l.name, l.address, l.lat, l.lng
		FROM evidence e
		LEFT JOIN evidence_types et ON e.type_id = et.id
		LEFT JOIN locations l ON e.location_id = l.id
		WHERE e.id = $1 AND e.status = 'stored'`, id).Scan(
		&p.ID, &p.Code, &p.Title, &p.Description,
		&p.TypeName, &p.WeightGrams, &p.Purity, &p.StreetValue,
		&p.ImageURL, &p.Status,
		&locID, &locName, &locAddr, &lat, &lng,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	if locName != nil {
		p.LocationName = locName
	}
	if locAddr != nil {
		p.Address = locAddr
	}
	if locID != nil {
		p.LocationID = locID
	}
	if lat != nil {
		p.Lat = lat
	}
	if lng != nil {
		p.Lng = lng
	}

	var tags []string
	tagRows, err := db.Query(ctx, `SELECT unnest(e.tags) FROM evidence e WHERE e.id = $1`, id)
	if err == nil {
		for tagRows.Next() {
			var t string
			tagRows.Scan(&t)
			tags = append(tags, t)
		}
		tagRows.Close()
	}
	p.Tags = tags

	c.JSON(http.StatusOK, p)
}

// GET /shop/orders/track/:code
func getPublicOrderByCode(c *gin.Context) {
	code := c.Param("code")
	ctx := c.Request.Context()

	var o PublicOrder
	var custName string
	var locID *int
	var locName *string
	err := db.QueryRow(ctx, `
		SELECT o.order_code, o.status, o.total_value,
		       COALESCE(c.codename, 'Walk-in'),
		       o.created_at,
		       o.meetup_location_id, l.name
		FROM orders o
		LEFT JOIN customers c ON o.customer_id = c.id
		LEFT JOIN locations l ON o.meetup_location_id = l.id
		WHERE o.order_code = $1
		LIMIT 1`, code).Scan(
		&o.OrderCode, &o.Status, &o.TotalValue,
		&custName, &o.CreatedAt,
		&locID, &locName,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	o.Customer = custName
	if locName != nil {
		o.MeetupName = locName
	}

	itemRows, err := db.Query(ctx, `
		SELECT e.code, e.title, oi.quantity, oi.unit_price, oi.total_price
		FROM order_items oi
		LEFT JOIN evidence e ON oi.evidence_id = e.id
		WHERE oi.order_id = (
			SELECT id FROM orders WHERE order_code = $1 LIMIT 1
		)`, code)
	if err == nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var it PublicOrderItem
			itemRows.Scan(&it.EvidenceCode, &it.Title, &it.Quantity, &it.UnitPrice, &it.TotalPrice)
			o.Items = append(o.Items, it)
		}
	}

	c.JSON(http.StatusOK, o)
}

// POST /shop/orders
func createPublicOrder(c *gin.Context) {
	var req PublicOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := c.Request.Context()

	if getSettingBool(ctx, "maintenance_mode", false) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "shop is in maintenance mode"})
		return
	}

	if getSettingBool(ctx, "require_dropoff", true) && req.MeetupLocationID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "drop-off location required"})
		return
	}

	if req.NewCustomer != nil && req.NewCustomer.Codename != "" {
		if req.CustomerID != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "provide either customer_id or new_customer, not both"})
			return
		}
		var id int
		err := db.QueryRow(ctx, `
			INSERT INTO customers (codename, real_name, contact, territory, status)
			VALUES ($1, $2, $3, $4, 'active')
			ON CONFLICT (codename) DO UPDATE SET contact = EXCLUDED.contact
			RETURNING id`,
			req.NewCustomer.Codename, req.NewCustomer.RealName,
			req.NewCustomer.Contact, req.NewCustomer.Territory).Scan(&id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		req.CustomerID = &id
	}

	if req.CustomerID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "customer_id or new_customer required"})
		return
	}

	orderCode, err := generateOrderCode(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	notes := req.Notes
	if req.NewCustomer != nil {
		if notes == "" {
			notes = "New walk-in: " + req.NewCustomer.Codename
		} else {
			notes = "New walk-in: " + req.NewCustomer.Codename + " | " + notes
		}
	}

	var total float64
	for _, item := range req.Items {
		total += item.Quantity * item.UnitPrice
	}

	var meetup *int
	if req.MeetupLocationID != nil {
		meetup = req.MeetupLocationID
	}

	var orderID int
	err = db.QueryRow(ctx, `
		INSERT INTO orders (order_code, customer_id, status, total_value, meetup_location_id, notes)
		VALUES ($1, $2, 'pending', $3, $4, $5)
		RETURNING id`,
		orderCode, *req.CustomerID, total, meetup, notes).Scan(&orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, item := range req.Items {
		_, err = db.Exec(ctx, `
			INSERT INTO order_items (order_id, evidence_id, quantity, unit_price, total_price)
			VALUES ($1, $2, $3, $4, $5)`,
			orderID, int(item.EvidenceID), item.Quantity, item.UnitPrice, item.Quantity*item.UnitPrice)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":          orderID,
		"order_code":  orderCode,
		"total_value": total,
	})
}

// POST /shop/customers
func createPublicCustomer(c *gin.Context) {
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Status == "" {
		req.Status = "active"
	}
	ctx := c.Request.Context()
	var id int
	err := db.QueryRow(ctx, `
		INSERT INTO customers (codename, real_name, contact, territory, trust_level, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		req.Codename, req.RealName, req.Contact, req.Territory, req.TrustLevel, req.Status).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// GET /shop/locations
func listPublicLocations(c *gin.Context) {
	ctx := c.Request.Context()
	rows, err := db.Query(ctx, `
		SELECT id, name, address,
		       COALESCE(lat, 34.5197), COALESCE(lng, -106.8106),
		       type, status, notes
		FROM locations
		WHERE status IN ('active', 'abandoned')
		ORDER BY name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type PublicLocation struct {
		ID       int     `json:"id"`
		Name     string  `json:"name"`
		Address  string  `json:"address"`
		Lat      float64 `json:"lat"`
		Lng      float64 `json:"lng"`
		Type     string  `json:"type"`
		Status   string  `json:"status"`
		Notes    string  `json:"notes"`
	}

	var items []PublicLocation
	for rows.Next() {
		var l PublicLocation
		if err := rows.Scan(&l.ID, &l.Name, &l.Address,
			&l.Lat, &l.Lng, &l.Type, &l.Status, &l.Notes); err != nil {
			continue
		}
		items = append(items, l)
	}
	c.JSON(http.StatusOK, items)
}
