package ui

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"strings"

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
