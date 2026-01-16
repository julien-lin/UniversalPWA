# Go SDK for UniversalPWA

[![Go Reference](https://pkg.go.dev/badge/github.com/julien-lin/universal-pwa/sdk-go.svg)](https://pkg.go.dev/github.com/julien-lin/universal-pwa/sdk-go)
[![Go Report Card](https://goreportcard.com/badge/github.com/julien-lin/universal-pwa/sdk-go)](https://goreportcard.com/report/github.com/julien-lin/universal-pwa/sdk-go)

Go SDK for [UniversalPWA](https://universalpwa.dev) - Generate Progressive Web Apps from Go applications (Fiber, Gin, Echo).

## 🚀 Quick Start

### Installation

```bash
go get github.com/julien-lin/universal-pwa/sdk-go
```

### Usage

```go
package main

import (
    "fmt"
    "log"
    "github.com/julien-lin/universal-pwa/sdk-go/pkg/universalpwa"
)

func main() {
    config := universalpwa.NewConfig("/path/to/project")
    config.AppName = "My App"
    config.Backend = "fiber"

    client := universalpwa.NewClient(config)

    result, err := client.Generate(nil)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("PWA generated: %v\n", result)
}
```

## 📚 Usage

### Scan Project

```go
scanResult, err := client.Scan()
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Framework: %v\n", scanResult["framework"])
```

### Generate PWA

```go
result, err := client.Generate(nil)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Manifest: %v\n", result["manifest"])
```

### Validate PWA

```go
validation, err := client.Validate()
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Valid: %v\n", validation["valid"])
```

## 🧪 Testing

```bash
go test ./...
```

## 📖 Documentation

- [API Reference](https://pkg.go.dev/github.com/julien-lin/universal-pwa/sdk-go)
- [Framework Integration Examples](https://docs.universalpwa.dev/sdk/go)

## 📄 License

MIT
