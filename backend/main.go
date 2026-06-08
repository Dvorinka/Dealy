package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed all:static
var staticFiles embed.FS

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(corsMiddleware())

	db = initDB()
	runMigrations(db)

	registerRoutes(r)

	// Public shop routes (no auth)
	shop := r.Group("/shop")
	{
		shop.GET("/products", listPublicProducts)
		shop.GET("/products/:id", getPublicProduct)
		shop.GET("/orders/track/:code", getPublicOrderByCode)
		shop.POST("/orders", createPublicOrder)
		shop.POST("/customers", createPublicCustomer)
		shop.GET("/locations", listPublicLocations)
	}

	// Serve embedded static files (frontend build)
	staticFS, err := fs.Sub(staticFiles, "static")
	if err == nil {
		staticServer := http.FileServer(http.FS(staticFS))
		serveStatic := func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api") {
				c.Status(http.StatusNotFound)
				return
			}
			if strings.HasPrefix(c.Request.URL.Path, "/shop") {
				c.Status(http.StatusNotFound)
				return
			}
			// Serve real files (JS/CSS/images); only fall back to index.html for SPA routes
			path := strings.TrimPrefix(c.Request.URL.Path, "/")
			if path == "" {
				path = "index.html"
			}
			if _, openErr := staticFS.Open(path); openErr != nil {
				c.Request.URL.Path = "/"
			}
			staticServer.ServeHTTP(c.Writer, c.Request)
		}
		r.GET("/", serveStatic)
		r.NoRoute(serveStatic)
	} else {
		log.Printf("Static files not embedded: %v", err)
		r.GET("/", func(c *gin.Context) {
			c.String(http.StatusOK, "Heisenberg Evidence API - Frontend not built")
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server running on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
