# Configuration Reference - Python SDK

Référence complète de la configuration pour le SDK Python UniversalPWA.

## Configuration de base

### Config Object

```python
from universal_pwa import Config

config = Config(
    project_root="/path/to/project",
    app_name="My App",
    app_description="My awesome PWA",
    backend="django",  # ou "flask", "fastapi"
    generate_icons=True,
    icon_source="/path/to/icon.png",
    api_endpoint="http://localhost:3000",
)
```

### Paramètres disponibles

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `project_root` | `str` | **requis** | Chemin racine du projet |
| `app_name` | `str` | `None` | Nom de l'application |
| `app_description` | `str` | `None` | Description de l'application |
| `backend` | `str` | `None` | Backend framework (`django`, `flask`, `fastapi`) |
| `generate_icons` | `bool` | `True` | Générer les icônes PWA |
| `icon_source` | `str` | `None` | Chemin vers l'icône source |
| `manifest_path` | `str` | `"static/manifest.json"` | Chemin du manifest |
| `service_worker_path` | `str` | `"static/sw.js"` | Chemin du service worker |
| `api_endpoint` | `str` | `None` | Endpoint de l'API UniversalPWA |
| `timeout` | `int` | `30` | Timeout pour les requêtes API (secondes) |
| `auto_detect_backend` | `bool` | `True` | Détection automatique du backend |

## Configuration Django

### Auto-configuration

```python
from universal_pwa.backends import DjangoIntegration

# Détection automatique depuis settings.py
integration = DjangoIntegration(settings_module='myproject.settings')
config = integration.auto_configure()
```

### Configuration manuelle

```python
from universal_pwa import Config

config = Config(
    project_root="/path/to/django/project",
    app_name="My Django App",
    backend="django",
    manifest_path="static/manifest.json",
    service_worker_path="static/sw.js",
)
```

### Paramètres Django spécifiques

Le `DjangoIntegration` détecte automatiquement :

- **Version Django** : Depuis `requirements.txt` ou `pyproject.toml`
- **ASGI/WSGI** : Détection automatique via `asgi.py` ou `settings.py`
- **Static files** : `STATIC_URL` et `STATIC_ROOT` depuis `settings.py`
- **Django REST Framework** : Détection automatique

## Configuration Flask

### Auto-configuration

```python
from flask import Flask
from universal_pwa.backends import FlaskIntegration

app = Flask(__name__)
integration = FlaskIntegration(app)
config = integration.auto_configure()
```

### Configuration manuelle

```python
from universal_pwa import Config

config = Config(
    project_root="/path/to/flask/project",
    app_name="My Flask App",
    backend="flask",
    manifest_path="static/manifest.json",
    service_worker_path="static/sw.js",
)
```

### Paramètres Flask spécifiques

Le `FlaskIntegration` détecte automatiquement :

- **Version Flask** : Depuis `requirements.txt` ou `pyproject.toml`
- **Static folder** : `static_folder` depuis l'app Flask
- **Flask-WTF** : Détection automatique pour CSRF
- **Flask-RESTful** : Détection automatique

## Configuration du manifest.json

### Génération automatique

Le manifest est généré automatiquement avec les paramètres suivants :

```python
config = Config(
    app_name="My App",
    app_description="My awesome PWA",
    theme_color="#3B82F6",
    background_color="#ffffff",
    display="standalone",
    start_url="/",
    scope="/",
)
```

### Paramètres du manifest

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `name` | `str` | `app_name` | Nom complet de l'application |
| `short_name` | `str` | `app_name[:12]` | Nom court de l'application |
| `description` | `str` | `app_description` | Description de l'application |
| `start_url` | `str` | `"/"` | URL de démarrage |
| `scope` | `str` | `"/"` | Scope de l'application |
| `display` | `str` | `"standalone"` | Mode d'affichage |
| `theme_color` | `str` | `"#3B82F6"` | Couleur du thème |
| `background_color` | `str` | `"#ffffff"` | Couleur de fond |
| `icons` | `list` | Généré automatiquement | Liste des icônes |

## Configuration du Service Worker

### Stratégies de cache

Le service worker utilise différentes stratégies selon le type de ressource :

- **Static files** (`/static/**`) : `CacheFirst` (30 jours)
- **Media files** (`/media/**`) : `CacheFirst` (7 jours) - Django uniquement
- **API routes** (`/api/**`) : `NetworkFirst` (5 minutes)
- **Admin routes** (`/admin/**`) : `NetworkOnly` - Toujours frais
- **CSRF tokens** (`/csrf-token/**`) : `NetworkOnly` - Toujours frais

### Configuration personnalisée

Pour personnaliser les stratégies de cache, utilisez le backend integration :

```python
from universal_pwa.backends import DjangoIntegration

integration = DjangoIntegration(project_root="/path/to/project")
config = integration.generate_service_worker_config()

# Modifier la configuration
config['runtimeCaching'].append({
    'pattern': '/custom-route/**',
    'strategy': 'StaleWhileRevalidate',
    'options': {
        'cacheName': 'custom-cache',
        'expiration': {
            'maxEntries': 50,
            'maxAgeSeconds': 3600,
        },
    },
})
```

## Variables d'environnement

Vous pouvez utiliser des variables d'environnement pour la configuration :

```bash
export UNIVERSAL_PWA_API_ENDPOINT="http://localhost:3000"
export UNIVERSAL_PWA_TIMEOUT="60"
export UNIVERSAL_PWA_AUTO_DETECT_BACKEND="true"
```

```python
import os
from universal_pwa import Config

config = Config(
    project_root="/path/to/project",
    api_endpoint=os.getenv('UNIVERSAL_PWA_API_ENDPOINT'),
    timeout=int(os.getenv('UNIVERSAL_PWA_TIMEOUT', '30')),
)
```

## Configuration multi-environnement

### Développement

```python
# config/development.py
config = Config(
    project_root="/path/to/project",
    api_endpoint="http://localhost:3000",
    generate_icons=False,  # Plus rapide en dev
)
```

### Production

```python
# config/production.py
config = Config(
    project_root="/path/to/project",
    api_endpoint="https://api.universalpwa.dev",
    generate_icons=True,
    timeout=60,
)
```

## Validation de la configuration

```python
from universal_pwa import Config, ConfigException

try:
    config = Config(
        project_root="/path/to/project",
        app_name="My App",
    )
    # Validation automatique
except ConfigException as e:
    print(f"Configuration error: {e}")
```

## Exemples de configuration complète

### Django - Production

```python
from universal_pwa.backends import DjangoIntegration
from universal_pwa import UniversalPwaClient

integration = DjangoIntegration(settings_module='myproject.settings')
config = integration.auto_configure()

# Override pour la production
config.app_name = "My Django App - Production"
config.theme_color = "#1E40AF"

client = UniversalPwaClient(config)
result = client.generate()
```

### Flask - Développement

```python
from flask import Flask
from universal_pwa.backends import FlaskIntegration
from universal_pwa import UniversalPwaClient

app = Flask(__name__)
app.config['DEBUG'] = True

integration = FlaskIntegration(app)
config = integration.auto_configure()

# Override pour le développement
config.generate_icons = False  # Plus rapide

client = UniversalPwaClient(config)
result = client.generate()
```

## Dépannage

### Erreur : "Project root does not exist"

Vérifiez que le chemin `project_root` est correct et accessible :

```python
from pathlib import Path

project_root = Path("/path/to/project")
if not project_root.exists():
    raise ValueError(f"Project root does not exist: {project_root}")
```

### Erreur : "Backend not detected"

Activez la détection manuelle :

```python
config = Config(
    project_root="/path/to/project",
    backend="django",  # Forcer le backend
    auto_detect_backend=False,
)
```

### Erreur : "API endpoint not available"

Vérifiez que l'endpoint API est accessible :

```python
import requests

try:
    response = requests.get("http://localhost:3000/health", timeout=5)
    if response.status_code == 200:
        print("API endpoint is available")
except:
    print("API endpoint is not available")
```
