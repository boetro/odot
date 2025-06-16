package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type Claims struct {
	UserID int32  `json:"user_id"`
	Email  string `json:"email"`
	Type   string `json:"type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrInvalidTokenType = errors.New("invalid token type")
)

// Generate a cryptographically secure random token
func generateSecureToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// Hash a token for secure storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", hash)
}

// GenerateAccessToken creates a short-lived access token (15 minutes)
func GenerateAccessToken(userID int32, email string, jwtSecret string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Type:   "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

// GenerateRefreshToken creates a long-lived refresh token (7 days)
func GenerateRefreshToken() (string, string, error) {
	token, err := generateSecureToken()
	if err != nil {
		return "", "", err
	}

	hashedToken := hashToken(token)
	return token, hashedToken, nil
}

// GenerateTokenPair creates both access and refresh tokens
func GenerateTokenPair(userID int32, email string, jwtSecret string) (*TokenPair, string, error) {
	accessToken, err := GenerateAccessToken(userID, email, jwtSecret)
	if err != nil {
		return nil, "", err
	}

	refreshToken, hashedRefreshToken, err := GenerateRefreshToken()
	if err != nil {
		return nil, "", err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, hashedRefreshToken, nil
}

// ValidateToken validates and parses a JWT token
func ValidateToken(tokenString string, jwtSecret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// ValidateAccessToken specifically validates access tokens
func ValidateAccessToken(tokenString string, jwtSecret string) (*Claims, error) {
	claims, err := ValidateToken(tokenString, jwtSecret)
	if err != nil {
		return nil, err
	}

	if claims.Type != "access" {
		return nil, ErrInvalidTokenType
	}

	return claims, nil
}

// HashRefreshToken hashes a refresh token for database lookup
func HashRefreshToken(token string) string {
	return hashToken(token)
}
