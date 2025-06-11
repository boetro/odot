package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

type CreateTeamRequest struct {
	Name string `json:"name" binding:"required"`
}

func CreateTeam(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateTeamRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
}

func ListTeams(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

	}
}
