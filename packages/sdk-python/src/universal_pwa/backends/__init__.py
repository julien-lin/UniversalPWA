"""
Django integration for UniversalPWA SDK.
"""

from typing import Optional, Dict, Any
from .client import UniversalPwaClient
from .config import Config


class DjangoIntegration:
    """Django-specific PWA integration."""

    def __init__(self, settings_module: Optional[str] = None):
        """
        Initialize Django integration.

        Args:
            settings_module: Django settings module name
        """
        import django
        from django.conf import settings

        if not settings.configured:
            if settings_module:
                import os

                os.environ.setdefault("DJANGO_SETTINGS_MODULE", settings_module)
            django.setup()

        self.settings = settings

    def auto_configure(self) -> Config:
        """
        Automatically detect Django project configuration.

        Returns:
            Config object with Django settings applied
        """
        config = Config(
            project_root=self.settings.BASE_DIR,
            app_name=getattr(self.settings, "APP_NAME", None),
            app_description=getattr(self.settings, "APP_DESCRIPTION", None),
            backend="django",
            generate_icons=True,
            manifest_path=self._get_manifest_path(),
            service_worker_path=self._get_sw_path(),
        )
        return config

    def _get_manifest_path(self) -> str:
        """Get manifest.json path from Django static settings."""
        return getattr(self.settings, "PWA_MANIFEST_PATH", "static/manifest.json")

    def _get_sw_path(self) -> str:
        """Get service worker path from Django static settings."""
        return getattr(self.settings, "PWA_SW_PATH", "static/sw.js")


class FlaskIntegration:
    """Flask-specific PWA integration."""

    def __init__(self, app=None):
        """
        Initialize Flask integration.

        Args:
            app: Flask application instance
        """
        self.app = app

    def auto_configure(self) -> Config:
        """
        Automatically detect Flask project configuration.

        Returns:
            Config object with Flask settings applied
        """
        if not self.app:
            raise ValueError("Flask app instance is required")

        config = Config(
            project_root=self.app.root_path,
            app_name=getattr(self.app, "name", None),
            backend="flask",
            generate_icons=True,
            manifest_path=self._get_manifest_path(),
            service_worker_path=self._get_sw_path(),
        )
        return config

    def _get_manifest_path(self) -> str:
        """Get manifest.json path for Flask."""
        return getattr(self.app.config, "PWA_MANIFEST_PATH", "static/manifest.json")

    def _get_sw_path(self) -> str:
        """Get service worker path for Flask."""
        return getattr(self.app.config, "PWA_SW_PATH", "static/sw.js")


class FastAPIIntegration:
    """FastAPI-specific PWA integration."""

    def __init__(self, app=None):
        """
        Initialize FastAPI integration.

        Args:
            app: FastAPI application instance
        """
        self.app = app

    def auto_configure(self) -> Config:
        """
        Automatically detect FastAPI project configuration.

        Returns:
            Config object with FastAPI settings applied
        """
        if not self.app:
            raise ValueError("FastAPI app instance is required")

        config = Config(
            project_root=".",
            app_name=getattr(self.app, "title", None),
            app_description=getattr(self.app, "description", None),
            backend="fastapi",
            generate_icons=True,
            manifest_path="static/manifest.json",
            service_worker_path="static/sw.js",
        )
        return config
