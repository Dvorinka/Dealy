package main

import (
    "context"
    "log"
    "net/http"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/go-playground/validator/v10"
)

// Custom error types
type APIError struct {
    Status  int    `json:"status"`
    Code    string `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

func (e *APIError) Error() string {
    return e.Message
}

// Validation error structure
 type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
 }

// Error constants
const (
    ErrCodeBadRequest = "BAD_REQUEST"
    ErrCodeUnauthorized = "UNAUTHORIZED"
    ErrCodeForbidden = "FORBIDDEN"
    ErrCodeNotFound = "NOT_FOUND"
    ErrCodeConflict = "CONFLICT"
    ErrCodeInternal = "INTERNAL"
    ErrCodeValidation = "VALIDATION"
)

// Standard error responses
var (
    ErrBadRequest = &APIError{Status: http.StatusBadRequest, Code: ErrCodeBadRequest, Message: "Bad request"}
    ErrUnauthorized = &APIError{Status: http.StatusUnauthorized, Code: ErrCodeUnauthorized, Message: "Unauthorized"}
    ErrForbidden = &APIError{Status: http.StatusForbidden, Code: ErrCodeForbidden, Message: "Forbidden"}
    ErrNotFound = &APIError{Status: http.StatusNotFound, Code: ErrCodeNotFound, Message: "Not found"}
    ErrConflict = &APIError{Status: http.StatusConflict, Code: ErrCodeConflict, Message: "Conflict"}
    ErrInternal = &APIError{Status: http.StatusInternalServerError, Code: ErrCodeInternal, Message: "Internal server error"}
)

// Global error response helper
func errorResponse(c *gin.Context, err error) {
    if apiErr, ok := err.(*APIError); ok {
        c.JSON(apiErr.Status, apiErr)
        return
    }
    
    // Handle validation errors
    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        var details []ValidationError
        for _, err := range validationErrors {
            details = append(details, ValidationError{
                Field:   err.Field,
                Message: err.Error(),
            })
        }
        c.JSON(http.StatusBadRequest, gin.H{
            "status":  http.StatusBadRequest,
            "code":    ErrCodeValidation,
            "message": "Validation failed",
            "details": details,
        })
        return
    }
    
    // Generic error
    c.JSON(http.StatusInternalServerError, gin.H{
        "status":  http.StatusInternalServerError,
        "code":    ErrCodeInternal,
        "message": "Internal server error",
    })
}

// Validation middleware
func validationMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        var req interface{}
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "status":  http.StatusBadRequest,
                "code":    ErrCodeBadRequest,
                "message": "Invalid request body",
                "details": err.Error(),
            })
            c.Abort()
            return
        }
        
        // Validate struct if it has validation tags
        if v, ok := req.(interface{ Validate() error }); ok {
            if err := v.Validate(); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{
                    "status":  http.StatusBadRequest,
                    "code":    ErrCodeValidation,
                    "message": "Validation failed",
                    "details": err.Error(),
                })
                c.Abort()
                return
            }
        }
        
        c.Next()
    }
}

// Logger middleware
func loggerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        query := c.Request.URL.RawQuery
        
        c.Next()
        
        latency := time.Since(start)
        status := c.Writer.Status()
        
        if len(path) > 100 {
            path = path[:100] + "..."
        }
        
        log.Printf("[GIN] %d %s %s %s",
            status,
            c.Request.Method,
            path,
            query,
        )
    }
}

// Rate limiting middleware (simple in-memory version)
type RateLimiter struct {
    requests map[string]int
    window    time.Duration
    limit     int
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string]int),
        window:    window,
        limit:     limit,
    }
}

func (r *RateLimiter) Allow(key string) bool {
    now := time.Now()
    if count, exists := r.requests[key]; exists {
        if now.Sub(now) < r.window {
            if count >= r.limit {
                return false
            }
            r.requests[key] = count + 1
            return true
        }
        delete(r.requests, key)
    }
    r.requests[key] = 1
    return true
}

// CORS middleware with better configuration
func enhancedCorsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
        c.Writer.Header().Set("Access-Control-Allow-Credentials", "false")
        c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length")
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }
        
        c.Next()
    }
}

// Security headers middleware
func securityMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
        c.Writer.Header().Set("X-Frame-Options", "DENY")
        c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")
        c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Next()
    }
}