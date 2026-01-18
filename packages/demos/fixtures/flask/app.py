"""
Flask application for UniversalPWA E2E testing.
"""
from flask import Flask, render_template_string

app = Flask(__name__)
app.config['SECRET_KEY'] = 'test-secret-key-for-fixtures-only'

@app.route('/')
def index():
    """Home page."""
    return render_template_string('''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flask Test App</title>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#ef4444">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="csrf-token" content="flask-fixture-token">
</head>
<body>
    <h1>Flask Test App</h1>
    <p>Welcome to the Flask PWA test application.</p>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW registered:', reg))
                .catch(err => console.error('SW registration failed:', err));
        }
        
        window.installPWA = function() {
            // PWA install handler
        };
        
        window.isPWAInstalled = function() {
            return window.matchMedia('(display-mode: standalone)').matches;
        };
        
        window.isPWAInstallable = function() {
            return true;
        };
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
        });
    </script>
</body>
</html>
    ''')

@app.route('/api/test')
def api_test():
    """Test API endpoint."""
    return {'status': 'ok', 'message': 'Flask API test'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)
