"""
Flask Framework Integration.

Detects and configures PWA for Flask applications.
"""

from pathlib import Path
from typing import Optional, Any

from .base import BaseBackendIntegration
from .types import (
    BackendDetectionResult,
    BackendLanguage,
    Framework,
    ConfidenceLevel,
    ServiceWorkerConfig,
    ValidationResult,
)


class FlaskIntegration(BaseBackendIntegration):
    """Flask framework integration."""

    @property
    def id(self) -> str:
        return "flask"

    @property
    def name(self) -> str:
        return "Flask"

    @property
    def framework(self) -> Framework:
        return Framework.FLASK

    @property
    def language(self) -> BackendLanguage:
        return BackendLanguage.PYTHON

    def detect(self) -> BackendDetectionResult:
        """
        Detect Flask project.

        Checks for:
        - app.py or application.py
        - requirements.txt with Flask
        - Flask app structure
        """
        indicators: list[str] = []
        confidence = ConfidenceLevel.LOW

        # Check for app.py or application.py
        if self._file_exists("app.py") or self._file_exists("application.py"):
            indicators.append("app.py or application.py")
            confidence = ConfidenceLevel.MEDIUM

        # Check for Flask in requirements.txt
        if self._file_exists("requirements.txt"):
            try:
                content = self._read_file("requirements.txt")
                if "Flask" in content or "flask" in content:
                    indicators.append("requirements.txt: Flask")
                    if confidence == ConfidenceLevel.MEDIUM:
                        confidence = ConfidenceLevel.HIGH
            except Exception:
                pass

        # Check for typical Flask structure
        if self._dir_exists("templates") or self._dir_exists("static"):
            indicators.append("Flask structure (templates/ or static/)")
            if confidence == ConfidenceLevel.MEDIUM:
                confidence = ConfidenceLevel.HIGH

        return {
            "detected": len(indicators) > 0,
            "confidence": confidence,
            "indicators": indicators,
            "version": None,
        }

    def generate_service_worker_config(self) -> ServiceWorkerConfig:
        """
        Generate Flask-optimized Service Worker configuration.
        """
        config: ServiceWorkerConfig = {
            "precache": [],
            "runtime_caching": [
                {
                    "urlPattern": "/static/**",
                    "handler": "CacheFirst",
                    "options": {
                        "cacheName": "flask-static-cache",
                        "expiration": {
                            "maxEntries": 100,
                            "maxAgeSeconds": 86400 * 30,
                        },
                    },
                },
                {
                    "urlPattern": "/api/**",
                    "handler": "NetworkFirst",
                    "options": {
                        "cacheName": "flask-api-cache",
                        "networkTimeoutSeconds": 3,
                        "expiration": {
                            "maxEntries": 50,
                            "maxAgeSeconds": 300,
                        },
                    },
                },
            ],
            "skip_waiting": True,
            "clients_claim": True,
            "navigation_preload": False,
        }
        return config

    def generate_manifest_variables(self) -> dict[str, Any]:
        """Generate manifest.json variables for Flask."""
        return {
            "start_url": self.get_start_url(),
            "scope": "/",
            "display": "standalone",
            "theme_color": "#ffffff",
            "background_color": "#ffffff",
        }

    def get_start_url(self) -> str:
        """Get recommended start URL for Flask PWA."""
        return "/"

    def validate_setup(self) -> ValidationResult:
        """Validate Flask-specific PWA setup."""
        errors: list[str] = []
        warnings: list[str] = []
        suggestions: list[str] = []

        # Check for app.py or application.py
        if not self._file_exists("app.py") and not self._file_exists("application.py"):
            warnings.append("app.py or application.py not found")

        return {
            "isValid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions,
        }
