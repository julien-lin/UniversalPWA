package com.universalpwa.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

/**
 * Main UniversalPWA SDK client for Java.
 */
public class UniversalPwaClient {
    private final UniversalPwaConfig config;
    private final HttpClient httpClient;

    public UniversalPwaClient(UniversalPwaConfig config) {
        this.config = config;
        this.httpClient = new HttpClient(
            config.getApiEndpoint(),
            config.getTimeout()
        );
    }

    /**
     * Scan project to detect framework and features.
     */
    public Map<String, Object> scan() throws Exception {
        Map<String, Object> request = Map.of(
            "projectRoot", config.getProjectRoot(),
            "autoDetectBackend", config.isAutoDetectBackend()
        );

        return httpClient.post("/api/scan", request);
    }

    /**
     * Generate PWA files.
     */
    public Map<String, Object> generate(Map<String, Object> overrides) throws Exception {
        Map<String, Object> merged = config.toMap();
        if (overrides != null) {
            merged.putAll(overrides);
        }

        Map<String, Object> request = Map.of("config", merged);

        return httpClient.post("/api/generate", request);
    }

    /**
     * Validate project PWA readiness.
     */
    public Map<String, Object> validate() throws Exception {
        Map<String, Object> request = Map.of(
            "projectRoot", config.getProjectRoot()
        );

        return httpClient.post("/api/validate", request);
    }
}
