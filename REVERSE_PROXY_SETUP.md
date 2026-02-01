# 🔄 Reverse Proxy Setup Guide for UniversalPWA

Complete configuration guide for deploying Universal PWA behind reverse proxies with `basePath` support.

**Last Updated:** 1 Feb 2026
**Status:** Production Ready

---

## Table of Contents

1. [Nginx Configuration](#nginx-configuration)
2. [Apache Configuration](#apache-configuration)
3. [AWS ALB Setup](#aws-alb-setup)
4. [Cloudflare Workers](#cloudflare-workers)
5. [Azure App Service](#azure-app-service)
6. [Testing & Verification](#testing--verification)

---

## Nginx Configuration

### Basic Setup with basePath

```nginx
server {
    listen 80;
    server_name example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;

    # PWA Location Block
    location /app/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;

        # Headers for reverse proxy
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /app;

        # Service Worker specific
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_pragma $http_authorization;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static assets with aggressive caching
    location /app/_next/static/ {
        alias http://localhost:3000/_next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # manifest.json with correct path
    location /app/manifest.json {
        proxy_pass http://localhost:3000/manifest.json;
        add_header Content-Type application/manifest+json;
    }

    # Service Worker registration
    location /app/sw.js {
        proxy_pass http://localhost:3000/sw.js;
        add_header Service-Worker-Allowed "/app";
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
}
```

### Multi-tenant Setup

```nginx
# Map subdomains to basePath
map $host $app_path {
    "tenant1.example.com"  "/tenant1";
    "tenant2.example.com"  "/tenant2";
    "~^(?<tenant>.+)\.example\.com$"  "/$tenant";
    default "/app";
}

server {
    listen 443 ssl http2;
    server_name ~^(.+)?\.example\.com$;

    location / {
        proxy_pass http://localhost:3000$app_path/;
        proxy_set_header X-Forwarded-Prefix $app_path;

        # ... other headers ...
    }

    # Service Worker at tenant root
    location ~ ^/sw\.js$ {
        proxy_pass http://localhost:3000$app_path/sw.js;
        add_header Service-Worker-Allowed "$app_path";
    }
}
```

### Verification Commands

```bash
# Test reverse proxy
curl -H "X-Forwarded-Prefix: /app" http://localhost:3000/

# Check manifest.json is accessible
curl -I https://example.com/app/manifest.json

# Verify Service Worker
curl -I https://example.com/app/sw.js

# Check header
curl -I https://example.com/app/sw.js | grep Service-Worker-Allowed
# Should output: Service-Worker-Allowed: /app
```

---

## Apache Configuration

### Basic Setup with mod_rewrite

```apache
<VirtualHost *:80>
    ServerName example.com

    # Redirect to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

<VirtualHost *:443>
    ServerName example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/your-cert.crt
    SSLCertificateKeyFile /etc/ssl/private/your-key.key

    # Enable mod_rewrite
    RewriteEngine On

    # PWA Application at /app/
    <Location /app>
        ProxyPreserveHost On
        ProxyPass http://localhost:3000/
        ProxyPassReverse http://localhost:3000/

        # Set basePath headers
        RequestHeader set X-Forwarded-Prefix "/app"
        RequestHeader set X-Forwarded-Proto "https"
        RequestHeader set X-Forwarded-Host "%{HTTP_HOST}e"
    </Location>

    # Service Worker special handling
    <Location /app/sw.js>
        ProxyPass http://localhost:3000/sw.js
        ProxyPassReverse http://localhost:3000/sw.js
        Header set Service-Worker-Allowed "/app"
        Header set Cache-Control "public, max-age=0, must-revalidate"
    </Location>

    # manifest.json
    <Location /app/manifest.json>
        ProxyPass http://localhost:3000/manifest.json
        ProxyPassReverse http://localhost:3000/manifest.json
        Header set Content-Type "application/manifest+json"
    </Location>

    # Static assets with long cache
    <Location /app/_next/static>
        ProxyPass http://localhost:3000/_next/static
        ProxyPassReverse http://localhost:3000/_next/static
        Header set Cache-Control "public, immutable, max-age=31536000"
    </Location>
</VirtualHost>
```

### Multi-tenant with VirtualHosts

```apache
<VirtualHost *:443>
    ServerName tenant1.example.com
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/wildcard.crt
    SSLCertificateKeyFile /etc/ssl/private/wildcard.key

    RewriteEngine On
    RequestHeader set X-Forwarded-Prefix "/tenant1"

    ProxyPass / http://localhost:3000/tenant1/
    ProxyPassReverse / http://localhost:3000/tenant1/

    # Service Worker
    <Location /sw.js>
        ProxyPass http://localhost:3000/tenant1/sw.js
        Header set Service-Worker-Allowed "/tenant1"
    </Location>
</VirtualHost>

<VirtualHost *:443>
    ServerName tenant2.example.com
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/wildcard.crt
    SSLCertificateKeyFile /etc/ssl/private/wildcard.key

    RewriteEngine On
    RequestHeader set X-Forwarded-Prefix "/tenant2"

    ProxyPass / http://localhost:3000/tenant2/
    ProxyPassReverse / http://localhost:3000/tenant2/

    # Service Worker
    <Location /sw.js>
        ProxyPass http://localhost:3000/tenant2/sw.js
        Header set Service-Worker-Allowed "/tenant2"
    </Location>
</VirtualHost>
```

### Verification Commands

```bash
# Test Apache configuration
sudo apache2ctl configtest

# Test reverse proxy with curl
curl -I -H "X-Forwarded-Prefix: /app" http://localhost:3000/

# Verify Service-Worker header
curl -I https://tenant1.example.com/sw.js | grep Service-Worker-Allowed
```

---

## AWS ALB Setup

### Application Load Balancer Configuration

```json
{
  "TargetGroups": [
    {
      "Name": "pwa-app-tg",
      "Port": 3000,
      "Protocol": "HTTP",
      "VpcId": "vpc-xxxxx",
      "HealthCheckProtocol": "HTTP",
      "HealthCheckPath": "/",
      "HealthCheckPort": "3000",
      "HealthCheckIntervalSeconds": 30,
      "HealthCheckTimeoutSeconds": 5,
      "HealthyThresholdCount": 2,
      "UnhealthyThresholdCount": 2,
      "Matcher": {
        "HttpCode": "200-399"
      },
      "TargetType": "instance"
    }
  ],
  "ListenerRules": [
    {
      "Priority": 1,
      "Conditions": [
        {
          "Field": "path-pattern",
          "Values": ["/app/*"]
        }
      ],
      "Actions": [
        {
          "Type": "forward",
          "TargetGroupArn": "arn:aws:elasticloadbalancing:...:targetgroup/pwa-app-tg/...",
          "ForwardConfig": {
            "TargetGroups": [
              {
                "TargetGroupArn": "arn:aws:elasticloadbalancing:...",
                "Weight": 100
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Application Configuration

```typescript
// Lambda / Application Handler
import express from "express";

const app = express();

// Extract basePath from ALB headers
app.use((req, res, next) => {
  const basePath = req.get("x-forwarded-prefix") || "";
  req.basePath = basePath;
  res.setHeader("X-Base-Path", basePath);
  next();
});

// Service Worker endpoint
app.get("/sw.js", (req, res) => {
  const basePath = req.get("x-forwarded-prefix") || "";
  res.setHeader("Service-Worker-Allowed", basePath);
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.sendFile("./public/sw.js");
});

// manifest.json
app.get("/manifest.json", (req, res) => {
  const manifest = require("./public/manifest.json");
  // Adjust paths based on basePath
  const basePath = req.get("x-forwarded-prefix") || "";
  if (basePath) {
    manifest.start_url = `${basePath}/`;
    manifest.scope = basePath;
  }
  res.json(manifest);
});

app.listen(3000, () => {
  console.log("PWA app listening on port 3000");
});
```

### CloudFormation Template

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  ALB:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: pwa-alb
      Subnets:
        - subnet-xxxxx
        - subnet-yyyyy
      SecurityGroups:
        - sg-xxxxx

  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: pwa-targets
      Port: 3000
      Protocol: HTTP
      VpcId: vpc-xxxxx
      HealthCheckPath: /
      HealthCheckProtocol: HTTP

  Listener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !GetAtt ALB.LoadBalancerArn
      Port: 443
      Protocol: HTTPS
      Certificates:
        - CertificateArn: arn:aws:acm:...
      DefaultActions:
        - Type: forward
          TargetGroupArn: !GetAtt TargetGroup.TargetGroupArn

  ListenerRule:
    Type: AWS::ElasticLoadBalancingV2::ListenerRule
    Properties:
      ListenerArn: !GetAtt Listener.ListenerArn
      Priority: 1
      Conditions:
        - Field: path-pattern
          Values:
            - /app/*
      Actions:
        - Type: forward
          TargetGroupArn: !GetAtt TargetGroup.TargetGroupArn
```

---

## Cloudflare Workers

### Worker Script for PWA

```typescript
// wrangler.toml
name = "pwa-router";
main = "src/index.ts";
compatibility_date = "2024-01-01"[[routes]];
pattern = "example.com/app/*";
zone_name = "example.com"[env.production];
routes = [{ pattern = "example.com/app/*", zone_name = "example.com" }];
```

### Worker Implementation

```typescript
// src/index.ts
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Extract basePath
    const basePath = "/app";
    const appPath = pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;

    // Service Worker special handling
    if (pathname === "/app/sw.js") {
      const response = await fetch(`https://api.example.com/sw.js`, {
        headers: {
          ...request.headers,
          "X-Forwarded-Prefix": basePath,
        },
      });

      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Service-Worker-Allowed", basePath);
      newResponse.headers.set(
        "Cache-Control",
        "public, max-age=0, must-revalidate",
      );
      return newResponse;
    }

    // manifest.json with basePath adjustment
    if (pathname === "/app/manifest.json") {
      const response = await fetch(`https://api.example.com/manifest.json`);
      const manifest = await response.json();

      manifest.start_url = basePath + "/";
      manifest.scope = basePath;

      return new Response(JSON.stringify(manifest), {
        headers: {
          "Content-Type": "application/manifest+json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Forward to origin with basePath header
    const newRequest = new Request(
      `https://api.example.com${appPath}${url.search}`,
      {
        ...request,
        headers: {
          ...request.headers,
          "X-Forwarded-Prefix": basePath,
          "X-Forwarded-Host": url.host,
          "X-Forwarded-Proto": "https",
        },
      },
    );

    return fetch(newRequest);
  },
};
```

---

## Azure App Service

### Application Settings

```json
{
  "applicationSettings": [
    {
      "name": "PWA_BASE_PATH",
      "value": "/app"
    },
    {
      "name": "NODE_ENV",
      "value": "production"
    }
  ],
  "connectionStrings": []
}
```

### Application Gateway Configuration

```bicep
param location string = 'eastus'
param appServiceName string = 'pwa-app'

resource appServicePlan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: '${appServiceName}-plan'
  location: location
  sku: {
    name: 'P1V2'
    tier: 'PremiumV2'
  }
}

resource appService 'Microsoft.Web/sites@2021-02-01' = {
  name: appServiceName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
  }
}

resource appGateway 'Microsoft.Network/applicationGateways@2021-02-01' = {
  name: 'pwa-gateway'
  location: location
  properties: {
    backendAddressPools: [
      {
        name: 'pwa-backend'
        properties: {
          backendAddresses: [
            {
              fqdn: appService.properties.defaultHostName
            }
          ]
        }
      }
    ]
    pathBasedRoutingRules: [
      {
        name: 'pwa-path-rule'
        properties: {
          paths: ['/app/*']
          backendAddressPool: {
            id: 'pwa-backend'
          }
          backendHttpSettings: {
            id: 'http-settings'
          }
        }
      }
    ]
  }
}
```

### web.config for IIS

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Pass basePath to application -->
        <rule name="SetBasePath" stopProcessing="false">
          <match url="^app/(.*)" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_PREFIX" value="/app" />
          </serverVariables>
          <action type="Rewrite" url="{R:1}" />
        </rule>

        <!-- Service Worker with correct header -->
        <rule name="ServiceWorker" stopProcessing="true">
          <match url="^app/sw.js$" />
          <action type="Rewrite" url="sw.js" />
        </rule>

        <!-- manifest.json -->
        <rule name="Manifest" stopProcessing="true">
          <match url="^app/manifest.json$" />
          <action type="Rewrite" url="manifest.json" />
        </rule>
      </rules>
      <outboundRules>
        <rule name="AddServiceWorkerHeader" stopProcessing="false">
          <match serverVariable="RESPONSE_Service_Worker_Allowed" pattern=".*" />
          <action type="Rewrite" value="/app" />
        </rule>
      </outboundRules>
    </rewrite>

    <httpProtocol>
      <customHeaders>
        <add name="Service-Worker-Allowed" value="/app" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

---

## Testing & Verification

### Test Checklist

- [ ] Application loads at base path
- [ ] Service Worker registers correctly
- [ ] manifest.json is accessible and valid
- [ ] Static assets load with correct paths
- [ ] Service-Worker-Allowed header present
- [ ] manifest.start_url respects basePath
- [ ] manifest.scope respects basePath
- [ ] Offline mode works correctly

### Manual Testing Script

```bash
#!/bin/bash

BASE_URL="https://example.com/app"
TENANT="tenant1"

echo "=== PWA Reverse Proxy Testing ==="

# 1. Check if app loads
echo "1. Testing app load..."
curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/" | grep -q "200" && echo "✓ App loads" || echo "✗ App failed"

# 2. Check Service Worker
echo "2. Testing Service Worker..."
SW_HEADER=$(curl -s -I "$BASE_URL/sw.js" | grep "Service-Worker-Allowed")
if [[ $SW_HEADER == *"/app"* ]]; then
  echo "✓ Service-Worker-Allowed header correct: $SW_HEADER"
else
  echo "✗ Service-Worker-Allowed header incorrect"
fi

# 3. Check manifest.json
echo "3. Testing manifest.json..."
curl -s "$BASE_URL/manifest.json" | grep -q '"start_url": "/app' && echo "✓ manifest.json start_url correct" || echo "✗ manifest.json start_url incorrect"

# 4. Check manifest scope
echo "4. Testing manifest scope..."
curl -s "$BASE_URL/manifest.json" | grep -q '"scope": "/app' && echo "✓ manifest.json scope correct" || echo "✗ manifest.json scope incorrect"

# 5. Check cache headers
echo "5. Testing cache headers..."
CACHE_HEADER=$(curl -s -I "$BASE_URL/sw.js" | grep "Cache-Control")
echo "Cache-Control: $CACHE_HEADER"

# 6. Multi-tenant test
echo "6. Testing multi-tenant ($TENANT)..."
curl -s -o /dev/null -w "Tenant $TENANT response: %{http_code}\n" "$BASE_URL/tenant/$TENANT/" | grep -q "200" && echo "✓ Multi-tenant works" || echo "✗ Multi-tenant failed"

echo "=== Testing Complete ==="
```

### Monitoring & Logs

```bash
# Nginx logs
tail -f /var/log/nginx/access.log | grep "sw.js\|manifest"

# Apache logs
tail -f /var/log/apache2/access.log | grep "sw.js"

# Application logs (Node.js)
tail -f logs/app.log | grep -E "basePath|Service-Worker"
```

---

## Troubleshooting

### Issue: Service Worker not registering

**Symptoms:** Service Worker fails to register, app can't go offline

**Solution:**

1. Check `Service-Worker-Allowed` header is set to basePath
2. Verify Service Worker scope matches basePath
3. Check browser console for CORS errors

```bash
# Verify header
curl -I https://example.com/app/sw.js | grep Service-Worker-Allowed
```

### Issue: manifest.json paths incorrect

**Symptoms:** App won't install, wrong start URL

**Solution:**

1. Adjust `start_url` in manifest.json to include basePath
2. Set `scope` to basePath in manifest.json
3. Test manifest at `https://example.com/app/manifest.json`

### Issue: Static assets return 404

**Symptoms:** CSS, JS, images don't load

**Solution:**

1. Check reverse proxy cache settings
2. Verify static path rewriting in configuration
3. Test with `curl -I https://example.com/app/_next/static/...`

---

## Performance Recommendations

1. **Enable HTTP/2:** All reverse proxy configurations
2. **Set aggressive cache for assets:** 1 year for fingerprinted files
3. **Cache Control headers:**
   - Service Worker: `public, max-age=0, must-revalidate`
   - manifest.json: `public, max-age=3600`
   - Static assets: `public, immutable, max-age=31536000`
4. **Use CDN:** Front proxies with geographic distribution

---

## Security Checklist

- [x] HTTPS only (redirect HTTP → HTTPS)
- [x] Remove X-Powered-By headers
- [x] Set X-Content-Type-Options: nosniff
- [x] Set X-Frame-Options: SAMEORIGIN
- [x] Configure CSP headers
- [x] Validate Service-Worker-Allowed header
- [x] Use security headers for manifest.json

---

**Last Updated:** 1 Feb 2026
**Status:** Production Ready for use with UniversalPWA
