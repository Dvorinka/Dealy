package main

import "time"

type EvidenceType struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	DangerLevel int       `json:"danger_level"`
	CreatedAt   time.Time `json:"created_at"`
}

type Location struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	Type      string    `json:"type"`
	Status    string    `json:"status"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
}

type GangMember struct {
	ID         int       `json:"id"`
	Codename   string    `json:"codename"`
	RealName   string    `json:"real_name"`
	Role       string    `json:"role"`
	Status     string    `json:"status"`
	TrustLevel int       `json:"trust_level"`
	CreatedAt  time.Time `json:"created_at"`
}

type Evidence struct {
	ID            int       `json:"id"`
	Code          string    `json:"code"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	TypeID        int       `json:"type_id"`
	TypeName      string    `json:"type_name,omitempty"`
	LocationID    *int      `json:"location_id,omitempty"`
	LocationName  string    `json:"location_name,omitempty"`
	CollectedBy   *int      `json:"collected_by,omitempty"`
	CollectorName string    `json:"collector_name,omitempty"`
	WeightGrams   float64   `json:"weight_grams"`
	PurityPercent float64   `json:"purity_percent"`
	StreetValue   float64   `json:"street_value"`
	ImageURL      string    `json:"image_url"`
	Status        string    `json:"status"`
	Tags          []string  `json:"tags"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateEvidenceRequest struct {
	Code          string   `json:"code" binding:"required"`
	Title         string   `json:"title" binding:"required"`
	Description   string   `json:"description"`
	TypeID        int      `json:"type_id" binding:"required"`
	LocationID    *int     `json:"location_id"`
	CollectedBy   *int     `json:"collected_by"`
	WeightGrams   float64  `json:"weight_grams"`
	PurityPercent float64  `json:"purity_percent"`
	StreetValue   float64  `json:"street_value"`
	ImageURL      string   `json:"image_url"`
	Status        string   `json:"status"`
	Tags          []string `json:"tags"`
}

type UpdateEvidenceRequest struct {
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	TypeID        int      `json:"type_id"`
	LocationID    *int     `json:"location_id"`
	CollectedBy   *int     `json:"collected_by"`
	WeightGrams   float64  `json:"weight_grams"`
	PurityPercent float64  `json:"purity_percent"`
	StreetValue   float64  `json:"street_value"`
	ImageURL      string   `json:"image_url"`
	Status        string   `json:"status"`
	Tags          []string `json:"tags"`
}

// User models
type User struct {
	ID        int       `json:"id"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token   string `json:"token"`
	User    User   `json:"user"`
	Message string `json:"message"`
}

// Customer models
type Customer struct {
	ID         int       `json:"id"`
	Codename   string    `json:"codename"`
	RealName   string    `json:"real_name"`
	Contact    string    `json:"contact"`
	Territory  string    `json:"territory"`
	TrustLevel int       `json:"trust_level"`
	Status     string    `json:"status"`
	TotalSpent float64   `json:"total_spent"`
	CreatedAt  time.Time `json:"created_at"`
	OrderCount int       `json:"order_count,omitempty"`
}

type CreateCustomerRequest struct {
	Codename   string `json:"codename" binding:"required"`
	RealName   string `json:"real_name"`
	Contact    string `json:"contact"`
	Territory  string `json:"territory"`
	TrustLevel int    `json:"trust_level"`
	Status     string `json:"status"`
}

// Order models
type Order struct {
	ID               int         `json:"id"`
	OrderCode        string      `json:"order_code"`
	CustomerID       int         `json:"customer_id"`
	CustomerCodename string      `json:"customer_codename,omitempty"`
	Status           string      `json:"status"`
	TotalValue       float64     `json:"total_value"`
	MeetupLocationID *int        `json:"meetup_location_id,omitempty"`
	MeetupName       string      `json:"meetup_name,omitempty"`
	Notes            string      `json:"notes"`
	Items            []OrderItem `json:"items,omitempty"`
	Payment          *Payment    `json:"payment,omitempty"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
}

type OrderItem struct {
	ID            int       `json:"id"`
	OrderID       int       `json:"order_id"`
	EvidenceID    int       `json:"evidence_id"`
	EvidenceCode  string    `json:"evidence_code,omitempty"`
	EvidenceTitle string    `json:"evidence_title,omitempty"`
	Quantity      float64   `json:"quantity"`
	UnitPrice     float64   `json:"unit_price"`
	TotalPrice    float64   `json:"total_price"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateOrderRequest struct {
	OrderCode        string                 `json:"order_code"`
	CustomerID       int                    `json:"customer_id"`
	NewCustomer      *CreateCustomerRequest `json:"new_customer"`
	MeetupLocationID *int                   `json:"meetup_location_id"`
	Notes            string                 `json:"notes"`
	Items            []CreateOrderItem      `json:"items" binding:"required"`
}

type ShopOrderRequest struct {
	Customer         CreateCustomerRequest `json:"customer" binding:"required"`
	MeetupLocationID *int                  `json:"meetup_location_id"`
	Notes            string                `json:"notes"`
	Items            []CreateOrderItem     `json:"items" binding:"required"`
}

type ShopOrderResponse struct {
	OrderID   int     `json:"order_id"`
	OrderCode string  `json:"order_code"`
	Total     float64 `json:"total_value"`
	Message   string  `json:"message"`
}

type OrderCodeResponse struct {
	OrderCode string `json:"order_code"`
}

type CreateOrderItem struct {
	EvidenceID int     `json:"evidence_id" binding:"required"`
	Quantity   float64 `json:"quantity" binding:"required"`
	UnitPrice  float64 `json:"unit_price" binding:"required"`
}

type UpdateOrderRequest struct {
	Status           string `json:"status"`
	MeetupLocationID *int   `json:"meetup_location_id"`
	Notes            string `json:"notes"`
}

// Payment models
type Payment struct {
	ID             int       `json:"id"`
	OrderID        int       `json:"order_id"`
	Amount         float64   `json:"amount"`
	Method         string    `json:"method"`
	Status         string    `json:"status"`
	TransactionRef string    `json:"transaction_ref"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreatePaymentRequest struct {
	OrderID        int     `json:"order_id" binding:"required"`
	Amount         float64 `json:"amount" binding:"required"`
	Method         string  `json:"method" binding:"required"`
	TransactionRef string  `json:"transaction_ref"`
}

// Stats
type StatsResponse struct {
	TotalEvidence   int     `json:"total_evidence"`
	TotalValue      float64 `json:"total_value"`
	AvgPurity       int     `json:"avg_purity"`
	TotalWeight     float64 `json:"total_weight"`
	TotalOrders     int     `json:"total_orders"`
	PendingOrders   int     `json:"pending_orders"`
	TotalCustomers  int     `json:"total_customers"`
	ActiveCustomers int     `json:"active_customers"`
	Revenue         float64 `json:"revenue"`
}
