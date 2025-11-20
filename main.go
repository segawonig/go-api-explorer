// =========================================================================
// JSON API Explorer — minimal proxy server for testing public APIs
// -------------------------------------------------------------------------
// This server is intentionally small and focused: it serves static frontend
// assets from ./static and exposes a single JSON proxy endpoint /api which
// forwards user-specified HTTP requests to arbitrary external APIs.
//
// Design goals:
// - Keep the runtime dependency-free (no go.mod required for Render)
// - Use a short, auditable request proxy to avoid CORS issues in the browser
// - Provide safe timeouts and clear error reporting to the frontend
//
// Security note:
// - This is a demo proxy intended for local/dev/testing and portfolio use.
// - In production you would add authorization, rate-limiting, request size
//   limits, validation of target URLs, and possibly restrict allowed hosts.
// =========================================================================

package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// -------------------------------------------------------------------------
// apiRequest is the small DTO describing the JSON payload the frontend
// sends to /api. It is intentionally permissive: the frontend controls the
// HTTP method, target URL and request body as plain text.
// -------------------------------------------------------------------------
type apiRequest struct {
	Method string `json:"method"`
	URL    string `json:"url"`
	Body   string `json:"body"`
}

// -------------------------------------------------------------------------
// main wires up three responsibilities:
//  1. Serve the single-page frontend (index.html) on "/"
//  2. Serve static assets under "/static/"
//  3. Provide the JSON proxy endpoint "/api"
//
// The server reads PORT from the environment to work smoothly on Render.
// -------------------------------------------------------------------------
func main() {
	// Serve SPA entrypoint from ./static/index.html
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Using ServeFile keeps the server simple; static dir holds all assets.
		http.ServeFile(w, r, "./static/index.html")
	})

	// Map /static/* to files under ./static
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Proxy endpoint used by the frontend to bypass CORS
	http.HandleFunc("/api", apiHandler)

	// Port (Render provides PORT)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("JSON API Explorer running on port", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// -------------------------------------------------------------------------
// apiHandler forwards the user's request to the external API and returns
// the external API's raw response to the frontend.
//
// Behaviour and rationale:
// - Only accepts POST; the frontend sends a small JSON object describing the
//   desired request. This keeps the contract explicit and avoids accidental
//   unintended GETs from the browser.
// - A 10s timeout prevents resource exhaustion when upstream is slow.
// - The handler forwards the external response body verbatim (no parsing),
//   and sets Content-Type to application/json for consistent client-side handling.
// - Errors are reported as simple JSON objects for predictable parsing.
// -------------------------------------------------------------------------
func apiHandler(w http.ResponseWriter, r *http.Request) {
	// The explorer expects JSON responses; always return JSON from this handler
	w.Header().Set("Content-Type", "application/json")

	// Only POST allowed by contract
	if r.Method != "POST" {
		http.Error(w, `{"error":"only POST allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Decode user request describing the proxied call
	var req apiRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// Validate basic fields; minimal validation to keep UX friendly
	if req.Method == "" || req.URL == "" {
		http.Error(w, `{"error":"method and url are required"}`, http.StatusBadRequest)
		return
	}

	// Build the outgoing request; body is passed as-is (frontend controls formatting)
	var body io.Reader
	if req.Body != "" {
		body = bytes.NewBuffer([]byte(req.Body))
	}

	outReq, err := http.NewRequest(req.Method, req.URL, body)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	// Set a sensible default header: many APIs expect JSON
	outReq.Header.Set("Content-Type", "application/json")

	// Use a client with timeout to avoid hanging goroutines
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(outReq)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Read response body and forward it verbatim to the frontend.
	// We avoid trying to interpret or modify it — the frontend will handle presentation.
	respBytes, _ := io.ReadAll(resp.Body)

	// Return the exact payload received from the upstream API.
	// Status code is not forwarded intentionally (keeps frontend logic simple);
	// if needed, augment the response with a wrapper containing status and headers.
	w.Write(respBytes)
}
