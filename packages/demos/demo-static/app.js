// Test offline functionality
document.getElementById('test-offline').addEventListener('click', () => {
  const status = document.getElementById('status')
  if ('serviceWorker' in navigator) {
    status.textContent = 'Service Worker disponible !'
    status.style.background = '#2ecc71'
    status.style.color = 'white'
  } else {
    status.textContent = 'Service Worker non disponible'
    status.style.background = '#e74c3c'
    status.style.color = 'white'
  }
})

// Check if app is installed
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('App is running in standalone mode')
}

