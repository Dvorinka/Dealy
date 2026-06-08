package main

import (
	"context"
	"fmt"
	"time"
)

func generateOrderCode(ctx context.Context) (string, error) {
	year := time.Now().Year()
	prefix := fmt.Sprintf("ORD-%d-", year)
	var maxNum int
	err := db.QueryRow(ctx, `
		SELECT COALESCE(MAX(
			CASE WHEN order_code ~ ('^' || $1 || '[0-9]+$')
			THEN CAST(SUBSTRING(order_code FROM LENGTH($1) + 1) AS INT) ELSE 0 END
		), 0) FROM orders`, prefix).Scan(&maxNum)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%05d", prefix, maxNum+1), nil
}

func insertCustomer(ctx context.Context, req CreateCustomerRequest) (int, error) {
	if req.Status == "" {
		req.Status = "active"
	}
	if req.TrustLevel == 0 {
		req.TrustLevel = 3
	}
	var id int
	err := db.QueryRow(ctx, `
		INSERT INTO customers (codename, real_name, contact, territory, trust_level, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		req.Codename, req.RealName, req.Contact, req.Territory, req.TrustLevel, req.Status).Scan(&id)
	return id, err
}

func insertOrderWithItems(ctx context.Context, orderCode string, customerID int, meetupID *int, notes string, items []CreateOrderItem) (int, float64, error) {
	var total float64
	for _, item := range items {
		total += item.Quantity * item.UnitPrice
	}
	var orderID int
	err := db.QueryRow(ctx, `
		INSERT INTO orders (order_code, customer_id, status, total_value, meetup_location_id, notes)
		VALUES ($1, $2, 'pending', $3, $4, $5)
		RETURNING id`,
		orderCode, customerID, total, meetupID, notes).Scan(&orderID)
	if err != nil {
		return 0, 0, err
	}
	for _, item := range items {
		_, err = db.Exec(ctx, `
			INSERT INTO order_items (order_id, evidence_id, quantity, unit_price, total_price)
			VALUES ($1, $2, $3, $4, $5)`,
			orderID, item.EvidenceID, item.Quantity, item.UnitPrice, item.Quantity*item.UnitPrice)
		if err != nil {
			return 0, 0, err
		}
	}
	return orderID, total, nil
}
