package ui

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
)

//go:embed all:dist
var staticFS embed.FS

// AddRoutes serves the static file system for the UI React App.
// In development, the frontend is served by Vite dev server on port 3000.
// In production, static files are served from the embedded filesystem.
func AddRoutes(router gin.IRouter) {
	// Skip serving static files in development - let Vite handle it
	if os.Getenv("ENVIRONMENT") == "development" {
		return
	}

	embeddedDistFolder := newStaticFileSystem()
	router.Use(static.Serve("/", embeddedDistFolder))
}

// SetupSPAFallback configures the SPA fallback route for serving index.html
// This must be called on the main gin.Engine after all other routes are set up
func SetupSPAFallback(engine *gin.Engine) {
	// Skip in development
	if os.Getenv("ENVIRONMENT") == "development" {
		return
	}
	
	// SPA fallback: serve index.html for all routes that don't match static files or API routes
	engine.NoRoute(func(c *gin.Context) {
		// Don't serve index.html for API routes, static assets, or other backend routes
		if strings.HasPrefix(c.Request.URL.Path, "/api") ||
		   strings.HasPrefix(c.Request.URL.Path, "/assets") ||
		   strings.HasPrefix(c.Request.URL.Path, "/health") ||
		   strings.HasPrefix(c.Request.URL.Path, "/swagger") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
			return
		}
		
		// For all other routes, serve index.html to let React Router handle it
		indexFile, err := staticFS.Open("dist/index.html")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not serve index.html"})
			return
		}
		defer indexFile.Close()
		
		c.Header("Content-Type", "text/html; charset=utf-8")
		http.ServeContent(c.Writer, c.Request, "index.html", time.Time{}, indexFile.(io.ReadSeeker))
	})
}

// ----------------------------------------------------------------------
// staticFileSystem serves files out of the embedded build folder

type staticFileSystem struct {
	http.FileSystem
}

var _ static.ServeFileSystem = (*staticFileSystem)(nil)

func newStaticFileSystem() *staticFileSystem {
	sub, err := fs.Sub(staticFS, "dist")

	if err != nil {
		panic(err)
	}

	return &staticFileSystem{
		FileSystem: http.FS(sub),
	}
}

func (s *staticFileSystem) Exists(prefix string, path string) bool {
	buildpath := fmt.Sprintf("dist%s", path)

	// support for folders
	if strings.HasSuffix(path, "/") {
		_, err := staticFS.ReadDir(strings.TrimSuffix(buildpath, "/"))
		return err == nil
	}

	// support for files
	f, err := staticFS.Open(buildpath)
	if f != nil {
		_ = f.Close()
	}
	return err == nil
}
