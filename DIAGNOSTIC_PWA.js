/**
 * Script de diagnostic PWA - À exécuter dans la console du navigateur
 * 
 * Copiez-collez ce script dans la console de votre navigateur (F12)
 * sur https://backnfood.fr pour diagnostiquer les problèmes d'installation PWA
 */

console.log('🔍 Diagnostic PWA - Back\'n Food\n')

// 1. Vérifier le manifest
console.log('1️⃣ Vérification du manifest.json...')
fetch('/manifest.json')
  .then(async (response) => {
    if (!response.ok) {
      console.error('❌ Manifest.json non accessible:', response.status)
      return
    }
    const manifest = await response.json()
    console.log('✅ Manifest accessible')
    console.log('   - Name:', manifest.name)
    console.log('   - Short name:', manifest.short_name)
    console.log('   - Display:', manifest.display)
    console.log('   - Start URL:', manifest.start_url)
    
    // Vérifier display
    if (manifest.display !== 'standalone' && manifest.display !== 'fullscreen') {
      console.error('❌ Display doit être "standalone" ou "fullscreen", actuel:', manifest.display)
    } else {
      console.log('✅ Display valide:', manifest.display)
    }
    
    // Vérifier les icônes
    const icons = manifest.icons || []
    const has192 = icons.some(i => i.sizes === '192x192' || i.sizes?.includes('192x192'))
    const has512 = icons.some(i => i.sizes === '512x512' || i.sizes?.includes('512x512'))
    
    console.log('   - Icônes:', icons.length)
    if (has192) {
      console.log('✅ Icône 192x192 présente')
    } else {
      console.error('❌ Icône 192x192 MANQUANTE (obligatoire)')
    }
    if (has512) {
      console.log('✅ Icône 512x512 présente')
    } else {
      console.warn('⚠️ Icône 512x512 manquante (recommandée)')
    }
    
    return manifest
  })
  .catch((error) => {
    console.error('❌ Erreur lors du chargement du manifest:', error)
  })

// 2. Vérifier le service worker
console.log('\n2️⃣ Vérification du service worker...')
navigator.serviceWorker.getRegistration()
  .then((registration) => {
    if (!registration) {
      console.error('❌ Service Worker non enregistré')
      return
    }
    
    console.log('✅ Service Worker enregistré')
    console.log('   - Scope:', registration.scope)
    console.log('   - Update via cache:', registration.updateViaCache)
    
    if (registration.active) {
      console.log('✅ Service Worker ACTIF')
      console.log('   - State:', registration.active.state)
      console.log('   - Script URL:', registration.active.scriptURL)
    } else if (registration.installing) {
      console.warn('⚠️ Service Worker en cours d\'installation')
    } else if (registration.waiting) {
      console.warn('⚠️ Service Worker en attente')
    } else {
      console.error('❌ Service Worker non actif')
    }
  })
  .catch((error) => {
    console.error('❌ Erreur Service Worker:', error)
  })

// 3. Vérifier le code d'installation
console.log('\n3️⃣ Vérification du code d\'installation...')
if (typeof window.installPWA === 'function') {
  console.log('✅ window.installPWA() disponible')
} else {
  console.error('❌ window.installPWA() NON DISPONIBLE')
  console.error('   → Le code d\'installation n\'a pas été injecté')
  console.error('   → Régénérez la PWA avec: universal-pwa init --output-dir dist')
}

if (typeof window.isPWAInstallable === 'function') {
  console.log('✅ window.isPWAInstallable() disponible')
  const installable = window.isPWAInstallable()
  console.log('   - Installable:', installable)
  if (!installable) {
    console.warn('⚠️ L\'app n\'est pas installable actuellement')
    console.warn('   → Vérifiez que tous les critères sont remplis')
  }
} else {
  console.error('❌ window.isPWAInstallable() NON DISPONIBLE')
}

if (typeof window.isPWAInstalled === 'function') {
  console.log('✅ window.isPWAInstalled() disponible')
  const installed = window.isPWAInstalled()
  console.log('   - Déjà installée:', installed)
  if (installed) {
    console.warn('⚠️ L\'app est déjà installée - le bouton ne s\'affichera pas')
  }
} else {
  console.error('❌ window.isPWAInstalled() NON DISPONIBLE')
}

// 4. Vérifier HTTPS
console.log('\n4️⃣ Vérification HTTPS...')
if (location.protocol === 'https:') {
  console.log('✅ HTTPS activé')
} else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  console.log('✅ Localhost (OK pour développement)')
} else {
  console.error('❌ HTTPS requis pour la production')
}

// 5. Vérifier si l'app est déjà installée
console.log('\n5️⃣ Vérification de l\'état d\'installation...')
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('✅ App déjà installée (standalone mode)')
} else if (window.navigator.standalone === true) {
  console.log('✅ App déjà installée (iOS)')
} else {
  console.log('ℹ️ App non installée')
}

// 6. Test de l'événement beforeinstallprompt
console.log('\n6️⃣ Test de l\'événement beforeinstallprompt...')
let beforeInstallPromptFired = false
const testListener = (e) => {
  beforeInstallPromptFired = true
  console.log('✅ beforeinstallprompt déclenché!', e)
  e.preventDefault()
}

window.addEventListener('beforeinstallprompt', testListener, { once: true })

// Attendre 3 secondes pour voir si l'événement se déclenche
setTimeout(() => {
  if (!beforeInstallPromptFired) {
    console.warn('⚠️ beforeinstallprompt non déclenché après 3 secondes')
    console.warn('   Causes possibles:')
    console.warn('   - App déjà installée')
    console.warn('   - Manifest invalide')
    console.warn('   - Icône 192x192 manquante')
    console.warn('   - Service worker non actif')
    console.warn('   - Navigateur ne supporte pas l\'installation PWA')
  }
  window.removeEventListener('beforeinstallprompt', testListener)
}, 3000)

// 7. Résumé
console.log('\n📋 Résumé:')
setTimeout(() => {
  console.log('\n✅ Si toutes les vérifications sont OK mais le bouton n\'apparaît pas:')
  console.log('   1. Vérifiez que vous avez ajouté le bouton dans votre code React')
  console.log('   2. Vérifiez que window.isPWAInstallable() retourne true')
  console.log('   3. Vérifiez la console pour les erreurs')
  console.log('   4. Testez avec un autre navigateur (Chrome, Edge)')
}, 3500)

