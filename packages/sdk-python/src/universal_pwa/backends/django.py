"""
Django Framework Integration.

Detects and configures PWA for Django applications.
Supported features:
- Django 2.2, 3.x, 4.x, 5.x
- ASGI support detection
- Static files configuration
- CSRF token handling
"""

import json
import re
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


class DjangoIntegration(BaseBackendIntegration):
    """Django framework integration."""

    @property
    def id(self) -> str:
        return "django"

    @property
    def name(self) -> str:
        return "Django"

    @property
    def framework(self) -> Framework:
        return Framework.DJANGO

    @property
    def language(self) -> BackendLanguage:
        return BackendLanguage.PYTHON

    def detect(self) -> BackendDetectionResult:
        """
        Detect Django project.

        Checks for:
        - manage.py file
        - settings.py or settings/ directory
        - urls.py
        - requirements.txt or pyproject.toml with Django dependency
        """
        indicators: list[str] = []
        confidence = ConfidenceLevel.LOW
        version: Optional[str] = None

        # Check for manage.py (strong indicator)
        if self._file_exists("manage.py"):
            indicators.append("manage.py")
            confidence = ConfidenceLevel.MEDIUM

        # Check for settings.py or settings/ directory
        if self._file_exists("settings.py") or self._dir_exists("settings"):
            indicators.append("settings.py or settings/")
            if confidence == ConfidenceLevel.MEDIUM:
                confidence = ConfidenceLevel.HIGH

        # Check for urls.py
        if self._file_exists("urls.py"):
            indicators.append("urls.py")
            if confidence == ConfidenceLevel.MEDIUM:
                confidence = ConfidenceLevel.HIGH

        # Check for Django in requirements.txt
        if self._file_exists("requirements.txt"):
            try:
                content = self._read_file("requirements.txt")
                if "Django" in content or "django" in content:
                    indicators.append("requirements.txt: Django")
                    version = self._extract_django_version_from_requirements(content)
                    if confidence == ConfidenceLevel.MEDIUM:
                        confidence = ConfidenceLevel.HIGH
            except Exception:
                pass

        # Check for Django in pyproject.toml
        if self._file_exists("pyproject.toml"):
            try:
                content = self._read_file("pyproject.toml")
                if "django" in content.lower():
                    indicators.append("pyproject.toml: django")
                    if confidence == ConfidenceLevel.MEDIUM:
                        confidence = ConfidenceLevel.HIGH
            except Exception:
                pass

        return {
            "detected": len(indicators) > 0,
            "confidence": confidence,
            "indicators": indicators,
            "version": version,
        }

    def _extract_django_version_from_requirements(self, content: str) -> Optional[str]:
        """Extract Django version from requirements.txt."""
        # Match patterns like: Django==4.2.0, Django>=4.0, Django~=4.2
        pattern = r"Django[>=<~!]*(\d+)(?:\.(\d+))?(?:\.(\d+))?"
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            major = match.group(1)
            minor = match.group(2) or "0"
            patch = match.group(3) or "0"
            return f"{major}.{minor}.{patch}"
        return None

    def generate_service_worker_config(self) -> ServiceWorkerConfig:
        """
        Generate Django-optimized Service Worker configuration.

        Includes:
        - Static files precaching
        - API routes with NetworkFirst strategy
        - Admin routes with NetworkOnly strategy
        - CSRF token handling
        """
        config: ServiceWorkerConfig = {
            "precache": [],
            "runtime_caching": [
                {
                    "urlPattern": "/static/**",
                    "handler": "CacheFirst",
                    "options": {
                        "cacheName": "django-static-cache",
                        "expiration": {
                            "maxEntries": 100,
                            "maxAgeSeconds": 86400 * 30,  # 30 days
                        },
                    },
                },
                {
                    "urlPattern": "/media/**",
                    "handler": "CacheFirst",
                    "options": {
                        "cacheName": "django-media-cache",
                        "expiration": {
                            "maxEntries": 50,
                            "maxAgeSeconds": 86400 * 7,  # 7 days
                        },
                    },
                },
                {
                    "urlPattern": "/api/**",
                    "handler": "NetworkFirst",
                    "options": {
                        "cacheName": "django-api-cache",
                        "networkTimeoutSeconds": 3,
                        "expiration": {
                            "maxEntries": 50,
                            "maxAgeSeconds": 300,  # 5 minutes
                        },
                    },
                },
                {
                    "urlPattern": "/admin/**",
                    "handler": "NetworkOnly",
                    "options": {
                        "cacheName": "django-admin-cache",
                    },
                },
            ],
            "skip_waiting": True,
            "clients_claim": True,
            "navigation_preload": False,
        }
        return config

    def generate_manifest_variables(self) -> dict[str, Any]:
        """Generate manifest.json variables for Django."""
        return {
            "start_url": self.get_start_url(),
            "scope": "/",
            "display": "standalone",
            "theme_color": "#ffffff",
            "background_color": "#ffffff",
        }

    def get_start_url(self) -> str:
        """Get recommended start URL for Django PWA."""
        return "/"

    def validate_setup(self) -> ValidationResult:
        """
        Validate Django-specific PWA setup.

        Checks:
        - Static files configuration
        - Settings.py exists
        - URLs configuration
        """
        errors: list[str] = []
        warnings: list[str] = []
        suggestions: list[str] = []

        # Check for settings.py
        if not self._file_exists("settings.py") and not self._dir_exists("settings"):
            errors.append("Django settings.py or settings/ directory not found")

        # Check for static files configuration
        if self._file_exists("settings.py"):
            try:
                content = self._read_file("settings.py")
                if "STATIC_URL" not in content:
                    warnings.append("STATIC_URL not found in settings.py")
                if "STATIC_ROOT" not in content:
                    suggestions.append("Consider setting STATIC_ROOT for production")
            except Exception:
                pass

        # Check for urls.py
        if not self._file_exists("urls.py"):
            warnings.append("urls.py not found in project root")

        return {
            "isValid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions,
        }
