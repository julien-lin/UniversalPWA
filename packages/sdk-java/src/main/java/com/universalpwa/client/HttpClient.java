package com.universalpwa.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Map;

/**
 * HTTP client for communicating with UniversalPWA Core API.
 */
public class HttpClient {
    private static final Logger logger = LoggerFactory.getLogger(HttpClient.class);
    private final String apiEndpoint;
    private final int timeout;
    private final ObjectMapper objectMapper;

    public HttpClient(String apiEndpoint, int timeout) {
        this.apiEndpoint = apiEndpoint.replaceAll("/$", "");
        this.timeout = timeout;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Make POST request to API.
     */
    public Map<String, Object> post(String path, Map<String, Object> data) throws Exception {
        String url = apiEndpoint + path;
        String jsonBody = objectMapper.writeValueAsString(data);

        HttpPost request = new HttpPost(url);
        request.setHeader("Content-Type", "application/json");
        request.setEntity(new StringEntity(jsonBody, ContentType.APPLICATION_JSON));

        try (CloseableHttpClient client = HttpClients.createDefault()) {
            return client.execute(request, response -> {
                String responseBody = new String(response.getEntity().getContent().readAllBytes());
                return objectMapper.readValue(responseBody, Map.class);
            });
        } catch (IOException e) {
            logger.error("HTTP request failed: {}", e.getMessage());
            throw e;
        }
    }
}
