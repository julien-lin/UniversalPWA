package com.universalpwa.client;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration for UniversalPWA SDK.
 */
public class UniversalPwaConfig {
    private final String projectRoot;
    private String appName;
    private String appDescription;
    private String backend;
    private boolean generateIcons = true;
    private String apiEndpoint = "http://localhost:3000";
    private int timeout = 30;

    public UniversalPwaConfig(String projectRoot) {
        this.projectRoot = projectRoot;
    }

    public String getProjectRoot() {
        return projectRoot;
    }

    public String getAppName() {
        return appName;
    }

    public void setAppName(String appName) {
        this.appName = appName;
    }

    public String getAppDescription() {
        return appDescription;
    }

    public void setAppDescription(String appDescription) {
        this.appDescription = appDescription;
    }

    public String getBackend() {
        return backend;
    }

    public void setBackend(String backend) {
        this.backend = backend;
    }

    public boolean isGenerateIcons() {
        return generateIcons;
    }

    public void setGenerateIcons(boolean generateIcons) {
        this.generateIcons = generateIcons;
    }

    public String getApiEndpoint() {
        return apiEndpoint;
    }

    public void setApiEndpoint(String apiEndpoint) {
        this.apiEndpoint = apiEndpoint;
    }

    public int getTimeout() {
        return timeout;
    }

    public void setTimeout(int timeout) {
        this.timeout = timeout;
    }

    public boolean isAutoDetectBackend() {
        return true;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("projectRoot", projectRoot);
        if (appName != null) map.put("appName", appName);
        if (appDescription != null) map.put("appDescription", appDescription);
        if (backend != null) map.put("backend", backend);
        map.put("generateIcons", generateIcons);
        map.put("apiEndpoint", apiEndpoint);
        map.put("timeout", timeout);
        return map;
    }
}
