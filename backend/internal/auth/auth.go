package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/KobiSonne/gamekey-marketplace/internal/models"
)

type AuthService struct {
	db        *pgxpool.Pool
	jwtSecret []byte
}

type Claims struct {
	UserID uuid.UUID       `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func NewAuthService(db *pgxpool.Pool, jwtSecret string) *AuthService {
	return &AuthService{
		db:        db,
		jwtSecret: []byte(jwtSecret),
	}
}

// Register creates a new user, hashes the password, and returns the user model + JWT token
func (s *AuthService) Register(ctx context.Context, username, email, password string) (*models.User, string, error) {
	if len(password) < 6 {
		return nil, "", errors.New("password must be at least 6 characters long")
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("failed to hash password: %w", err)
	}

	var user models.User
	query := `
		INSERT INTO users (username, email, password_hash, role)
		VALUES ($1, $2, $3, 'buyer')
		RETURNING id, email, username, role, seller_rating, seller_sales_count, created_at, updated_at
	`

	err = s.db.QueryRow(ctx, query, username, email, string(hashedBytes)).Scan(
		&user.ID, &user.Email, &user.Username, &user.Role,
		&user.SellerRating, &user.SellerSalesCount, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		return nil, "", fmt.Errorf("failed to insert user (email or username may already exist): %w", err)
	}

	token, err := s.GenerateToken(&user)
	if err != nil {
		return nil, "", err
	}

	return &user, token, nil
}

// Login verifies credentials and returns the user model + JWT token
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, string, error) {
	var user models.User
	query := `
		SELECT id, email, username, password_hash, role, seller_rating, seller_sales_count, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	err := s.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.Username, &user.PasswordHash, &user.Role,
		&user.SellerRating, &user.SellerSalesCount, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", errors.New("invalid email or password")
		}
		return nil, "", fmt.Errorf("database query error: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", errors.New("invalid email or password")
	}

	token, err := s.GenerateToken(&user)
	if err != nil {
		return nil, "", err
	}

	return &user, token, nil
}

// GetUserByID fetches user details by UUID
func (s *AuthService) GetUserByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	query := `
		SELECT id, email, username, role, seller_rating, seller_sales_count, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	err := s.db.QueryRow(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.Username, &user.Role,
		&user.SellerRating, &user.SellerSalesCount, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	return &user, nil
}

// GenerateToken creates a signed JWT valid for 72 hours
func (s *AuthService) GenerateToken(user *models.User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return signedToken, nil
}

// ValidateToken parses and verifies a JWT string, returning the claims
func (s *AuthService) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}
