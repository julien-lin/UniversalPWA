package universalpwa

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Config holds the SDK configuration
type Config struct {
	ProjectRoot         string
	AppName             string
	AppDescription      string
	Backend             string
	GenerateIcons       bool
	APIEndpoint         string
	Timeout             time.Duration
	AutoDetectBackend   bool
}

// NewConfig creates a new configuration with defaults
func NewConfig(projectRoot string) *Config {
	return &Config{
		ProjectRoot:       projectRoot,
		GenerateIcons:     true,
		APIEndpoint:       "http://localhost:3000",
		Timeout:           30 * time.Second,
		AutoDetectBackend: true,
	}
}

// Client is the main SDK client
type Client struct {
	config *Config
	client *http.Client
}

// NewClient creates a new SDK client
func NewClient(config *Config) *Client {
	return &Client{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// ScanResult represents the result of a project scan
type ScanResult map[string]interface{}

// Scan scans the project for framework and features
func (c *Client) Scan() (ScanResult, error) {
	request := map[string]interface{}{
		"projectRoot":       c.config.ProjectRoot,
		"autoDetectBackend": c.config.AutoDetectBackend,
	}

	var result ScanResult
	err := c.post("/api/scan", request, &result)
	return result, err
}

// GenerationResult represents the result of PWA generation
type GenerationResult map[string]interface{}

// Generate generates PWA files
func (c *Client) Generate(overrides map[string]interface{}) (GenerationResult, error) {
	config := c.configToMap()
	if overrides != nil {
		for k, v := range overrides {
			config[k] = v
		}
	}

	request := map[string]interface{}{
		"config": config,
	}

	var result GenerationResult
	err := c.post("/api/generate", request, &result)
	return result, err
}

// ValidationResult represents the result of PWA validation
type ValidationResult map[string]interface{}

// Validate validates the project's PWA readiness
func (c *Client) Validate() (ValidationResult, error) {
	request := map[string]interface{}{
		"projectRoot": c.config.ProjectRoot,
	}

	var result ValidationResult
	err := c.post("/api/validate", request, &result)
	return result, err
}

// Helper methods

func (c *Client) post(path string, data interface{}, result interface{}) error {
	url := c.config.APIEndpoint + path

	body, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	return nil
}

func (c *Client) configToMap() map[string]interface{} {
	m := make(map[string]interface{})
	m["projectRoot"] = c.config.ProjectRoot
	if c.config.AppName != "" {
		m["appName"] = c.config.AppName
	}
	if c.config.AppDescription != "" {
		m["appDescription"] = c.config.AppDescription
	}
	if c.config.Backend != "" {
		m["backend"] = c.config.Backend
	}
	m["generateIcons"] = c.config.GenerateIcons
	m["autoDetectBackend"] = c.config.AutoDetectBackend
	return m
}
