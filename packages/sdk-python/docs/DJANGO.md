## Django Integration (SDK Python)

Documentation pour intégrer UniversalPWA dans une application Django.

### Installation

```bash
pip install universal-pwa-python
```

### Configuration

#### Méthode 1 : Utilisation du CLI UniversalPWA

La méthode recommandée est d'utiliser le CLI UniversalPWA directement :

```bash
# Depuis la racine de votre projet Django
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir static \
  --name "My Django App" \
  --short-name "MDA" \
  --theme-color "#3B82F6"
```

Cela génère automatiquement :
- `static/manifest.json`
- `static/sw.js`
- Injection des meta tags dans vos templates

#### Méthode 2 : Utilisation du SDK Python

Si vous préférez utiliser le SDK Python directement :

```python
from universal_pwa.backends import DjangoIntegration

# Détection automatique depuis les settings Django
integration = DjangoIntegration(settings_module='myproject.settings')

# Génération de la configuration
config = integration.auto_configure()

# Utilisation avec le client UniversalPWA
from universal_pwa import UniversalPwaClient
client = UniversalPwaClient(config)
result = client.generate()
```

### Configuration Django

#### Settings.py

Ajoutez la configuration PWA dans votre `settings.py` :

```python
# settings.py

# Static files configuration (déjà présent normalement)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# PWA Configuration (optionnel)
PWA_MANIFEST_PATH = STATIC_ROOT / 'manifest.json'
PWA_SW_PATH = STATIC_ROOT / 'sw.js'
PWA_THEME_COLOR = '#3B82F6'
PWA_BACKGROUND_COLOR = '#ffffff'
```

#### URLs Configuration

Assurez-vous que les fichiers statiques sont servis correctement. Dans `urls.py` :

```python
# urls.py
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ... vos URLs
]

# En développement, servir les fichiers statiques
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
```

### Utilisation dans les templates

#### Template de base (base.html)

Dans votre template de base, ajoutez les meta tags PWA :

```django
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    {# PWA Meta Tags #}
    <link rel="manifest" href="{% static 'manifest.json' %}">
    <meta name="theme-color" content="{{ PWA_THEME_COLOR|default:'#3B82F6' }}">
    <link rel="apple-touch-icon" href="{% static 'apple-touch-icon.png' %}">
    <meta name="mobile-web-app-capable" content="yes">
    
    {# CSRF Token (Django) #}
    <meta name="csrf-token" content="{{ csrf_token }}">
    
    <title>{% block title %}My Django App{% endblock %}</title>
</head>
<body>
    {% block content %}{% endblock %}
    
    {# Service Worker Registration #}
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('{% static "sw.js" %}')
                .then(reg => console.log('Service Worker registered:', reg))
                .catch(err => console.error('Service Worker registration failed:', err));
        }
    </script>
</body>
</html>
```

#### Template avec context processor (recommandé)

Créez un context processor pour injecter automatiquement les variables PWA :

```python
# myapp/context_processors.py
from django.conf import settings

def pwa_context(request):
    return {
        'PWA_THEME_COLOR': getattr(settings, 'PWA_THEME_COLOR', '#3B82F6'),
        'PWA_BACKGROUND_COLOR': getattr(settings, 'PWA_BACKGROUND_COLOR', '#ffffff'),
    }
```

Ajoutez-le dans `settings.py` :

```python
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                # ... autres context processors
                'myapp.context_processors.pwa_context',
            ],
        },
    },
]
```

### Génération des fichiers PWA

#### Via CLI (recommandé)

```bash
# Génération complète (manifest + service worker + icônes)
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir static \
  --name "My Django App" \
  --short-name "MDA" \
  --theme-color "#3B82F6" \
  --icon-source path/to/icon.png

# Génération sans icônes (pour tests rapides)
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir static \
  --name "My Django App" \
  --short-name "MDA" \
  --theme-color "#3B82F6" \
  --skip-icons
```

#### Via SDK Python

```python
from universal_pwa.backends import DjangoIntegration
from universal_pwa import UniversalPwaClient

# Détection et configuration automatique
integration = DjangoIntegration(settings_module='myproject.settings')
config = integration.auto_configure()

# Génération
client = UniversalPwaClient(config)
result = client.generate()

print(f"Manifest: {result.manifest}")
print(f"Service Worker: {result.service_worker}")
print(f"Icons: {result.icons}")
```

### Structure des fichiers

Après génération, votre projet Django devrait avoir :

```
myproject/
├── manage.py
├── myproject/
│   ├── settings.py
│   └── urls.py
├── static/
│   ├── manifest.json      # Généré par UniversalPWA
│   ├── sw.js              # Généré par UniversalPWA
│   ├── icon-192x192.png   # Généré par UniversalPWA
│   ├── icon-512x512.png   # Généré par UniversalPWA
│   └── apple-touch-icon.png
└── templates/
    └── base.html          # Avec meta tags PWA
```

### Exemple complet

#### 1. Installation

```bash
pip install universal-pwa-python
```

Le CLI UniversalPWA s’utilise via **npx** (étape suivante), sans installation globale.

#### 2. Génération PWA

```bash
cd /path/to/django/project
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir static \
  --name "My Django App" \
  --short-name "MDA" \
  --theme-color "#3B82F6"
```

#### 3. Configuration Django

```python
# settings.py
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
PWA_THEME_COLOR = '#3B82F6'
```

#### 4. Template

```django
{# templates/base.html #}
{% load static %}
<!DOCTYPE html>
<html>
<head>
    <link rel="manifest" href="{% static 'manifest.json' %}">
    <meta name="theme-color" content="{{ PWA_THEME_COLOR }}">
</head>
<body>
    {% block content %}{% endblock %}
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('{% static "sw.js" %}');
        }
    </script>
</body>
</html>
```

#### 5. Collectstatic

```bash
python manage.py collectstatic
```

### Configuration multi-environnement

Pour différents environnements (dev, staging, prod) :

```python
# settings/base.py
PWA_THEME_COLOR = '#3B82F6'

# settings/production.py
from .base import *
PWA_THEME_COLOR = '#1E40AF'  # Couleur différente en production
```

### Intégration avec Django REST Framework

Si vous utilisez Django REST Framework, le service worker détecte automatiquement les routes `/api/` et les optimise :

```python
# Le service worker généré inclut automatiquement :
# - /api/** : NetworkFirst strategy
# - /admin/** : NetworkOnly strategy
# - /static/** : CacheFirst strategy
```

### Dépannage

#### Les fichiers PWA ne sont pas servis

1. Vérifiez que `STATIC_URL` et `STATIC_ROOT` sont correctement configurés
2. Exécutez `python manage.py collectstatic`
3. Vérifiez que les fichiers sont dans `STATIC_ROOT`

#### Le service worker ne se charge pas

1. Vérifiez que le chemin dans `navigator.serviceWorker.register()` est correct
2. Assurez-vous que l'application est servie en HTTPS (ou localhost)
3. Vérifiez la console du navigateur pour les erreurs

#### Les meta tags ne s'affichent pas

1. Vérifiez que `{% load static %}` est présent dans le template
2. Vérifiez que le context processor est ajouté dans `settings.py`
3. Vérifiez que les variables sont bien passées au template

### Notes importantes

- **HTTPS requis** : Les service workers nécessitent HTTPS en production (ou localhost en développement)
- **Versions Django** : Compatible avec Django 2.2+, 3.x, 4.x, 5.x
- **ASGI/WSGI** : Compatible avec les deux, détection automatique
- **Static files** : Utilisez `collectstatic` en production pour servir les fichiers PWA
