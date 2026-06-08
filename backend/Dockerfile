# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.25-alpine AS backend-builder
RUN apk add --no-cache git
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-builder /app/backend/static ./static
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

# Stage 3: Runtime
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=backend-builder /app/server /app/server
EXPOSE 8080
ENTRYPOINT ["/app/server"]
