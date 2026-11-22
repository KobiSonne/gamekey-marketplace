# Stage 1: Build static Go binary
FROM golang:1.27-alpine AS builder

WORKDIR /app

# Install git and CA certificates for dependency fetching & HTTPS
RUN apk add --no-cache git ca-certificates tzdata

# Download Go modules first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build statically linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/server ./cmd/api/main.go

# Stage 2: Minimal distroless runtime image (~15 MB)
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

# Copy compiled binary and SQL migrations
COPY --from=builder /app/server /app/server
COPY --from=builder /app/migrations /app/migrations

# Expose API port (Render injects PORT dynamically)
EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/app/server"]