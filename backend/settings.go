package main

import (
	"context"
	"strconv"
)

type PlatformSettings struct {
	ShopName           string `json:"shop_name"`
	DefaultTerritory   string `json:"default_territory"`
	OrderCodePrefix    string `json:"order_code_prefix"`
	RequireDropoff     bool   `json:"require_dropoff"`
	MaintenanceMode    bool   `json:"maintenance_mode"`
	ShopWelcomeMessage string `json:"shop_welcome_message"`
}

func defaultPlatformSettings() PlatformSettings {
	return PlatformSettings{
		ShopName:           "The Shop",
		DefaultTerritory:   "Albuquerque",
		OrderCodePrefix:    "ORD",
		RequireDropoff:     true,
		MaintenanceMode:    false,
		ShopWelcomeMessage: "Browse available product. Buyer discretion advised.",
	}
}

func getPlatformSettings(ctx context.Context) (PlatformSettings, error) {
	settings := defaultPlatformSettings()
	rows, err := db.Query(ctx, `SELECT key, value FROM platform_settings`)
	if err != nil {
		return settings, err
	}
	defer rows.Close()

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		switch key {
		case "shop_name":
			settings.ShopName = value
		case "default_territory":
			settings.DefaultTerritory = value
		case "order_code_prefix":
			settings.OrderCodePrefix = value
		case "require_dropoff":
			settings.RequireDropoff = value == "true"
		case "maintenance_mode":
			settings.MaintenanceMode = value == "true"
		case "shop_welcome_message":
			settings.ShopWelcomeMessage = value
		}
	}
	return settings, nil
}

func savePlatformSettings(ctx context.Context, settings PlatformSettings) error {
	entries := map[string]string{
		"shop_name":            settings.ShopName,
		"default_territory":    settings.DefaultTerritory,
		"order_code_prefix":    settings.OrderCodePrefix,
		"require_dropoff":      strconv.FormatBool(settings.RequireDropoff),
		"maintenance_mode":     strconv.FormatBool(settings.MaintenanceMode),
		"shop_welcome_message": settings.ShopWelcomeMessage,
	}
	for key, value := range entries {
		_, err := db.Exec(ctx, `
			INSERT INTO platform_settings (key, value, updated_at)
			VALUES ($1, $2, NOW())
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
			key, value)
		if err != nil {
			return err
		}
	}
	return nil
}

func getSettingBool(ctx context.Context, key string, fallback bool) bool {
	var value string
	err := db.QueryRow(ctx, `SELECT value FROM platform_settings WHERE key = $1`, key).Scan(&value)
	if err != nil {
		return fallback
	}
	return value == "true"
}
