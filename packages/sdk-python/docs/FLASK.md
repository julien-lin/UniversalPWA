## Flask Integration (SDK Python)

Documentation pour intégrer UniversalPWA dans une application Flask.

### Installation

```bash
pip install universal-pwa-python
```

### Configuration

#### Méthode 1 : Utilisation du CLI UniversalPWA (recommandé)

La méthode recommandée est d'utiliser le CLI UniversalPWA directement :

```bash
# Depuis la racine de votre projet Flask
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir static \
  --name "My Flask App" \
  --short-name "MFA" \
  --theme-color "#3B82F6"
```

Cela génère automatiquement :
- `static/manifest.json`
- `static/sw.js`
- Injection des meta tags dans vos templates

#### Méthode 2 : Utilisation du SDK Python

Si vous préférez utiliser le SDK Python directement :

```python
from flask import Flask
from universal_pwa.backends import FlaskIntegration

app = Flask(__name__)

# Détection automatique depuis l'app Flask
integration = FlaskIntegration(app)
config = integration.auto_configure()

# Utilisation avec le client UniversalPWA
from universal_pwa import UniversalPwaClient
client = UniversalPwaClient(config)
result = client.generate()
```

### Configuration Flask

#### App.py

Ajoutez la configuration PWA dans votre `app.py` :

```python
# app.py
from flask import Flask, send_from_directory

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'

# PWA Configuration (optionnel)
app.config['PWA_MANIFEST_PATH'] = 'static/manifest.json'
app.config['PWA_SW_PATH'] = 'static/sw.js'
app.config['PWA_THEME_COLOR'] = '#3B82F6'
app.config['PWA_BACKGROUND_COLOR'] = '#ffffff'

# Routes pour servir les fichiers PWA
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/manifest+json')

@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

@app.route('/')
def index():
    return render_template('index.html')
```

### Utilisation dans les templates

#### Template de base (base.html)

Dans votre template de base, ajoutez les meta tags PWA :

```jinja2
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    {# PWA Meta Tags #}
    <link rel="manifest" href="{{ url_for('static', filename='manifest.json') }}">
    <meta name="theme-color" content="{{ config.get('PWA_THEME_COLOR', '#3B82F6') }}">
    <link rel="apple-touch-icon" href="{{ url_for('static', filename='apple-touch-icon.png') }}">
    <meta name="mobile-web-app-capable" content="yes">
    
    {# CSRF Token (Flask-WTF) #}
    {% if csrf_token %}
    <meta name="csrf-token" content="{{ csrf_token }}">
    {% endif %}
    
    <title>{% block title %}My Flask App{% endblock %}</title>
</head>
<body>
    {% block content %}{% endblock %}
    
    {# Service Worker Registration #}
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('{{ url_for("static", filename="sw.js") }}')
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
# app.py
@app.context_processor
def inject_pwa_config():
    return {
        'PWA_THEME_COLOR': app.config.get('PWA_THEME_COLOR', '#3B82F6'),
        'PWA_BACKGROUND_COLOR': app.config.get('PWA_BACKGROUND_COLOR', '#ffffff'),
    }
```

### Génération des fichiers PWA

#### Via CLI (recommandé)

```bash
# Génération complète (manifest + service worker + icônes)
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir static \
  --name "My Flask App" \
  --short-name "MFA" \
  --theme-color "#3B82F6" \
  --icon-source path/to/icon.png

# Génération sans icônes (pour tests rapides)
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir static \
  --name "My Flask App" \
  --short-name "MFA" \
  --theme-color "#3B82F6" \
  --skip-icons
```

#### Via SDK Python

```python
from flask import Flask
from universal_pwa.backends import FlaskIntegration
from universal_pwa import UniversalPwaClient

app = Flask(__name__)

# Détection et configuration automatique
integration = FlaskIntegration(app)
config = integration.auto_configure()

# Génération
client = UniversalPwaClient(config)
result = client.generate()

print(f"Manifest: {result.manifest}")
print(f"Service Worker: {result.service_worker}")
print(f"Icons: {result.icons}")
```

### Structure des fichiers

Après génération, votre projet Flask devrait avoir :

```
myapp/
├── app.py
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
pip install universal-pwa-python flask
```

Le CLI UniversalPWA s’utilise via **npx** (étape suivante), sans installation globale.

#### 2. Génération PWA

```bash
cd /path/to/flask/project
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir static \
  --name "My Flask App" \
  --short-name "MFA" \
  --theme-color "#3B82F6"
```

#### 3. Configuration Flask

```python
# app.py
from flask import Flask, render_template, send_from_directory

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['PWA_THEME_COLOR'] = '#3B82F6'

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/manifest+json')

@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
```

#### 4. Template

```jinja2
{# templates/base.html #}
<!DOCTYPE html>
<html>
<head>
    <link rel="manifest" href="{{ url_for('static', filename='manifest.json') }}">
    <meta name="theme-color" content="{{ config.get('PWA_THEME_COLOR', '#3B82F6') }}">
</head>
<body>
    {% block content %}{% endblock %}
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('{{ url_for("static", filename="sw.js") }}');
        }
    </script>
</body>
</html>
```

### Intégration avec Flask-WTF (CSRF)

Si vous utilisez Flask-WTF pour la protection CSRF, le service worker détecte automatiquement et optimise les routes :

```python
# app.py
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)
csrf = CSRFProtect(app)

# Le service worker généré inclut automatiquement :
# - /csrf-token/** : NetworkOnly strategy
# - /api/** : NetworkFirst strategy avec credentials
```

### Intégration avec Flask-RESTful

Si vous utilisez Flask-RESTful, le service worker détecte automatiquement les routes API :

```python
# app.py
from flask_restful import Api, Resource

app = Flask(__name__)
api = Api(app)

# Le service worker généré inclut automatiquement :
# - /api/** : NetworkFirst strategy
# - /api/v1/** : NetworkFirst strategy
# - /api/v2/** : NetworkFirst strategy
```

### Blueprint pour PWA (optionnel)

Pour une meilleure organisation, créez un blueprint PWA :

```python
# blueprints/pwa.py
from flask import Blueprint, send_from_directory, current_app

pwa_bp = Blueprint('pwa', __name__)

@pwa_bp.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/manifest+json')

@pwa_bp.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

# app.py
from blueprints.pwa import pwa_bp
app.register_blueprint(pwa_bp)
```

### Configuration multi-environnement

Pour différents environnements (dev, staging, prod) :

```python
# config.py
class Config:
    PWA_THEME_COLOR = '#3B82F6'

class ProductionConfig(Config):
    PWA_THEME_COLOR = '#1E40AF'  # Couleur différente en production

# app.py
app.config.from_object(ProductionConfig if not app.debug else Config)
```

### Dépannage

#### Les fichiers PWA ne sont pas servis

1. Vérifiez que les routes `/manifest.json` et `/sw.js` sont définies
2. Vérifiez que les fichiers sont dans le dossier `static/`
3. Vérifiez que `static_folder` est correctement configuré dans Flask

#### Le service worker ne se charge pas

1. Vérifiez que le chemin dans `navigator.serviceWorker.register()` est correct
2. Assurez-vous que l'application est servie en HTTPS (ou localhost)
3. Vérifiez la console du navigateur pour les erreurs

#### Les meta tags ne s'affichent pas

1. Vérifiez que le context processor est bien défini
2. Vérifiez que les variables sont bien passées au template
3. Vérifiez que `url_for('static', ...)` fonctionne correctement

### Notes importantes

- **HTTPS requis** : Les service workers nécessitent HTTPS en production (ou localhost en développement)
- **Versions Flask** : Compatible avec Flask 1.x, 2.x, 3.x
- **Static files** : Par défaut, Flask sert les fichiers statiques depuis le dossier `static/`
- **Flask-WTF** : Détection automatique pour la protection CSRF
