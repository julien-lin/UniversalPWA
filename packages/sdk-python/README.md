# Python SDK for UniversalPWA

[![PyPI](https://img.shields.io/pypi/v/universal-pwa-python.svg)](https://pypi.org/project/universal-pwa-python/)
[![Tests](https://img.shields.io/github/actions/workflow/status/julien-lin/universal-pwa/test-python.yml?branch=main)](https://github.com/julien-lin/universal-pwa/actions)
[![Coverage](https://img.shields.io/codecov/c/github/julien-lin/universal-pwa/main?flag=python)](https://codecov.io/gh/julien-lin/universal-pwa)

Python SDK for [UniversalPWA](https://universalpwa.dev) - Generate Progressive Web Apps from Django, Flask, and FastAPI projects.

## 🚀 Quick Start

### Installation

```bash
pip install universal-pwa-python
```

### Django

```python
from universal_pwa import UniversalPwaClient
from universal_pwa.backends import DjangoIntegration

# Auto-configure from Django settings
django_integration = DjangoIntegration()
config = django_integration.auto_configure()

# Generate PWA
client = UniversalPwaClient(config)
result = client.generate()
print(f"PWA generated: {result.manifest}")
```

### Flask

```python
from flask import Flask
from universal_pwa import UniversalPwaClient
from universal_pwa.backends import FlaskIntegration

app = Flask(__name__)
flask_integration = FlaskIntegration(app)
config = flask_integration.auto_configure()

client = UniversalPwaClient(config)
result = client.generate()
```

### FastAPI

```python
from fastapi import FastAPI
from universal_pwa import UniversalPwaClient
from universal_pwa.backends import FastAPIIntegration

app = FastAPI()
fastapi_integration = FastAPIIntegration(app)
config = fastapi_integration.auto_configure()

client = UniversalPwaClient(config)
result = client.generate()
```

## 📚 Usage

### Scan Project

```python
client = UniversalPwaClient(config)
scan_result = client.scan()

print(f"Framework: {scan_result.framework}")
print(f"Features: {scan_result.features}")
```

### Generate PWA

```python
result = client.generate()

print(f"Manifest: {result.manifest}")
print(f"Service Worker: {result.service_worker}")
print(f"Icons: {result.icons}")
print(f"Stats: {result.stats}")
```

### Validate PWA

```python
validation = client.validate()

print(f"Valid: {validation.valid}")
print(f"Score: {validation.score}")
print(f"Errors: {validation.errors}")
print(f"Suggestions: {validation.suggestions}")
```

## 🔧 Configuration

```python
from universal_pwa import Config

config = Config(
    project_root="/path/to/project",
    app_name="My App",
    app_description="My awesome PWA",
    backend="django",
    generate_icons=True,
    icon_source="/path/to/icon.png",
    api_endpoint="http://localhost:3000",
)

client = UniversalPwaClient(config)
```

## 📖 Documentation

- [Django Integration Guide](docs/DJANGO.md)
- [Flask Integration Guide](docs/FLASK.md)
- [Configuration Reference](docs/CONFIGURATION.md)
- [API Reference](https://docs.universalpwa.dev/sdk/python)

## 🧪 Testing

```bash
pytest
pytest --cov=src/universal_pwa
```

## 📄 License

MIT
