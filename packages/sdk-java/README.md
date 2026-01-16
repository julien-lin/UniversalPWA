# Java SDK for UniversalPWA

[![Maven Central](https://img.shields.io/maven-central/v/dev.universalpwa/universal-pwa.svg)](https://search.maven.org/artifact/dev.universalpwa/universal-pwa)
[![Tests](https://img.shields.io/github/actions/workflow/status/julien-lin/universal-pwa/test-java.yml?branch=main)](https://github.com/julien-lin/universal-pwa/actions)

Java SDK for [UniversalPWA](https://universalpwa.dev) - Generate Progressive Web Apps from Spring Boot applications.

## 🚀 Quick Start

### Maven

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>dev.universalpwa</groupId>
    <artifactId>universal-pwa</artifactId>
    <version>2.0.0-SNAPSHOT</version>
</dependency>
```

### Gradle

Add to your `build.gradle`:

```gradle
dependencies {
    implementation 'dev.universalpwa:universal-pwa:2.0.0-SNAPSHOT'
}
```

### Usage

```java
import com.universalpwa.client.UniversalPwaClient;
import com.universalpwa.client.UniversalPwaConfig;
import java.util.Map;

// Configure
UniversalPwaConfig config = new UniversalPwaConfig("/path/to/project");
config.setAppName("My App");
config.setBackend("spring");

// Create client
UniversalPwaClient client = new UniversalPwaClient(config);

// Generate PWA
Map<String, Object> result = client.generate(null);
System.out.println("PWA generated: " + result);
```

## 📚 Usage

### Scan Project

```java
Map<String, Object> scanResult = client.scan();
System.out.println("Framework: " + scanResult.get("framework"));
```

### Generate PWA

```java
Map<String, Object> result = client.generate(null);
System.out.println("Manifest: " + result.get("manifest"));
```

### Validate PWA

```java
Map<String, Object> validation = client.validate();
System.out.println("Valid: " + validation.get("valid"));
```

## 🧪 Testing

```bash
mvn test
```

## 📖 Documentation

- [API Reference](https://docs.universalpwa.dev/sdk/java)
- [Spring Boot Integration](https://docs.universalpwa.dev/sdk/java/spring-boot)

## 📄 License

MIT
