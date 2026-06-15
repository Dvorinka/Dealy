package main

import (
    "context"
    "errors"
    "log"
    "strings"
    "time"
)

// DBQueryFunc is a function type for database queries
 type DBQueryFunc func(ctx context.Context, query string, args ...interface{}) (*Rows, error)

// DBQueryRowFunc is a function type for database queries that return a single row
 type DBQueryRowFunc func(ctx context.Context, query string, args ...interface{}) (*Row, error)

// DBExecFunc is a function type for database executes
 type DBExecFunc func(ctx context.Context, query string, args ...interface{}) (Result, error)

// Result represents a database result
 type Result interface {
    LastInsertId() (int64, error)
    RowsAffected() (int64, error)
 }

// Rows represents database rows
 type Rows interface {
    Close() error
    ColumnTypes() ([]ColumnType, error)
    Columns() ([]string, error)
    Err() error
    Next() bool
    Scan(...interface{}) error
 }

// ColumnType represents a database column type
 type ColumnType interface {
    DatabaseTypeName() string
    Length() (int64, bool)
    DecimalSize() (int64, int64, error)
 }

// Row represents a single database row
 type Row interface {
    Scan(...interface{}) error
 }

// Database abstraction layer
 type Database interface {
    Query(ctx context.Context, query string, args ...interface{}) (*Rows, error)
    QueryRow(ctx context.Context, query string, args ...interface{}) (*Row, error)
    Exec(ctx context.Context, query string, args ...interface{}) (Result, error)
    BeginTx(ctx context.Context) (Tx, error)
    Close() error
 }

// Transaction interface
 type Tx interface {
    Commit() error
    Rollback() error
    Query(ctx context.Context, query string, args ...interface{}) (*Rows, error)
    QueryRow(ctx context.Context, query string, args ...interface{}) (*Row, error)
    Exec(ctx context.Context, query string, args ...interface{}) (Result, error)
 }

// DefaultDatabase implements Database interface using pgx
 type DefaultDatabase struct {
    // pgx connection pool would go here
 }

func NewDefaultDatabase() *DefaultDatabase {
    return &DefaultDatabase{}
}

// Repository interface for common database operations
 type Repository[T any] interface {
    GetByID(ctx context.Context, id int) (*T, error)
    GetAll(ctx context.Context, filter interface{}) ([]*T, error)
    Create(ctx context.Context, entity *T) error
    Update(ctx context.Context, entity *T) error
    Delete(ctx context.Context, id int) error
    Count(ctx context.Context, filter interface{}) (int64, error)
 }

// BaseRepository provides common repository functionality
 type BaseRepository[T any] struct {
    db Database
    tableName string
 }

func NewBaseRepository[T any](db Database, tableName string) *BaseRepository[T] {
    return &BaseRepository[T]{db: db, tableName: tableName}
}

func (r *BaseRepository[T]) GetByID(ctx context.Context, id int) (*T, error) {
    var entity T
    query := "SELECT * FROM " + r.tableName + " WHERE id = $1"
    row, err := r.db.QueryRow(ctx, query, id)
    if err != nil {
        return nil, err
    }
    
    // This would scan into the entity - simplified for example
    // In real implementation, use reflection or specific scan functions
    return &entity, nil
}

func (r *BaseRepository[T]) GetAll(ctx context.Context, filter interface{}) ([]*T, error) {
    query := "SELECT * FROM " + r.tableName + " WHERE 1=1"
    // Add filter conditions based on filter parameters
    args := []interface{}{}
    
    rows, err := r.db.Query(ctx, query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var entities []*T
    for rows.Next() {
        var entity T
        // This would scan into the entity - simplified for example
        entities = append(entities, &entity)
    }
    
    return entities, rows.Err()
}

func (r *BaseRepository[T]) Create(ctx context.Context, entity *T) error {
    // Get table columns and values for INSERT
    query := "INSERT INTO " + r.tableName + " ("
    // Build INSERT query
    query += " VALUES ("
    // Build VALUES placeholders
    
    _, err := r.db.Exec(ctx, query)
    return err
}

func (r *BaseRepository[T]) Update(ctx context.Context, entity *T) error {
    query := "UPDATE " + r.tableName + " SET "
    // Build UPDATE query
    
    _, err := r.db.Exec(ctx, query)
    return err
}

func (r *BaseRepository[T]) Delete(ctx context.Context, id int) error {
    query := "DELETE FROM " + r.tableName + " WHERE id = $1"
    _, err := r.db.Exec(ctx, query, id)
    return err
}

func (r *BaseRepository[T]) Count(ctx context.Context, filter interface{}) (int64, error) {
    query := "SELECT COUNT(*) FROM " + r.tableName + " WHERE 1=1"
    // Add filter conditions
    
    var count int64
    row, err := r.db.QueryRow(ctx, query)
    if err != nil {
        return 0, err
    }
    err = row.Scan(&count)
    return count, err
}
