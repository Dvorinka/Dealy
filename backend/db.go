package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func initDB() *pgxpool.Pool {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://heisenberg:blue_meth@localhost:5432/evidence?sslmode=disable"
	}

	var err error
	for i := 0; i < 10; i++ {
		db, err = pgxpool.New(context.Background(), dsn)
		if err == nil {
			if err = db.Ping(context.Background()); err == nil {
				log.Println("Connected to database")
				return db
			}
		}
		log.Printf("DB connection attempt %d failed: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	log.Fatalf("Failed to connect to database: %v", err)
	return nil
}

func runMigrations(db *pgxpool.Pool) {
	ctx := context.Background()
	schema := `
CREATE TABLE IF NOT EXISTS evidence_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    danger_level INT CHECK (danger_level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    lat NUMERIC(10,8),
    lng NUMERIC(11,8),
    type VARCHAR(50) CHECK (type IN ('lab', 'stash', 'dead_drop', 'safe_house', 'meeting_spot')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'busted', 'abandoned')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gang_members (
    id SERIAL PRIMARY KEY,
    codename VARCHAR(100) NOT NULL UNIQUE,
    real_name VARCHAR(200),
    role VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'incarcerated', 'deceased', 'missing')),
    trust_level INT CHECK (trust_level BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type_id INT REFERENCES evidence_types(id),
    location_id INT REFERENCES locations(id),
    collected_by INT REFERENCES gang_members(id),
    weight_grams NUMERIC(12,4),
    purity_percent NUMERIC(5,2),
    street_value NUMERIC(15,2),
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'stored' CHECK (status IN ('stored', 'in_transit', 'disposed', 'seized')),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'dealer' CHECK (role IN ('admin', 'cook', 'dealer', ' lookout')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'burned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    codename VARCHAR(100) NOT NULL UNIQUE,
    real_name VARCHAR(200),
    contact VARCHAR(255),
    territory VARCHAR(100),
    trust_level INT CHECK (trust_level BETWEEN 1 AND 10),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'burned', 'deceased')),
    total_spent NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled', 'busted')),
    total_value NUMERIC(15,2) DEFAULT 0,
    meetup_location_id INT REFERENCES locations(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    evidence_id INT REFERENCES evidence(id),
    quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    method VARCHAR(50) CHECK (method IN ('cash', 'crypto', 'wire', 'barter')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'flagged')),
    transaction_ref VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`
	_, err := db.Exec(ctx, schema)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Migrations applied")

	seedData(db)
}

func seedData(db *pgxpool.Pool) {
	ctx := context.Background()

	// Seed evidence types
	types := []struct {
		name, desc, icon string
		danger           int
	}{
		{"Crystal Meth", "Blue sky. 99.1% purity. Heisenberg signature.", "flask", 5},
		{"Precursor Chemicals", "Methylamine, phenylacetic acid, and other lab supplies.", "beaker", 4},
		{"Lab Equipment", "Gas masks, flasks, heating mantles, and RV parts.", "gear", 3},
		{"Distribution Records", "Ledger books, dead drop coordinates, client lists.", "scroll", 2},
		{"Cash Reserves", "Unmarked bills in vacuum-sealed bags.", "money", 3},
		{"Weapons", "Firearms, ammo, and self-defense tools.", "crosshair", 4},
		{"Surveillance", "Audio bugs, cameras, and tracking devices.", "eye", 2},
		{"Documents", "Fake IDs, property deeds, shell company papers.", "file", 2},
	}
	for _, t := range types {
		db.Exec(ctx, `
			INSERT INTO evidence_types (name, description, icon, danger_level)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (name) DO NOTHING`,
			t.name, t.desc, t.icon, t.danger)
	}

	// Seed locations
	locs := []struct {
		name, address, ltype, status, notes string
		lat, lng                            float64
	}{
		{"The Superlab", "Industrial laundry, Los Pollos Hermanos", "lab", "active", "Underground. Gus Fring operation.", 35.0844, -106.6504},
		{"Jesse's House", "9809 Margo Street, Albuquerque", "stash", "active", "Basement stash. Pinkman residence.", 35.1107, -106.6090},
		{"Vamonos Pest", "Warehouse district, south of downtown", "safe_house", "active", "Tented houses used as mobile labs.", 35.0584, -106.6805},
		{"To'hajiilee", "Navajo reservation, 40 miles west", "dead_drop", "active", "Buried barrels. GPS: 35.123, -107.234", 35.1230, -107.2340},
		{"Saul's Office", "Suite 700, 9800 Montgomery Blvd NE", "meeting_spot", "active", "Better Call Saul! Vacuum store nearby.", 35.1109, -106.5255},
		{"The Car Wash", "1 A1A Car Wash, Albuquerque", "safe_house", "active", "Legit business front. A1A.", 35.1478, -106.5250},
		{"Jack's Compound", "Neo-Nazi compound, desert outskirts", "lab", "busted", "Declan massacre site. Stay away.", 35.2400, -106.7000},
		{"Desert Shack", "Old abandoned shack, northern desert", "stash", "abandoned", "Todd's stash. Tarantula country.", 35.3000, -106.8000},
		{"Los Pollos Warehouse", "Industrial district, south side", "meeting_spot", "active", "Chicken distribution center.", 35.0721, -106.6625},
		{"Tuco HQ", "1223 Jefferson Street NE", "stash", "busted", "Tuco's trap house. Heavily fortified.", 35.0998, -106.5870},
	}
	for _, l := range locs {
		db.Exec(ctx, `
			INSERT INTO locations (name, address, type, status, notes, lat, lng)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT DO NOTHING`,
			l.name, l.address, l.ltype, l.status, l.notes, l.lat, l.lng)
	}

	// Seed gang members
	members := []struct {
		codename, realName, role, status string
		trust                            int
	}{
		{"Heisenberg", "Walter White", "The Cook", "active", 10},
		{"Capn Cook", "Jesse Pinkman", "Cook / Distribution", "active", 8},
		{"Saul Goodman", "Jimmy McGill", "Legal / Fixer", "active", 7},
		{"The Cleaner", "Mike Ehrmantraut", "Security / Logistics", "active", 9},
		{"Gus", "Gustavo Fring", "Distribution Kingpin", "deceased", 10},
		{"Tuco", "Tuco Salamanca", "Enforcer", "deceased", 3},
		{"Skyler", "Skyler White", "Bookkeeper", "active", 6},
		{"Badger", "Brandon Mayhew", "Street Dealer", "active", 4},
		{"Skinny Pete", "Peter", "Street Dealer", "active", 5},
		{"Hank", "Henry Schrader", "DEA Agent (cover)", "deceased", 1},
	}
	for _, m := range members {
		db.Exec(ctx, `
			INSERT INTO gang_members (codename, real_name, role, status, trust_level)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (codename) DO NOTHING`,
			m.codename, m.realName, m.role, m.status, m.trust)
	}

	// Seed evidence items (image_url uses Kenney CC0 pixel sprites)
	items := [][]interface{}{
		{"HE-001", "Batch #1 - Blue Sky", "First cook using new methylamine. 99.1% pure.", 1, 1, 2, 1000.0, 99.1, 250000.0, "stored", []string{"priority", "cook"}, "/assets/pixel/tiles/flask.png"},
		{"HE-002", "Methylamine Barrel", "Stolen from warehouse. Full 55-gallon drum.", 2, 2, 4, 200000.0, 0.0, 50000.0, "stored", []string{"chemical", "stolen"}, "/assets/pixel/tiles/barrel.png"},
		{"HE-003", "Distribution Ledger Q3", "Client list with weights and drop locations.", 4, 3, 5, 0.0, 0.0, 0.0, "stored", []string{"records", "confidential"}, "/assets/pixel/tiles/document.png"},
		{"HE-004", "Cash Stash - Vacuum Sealed", "$125k in mixed bills. Jesse's basement.", 5, 2, 2, 0.0, 0.0, 125000.0, "stored", []string{"cash", "pinkman"}, "/assets/pixel/tiles/coin.png"},
		{"HE-005", "Burner Phone Collection", "12 Nokia 3210s with contact lists.", 7, 5, 3, 0.0, 0.0, 1200.0, "in_transit", []string{"comms", "disposable"}, "/assets/pixel/characters/lookout.png"},
		{"HE-006", "Lab Hazmat Suits", "3 Tyvek suits used in superlab.", 3, 1, 2, 0.0, 0.0, 0.0, "stored", []string{"ppe", "contaminated"}, "/assets/pixel/tiles/crate.png"},
		{"HE-007", "Tortuga's Head", "DEA warning. Explosive device attached.", 8, 6, 1, 0.0, 0.0, 0.0, "disposed", []string{"warning", "cartel"}, "/assets/pixel/characters/enforcer.png"},
		{"HE-008", "Ricin Cigarette", "Sealed in drywall screw. Untraceable.", 1, 3, 1, 0.0, 0.0, 0.0, "stored", []string{"poison", "insurance"}, "/assets/pixel/tiles/key.png"},
		{"HE-009", "Blue Batch #44", "Recent cook. 98.7% purity. 500g.", 1, 1, 2, 500.0, 98.7, 125000.0, "stored", []string{"priority", "fresh"}, "/assets/pixel/tiles/flask.png"},
		{"HE-010", "Hydrofluoric Acid Jug", "Plastic jug from hardware store. 2 gallons.", 2, 1, 2, 7600.0, 0.0, 500.0, "in_transit", []string{"acid", "disposal"}, "/assets/pixel/tiles/barrel.png"},
		{"HE-011", "Desert RV Cook Kit", "Portable lab setup from the old Winnebago.", 3, 8, 2, 0.0, 0.0, 15000.0, "stored", []string{"mobile", "legacy"}, "/assets/pixel/tiles/crate.png"},
		{"HE-012", "Glock 19 + Ammo", "Mike's backup piece. Serial filed off.", 6, 4, 4, 900.0, 0.0, 2500.0, "stored", []string{"weapons", "security"}, "/assets/pixel/tiles/key.png"},
		{"HE-013", "Shell Company Papers", "Los Pollos Hermanos subsidiary filings.", 8, 9, 5, 0.0, 0.0, 0.0, "stored", []string{"legal", "front"}, "/assets/pixel/tiles/document.png"},
		{"HE-014", "Blue Batch #52", "Superlab run. 99.4% — best yet.", 1, 1, 1, 2000.0, 99.4, 500000.0, "stored", []string{"priority", "heisenberg"}, "/assets/pixel/tiles/flask.png"},
		{"HE-015", "Wire Tap Kit", "DEA-grade surveillance gear. Handle with care.", 7, 6, 4, 0.0, 0.0, 8000.0, "seized", []string{"surveillance", "hot"}, "/assets/pixel/characters/lookout.png"},
	}
	for _, item := range items {
		locationID, _ := item[4].(int)
		collectedBy, _ := item[5].(int)
		db.Exec(ctx, `
			INSERT INTO evidence (code, title, description, type_id, location_id, collected_by, weight_grams, purity_percent, street_value, status, tags, image_url)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (code) DO UPDATE SET image_url = EXCLUDED.image_url`,
			item[0], item[1], item[2], item[3], locationID, collectedBy, item[6], item[7], item[8], item[9], item[10], item[11])
	}

	// Seed users (demo login)
	users := []struct {
		username, passwordHash, role, status string
	}{
		{"heisenberg", "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad52L2f7j0n0JyW", "admin", "active"},
		{"jesse", "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad52L2f7j0n0JyW", "cook", "active"},
		{"mike", "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad52L2f7j0n0JyW", "dealer", "active"},
	}
	for _, u := range users {
		db.Exec(ctx, `
			INSERT INTO users (username, password_hash, role, status)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (username) DO NOTHING`,
			u.username, u.passwordHash, u.role, u.status)
	}

	// Seed customers
	customers := []struct {
		codename, realName, contact, territory, status string
		trust                                          int
		spent                                          float64
	}{
		{"Tweaker Tom", "Thomas", "505-555-0101", "Northeast Heights", "active", 3, 45000},
		{"Chem Class", "Badger", "505-555-0102", "University Area", "active", 5, 28000},
		{"Los Pollos", "Gus", "505-555-0199", "South Valley", "deceased", 10, 850000},
		{"The Twins", "Marco & Leonel", "unknown", "Mexico", "deceased", 2, 0},
		{"Combo", "Christian", "505-555-0103", "Westside", "deceased", 4, 15000},
		{"Declan", "Declan", "505-555-0104", "Phoenix", "deceased", 6, 320000},
		{"Spooge", "Spooge", "505-555-0105", "Downtown", "deceased", 1, 3000},
		{"Skinny", "Peter", "505-555-0106", "North Valley", "active", 5, 42000},
		{"Tuco", "Tuco Salamanca", "505-555-0107", "South Valley", "deceased", 2, 67000},
		{"Krazy-8", "Domingo", "505-555-0108", "Northeast", "deceased", 3, 12000},
	}
	for _, c := range customers {
		db.Exec(ctx, `
			INSERT INTO customers (codename, real_name, contact, territory, trust_level, status, total_spent)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (codename) DO NOTHING`,
			c.codename, c.realName, c.contact, c.territory, c.trust, c.status, c.spent)
	}

	// Seed orders
	orders := []struct {
		code       string
		customerID int
		status     string
		value      float64
		locationID int
		notes      string
	}{
		{"ORD-001", 3, "delivered", 250000.0, 1, "Superlab delivery. Gus picked up personally."},
		{"ORD-002", 1, "delivered", 45000.0, 2, "Jesse dropped at Margo Street."},
		{"ORD-003", 8, "in_transit", 18000.0, 9, "Heading to Los Pollos warehouse."},
		{"ORD-004", 5, "cancelled", 0.0, 4, "Combo got popped. Cancel immediately."},
		{"ORD-005", 2, "pending", 32000.0, 3, "Badger wants two batches. Vamonos meet."},
		{"ORD-006", 9, "busted", 0.0, 10, "DEA raid during exchange. Tuco escaped."},
		{"ORD-007", 1, "confirmed", 22000.0, 5, "Tweaker Tom. Saul's office meet. Legal cover."},
		{"ORD-008", 7, "delivered", 8000.0, 2, "Spooge paid in stolen electronics."},
	}
	for _, o := range orders {
		var id int
		err := db.QueryRow(ctx, `
			INSERT INTO orders (order_code, customer_id, status, total_value, meetup_location_id, notes)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (order_code) DO NOTHING
			RETURNING id`,
			o.code, o.customerID, o.status, o.value, o.locationID, o.notes).Scan(&id)
		if err != nil || id == 0 {
			continue
		}
	}

	// Seed payments
	payments := []struct {
		orderID int
		amount  float64
		method  string
		status  string
		ref     string
	}{
		{1, 250000.0, "cash", "completed", "CASH-SUPERLAB-001"},
		{2, 45000.0, "crypto", "completed", "BTC-1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"},
		{7, 22000.0, "cash", "pending", "CASH-SAUL-007"},
		{8, 8000.0, "barter", "completed", "ELECTRONICS-SPOOGE-008"},
	}
	for _, p := range payments {
		db.Exec(ctx, `
			INSERT INTO payments (order_id, amount, method, status, transaction_ref)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT DO NOTHING`,
			p.orderID, p.amount, p.method, p.status, p.ref)
	}

	// Seed order line items (lookup order + evidence IDs by code)
	orderItems := []struct {
		orderCode   string
		evidenceCode string
		qty         float64
		unitPrice   float64
	}{
		{"ORD-001", "HE-014", 2.0, 125000.0},
		{"ORD-002", "HE-001", 0.2, 225000.0},
		{"ORD-003", "HE-009", 0.5, 36000.0},
		{"ORD-005", "HE-009", 0.25, 64000.0},
		{"ORD-005", "HE-004", 1.0, 0.0},
		{"ORD-007", "HE-009", 0.18, 122222.0},
		{"ORD-008", "HE-002", 0.05, 160000.0},
	}
	for _, oi := range orderItems {
		var orderID, evidenceID int
		err := db.QueryRow(ctx, `SELECT id FROM orders WHERE order_code = $1`, oi.orderCode).Scan(&orderID)
		if err != nil {
			continue
		}
		err = db.QueryRow(ctx, `SELECT id FROM evidence WHERE code = $1`, oi.evidenceCode).Scan(&evidenceID)
		if err != nil {
			continue
		}
		total := oi.qty * oi.unitPrice
		db.Exec(ctx, `
			INSERT INTO order_items (order_id, evidence_id, quantity, unit_price, total_price)
			SELECT $1, $2, $3, $4, $5
			WHERE NOT EXISTS (
				SELECT 1 FROM order_items WHERE order_id = $1 AND evidence_id = $2
			)`,
			orderID, evidenceID, oi.qty, oi.unitPrice, total)
	}

	fmt.Println("Database seeded")
}
