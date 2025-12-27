# Diagnostic et Résolution - Bouton d'Installation PWA

## Problème
Le bouton d'installation PWA n'apparaît pas sur backnfood.fr

## Causes Possibles

### 1. Code d'installation non injecté (Version CLI < 1.3.1)
Si vous avez généré la PWA avant la version 1.3.1, le code d'installation n'a pas été injecté.

**Solution :** Régénérer la PWA avec la dernière version du CLI

```bash
# 1. Mettre à jour le CLI
npm install -g @julien-lin/universal-pwa-cli@latest

# 2. Builder votre projet
npm run build

# 3. Régénérer la PWA
universal-pwa init --output-dir dist --icon-source ./logo.png
```

### 2. Manifest.json invalide ou incomplet

**Vérifications à faire :**

1. Ouvrir `https://backnfood.fr/manifest.json` dans le navigateur
2. Vérifier que le manifest contient :
   - `"display": "standalone"` ou `"fullscreen"` (pas `"browser"`)
   - Une icône `192x192` minimum (obligatoire)
   - `"start_url": "/"` (doit être valide)
   - `"name"` et `"short_name"` définis

**Exemple de manifest valide :**
```json
{
  "name": "Back'n Food",
  "short_name": "BacknFood",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#ffffff",
  "background_color": "#000000",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 3. Service Worker non actif

**Vérification :**
- Ouvrir DevTools → Application → Service Workers
- Vérifier que le service worker est "activated" (pas "waiting" ou "redundant")
- Vérifier qu'il n'y a pas d'erreurs dans la console

### 4. Critères d'installabilité non remplis

Le navigateur ne déclenche `beforeinstallprompt` que si **TOUS** ces critères sont remplis :

✅ **HTTPS** (ou localhost) - ✅ backnfood.fr est en HTTPS
✅ **Manifest valide** avec `display: "standalone"`
✅ **Icône 192x192** présente et accessible
✅ **Service Worker actif** et enregistré
✅ **Visite récente** (l'utilisateur doit avoir visité le site au moins une fois)
✅ **Pas déjà installé** (si l'app est déjà installée, l'événement ne se déclenche pas)

### 5. Code d'installation présent mais bouton non ajouté dans l'app

Même si le code est injecté, vous devez **ajouter le bouton dans votre application React**.

## Solution Complète

### Étape 1 : Vérifier le HTML généré

Ouvrir `https://backnfood.fr` → View Source (ou DevTools → Elements)

**Rechercher dans le HTML :**
```html
<script>
// PWA Install Handler
let deferredPrompt = null;
...
window.installPWA = function() {
  ...
};
</script>
```

**Si ce code n'est PAS présent :** Le CLI n'a pas injecté le code → Régénérer la PWA

### Étape 2 : Vérifier dans la Console

Ouvrir DevTools → Console

**Tester manuellement :**
```javascript
// Vérifier si les fonctions sont disponibles
console.log('installPWA:', typeof window.installPWA)
console.log('isPWAInstallable:', typeof window.isPWAInstallable)
console.log('isPWAInstalled:', typeof window.isPWAInstalled)

// Vérifier l'état
if (window.isPWAInstallable) {
  console.log('Installable:', window.isPWAInstallable())
}
if (window.isPWAInstalled) {
  console.log('Installed:', window.isPWAInstalled())
}
```

**Si les fonctions ne sont pas définies :** Le code n'a pas été injecté → Régénérer la PWA

### Étape 3 : Ajouter le bouton dans votre application React

**Option A : Utiliser le hook personnalisé (recommandé)**

```tsx
// Dans votre composant Header/Navbar
import { useState, useEffect } from 'react'

function InstallButton() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Vérifier l'état initial
    if (window.isPWAInstalled) {
      setIsInstalled(window.isPWAInstalled())
    }
    if (window.isPWAInstallable) {
      setIsInstallable(window.isPWAInstallable())
    }

    // Écouter les événements personnalisés
    const handleInstallable = () => {
      console.log('PWA devient installable')
      setIsInstallable(true)
    }
    
    const handleInstalled = () => {
      console.log('PWA installée')
      setIsInstalled(true)
      setIsInstallable(false)
    }

    window.addEventListener('pwa-installable', handleInstallable)
    window.addEventListener('pwa-installed', handleInstalled)

    // Vérifier périodiquement (au cas où l'événement serait manqué)
    const interval = setInterval(() => {
      if (window.isPWAInstallable) {
        setIsInstallable(window.isPWAInstallable())
      }
      if (window.isPWAInstalled) {
        setIsInstalled(window.isPWAInstalled())
      }
    }, 1000)

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable)
      window.removeEventListener('pwa-installed', handleInstalled)
      clearInterval(interval)
    }
  }, [])

  if (isInstalled || !isInstallable) {
    return null
  }

  const handleInstall = async () => {
    if (window.installPWA) {
      try {
        await window.installPWA()
        console.log('Installation déclenchée')
      } catch (error) {
        console.error('Erreur installation:', error)
      }
    }
  }

  return (
    <button
      onClick={handleInstall}
      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
    >
      Installer l'app
    </button>
  )
}
```

**Option B : Version simple (sans hook)**

```tsx
function InstallButton() {
  const handleInstall = () => {
    if (window.installPWA) {
      window.installPWA().catch(console.error)
    }
  }

  // Ne pas afficher si déjà installé ou non installable
  if (window.isPWAInstalled?.() || !window.isPWAInstallable?.()) {
    return null
  }

  return (
    <button onClick={handleInstall}>
      Installer l'app
    </button>
  )
}
```

### Étape 4 : Tester l'installabilité

**Dans la console du navigateur :**

```javascript
// 1. Vérifier le manifest
fetch('/manifest.json')
  .then(r => r.json())
  .then(m => {
    console.log('Manifest:', m)
    console.log('Display:', m.display)
    console.log('Icons:', m.icons)
    console.log('Has 192x192:', m.icons?.some(i => i.sizes === '192x192'))
  })

// 2. Vérifier le service worker
navigator.serviceWorker.getRegistration()
  .then(reg => {
    console.log('SW registered:', reg !== null)
    console.log('SW state:', reg?.active?.state)
  })

// 3. Vérifier l'installabilité
if (window.isPWAInstallable) {
  console.log('Installable:', window.isPWAInstallable())
} else {
  console.log('⚠️ Fonction isPWAInstallable non disponible - code non injecté')
}
```

## Dépannage Avancé

### L'événement beforeinstallprompt ne se déclenche jamais

**Causes possibles :**
1. L'app est déjà installée
2. Le manifest.json n'est pas valide
3. L'icône 192x192 est manquante ou inaccessible
4. Le service worker n'est pas actif
5. Le navigateur ne supporte pas l'installation PWA (ex: Safari iOS < 16.4)

**Solution :**
- Vérifier chaque critère un par un
- Utiliser Chrome DevTools → Application → Manifest pour voir les erreurs
- Vérifier que l'URL du manifest est correcte dans le HTML : `<link rel="manifest" href="/manifest.json">`

### Le bouton apparaît mais l'installation échoue

**Vérifier :**
- Console pour les erreurs
- Que `window.installPWA()` est bien appelé
- Que `deferredPrompt` n'est pas null

**Debug :**
```javascript
// Dans la console
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt déclenché!', e)
})
```

## Checklist Finale

- [ ] CLI mis à jour à la version 1.3.1+
- [ ] PWA régénérée avec `universal-pwa init --output-dir dist`
- [ ] Manifest.json valide et accessible
- [ ] Icône 192x192 présente
- [ ] Service worker actif
- [ ] Code d'installation présent dans le HTML
- [ ] Fonctions `window.installPWA()` disponibles
- [ ] Bouton ajouté dans l'application React
- [ ] Testé sur HTTPS (pas localhost uniquement)
- [ ] Console sans erreurs

## Support

Si le problème persiste après avoir suivi toutes ces étapes :
1. Vérifier la console du navigateur pour les erreurs
2. Vérifier que tous les fichiers PWA sont bien copiés sur le serveur
3. Tester avec un navigateur différent (Chrome, Edge)
4. Vérifier que le site n'est pas déjà installé (désinstaller d'abord)

