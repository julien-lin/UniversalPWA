"""
Unit tests for DjangoIntegration.
"""

import pytest
from pathlib import Path
from tempfile import TemporaryDirectory

from universal_pwa.backends.django import DjangoIntegration
from universal_pwa.backends.types import Framework, BackendLanguage, ConfidenceLevel


def test_django_integration_properties():
    """Test Django integration properties."""
    with TemporaryDirectory() as tmpdir:
        integration = DjangoIntegration(tmpdir)
        assert integration.id == "django"
        assert integration.name == "Django"
        assert integration.framework == Framework.DJANGO
        assert integration.language == BackendLanguage.PYTHON


def test_django_detection_with_manage_py():
    """Test Django detection with manage.py."""
    with TemporaryDirectory() as tmpdir:
        # Create manage.py
        (Path(tmpdir) / "manage.py").write_text("# Django management script")
        integration = DjangoIntegration(tmpdir)

        result = integration.detect()
        assert result["detected"] is True
        assert "manage.py" in result["indicators"]


def test_django_detection_with_settings():
    """Test Django detection with settings.py."""
    with TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "manage.py").write_text("# Django management script")
        (Path(tmpdir) / "settings.py").write_text("STATIC_URL = '/static/'")
        integration = DjangoIntegration(tmpdir)

        result = integration.detect()
        assert result["detected"] is True
        assert result["confidence"] == ConfidenceLevel.HIGH


def test_django_detection_with_requirements():
    """Test Django detection with requirements.txt."""
    with TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "manage.py").write_text("# Django management script")
        (Path(tmpdir) / "requirements.txt").write_text("Django==4.2.0\nrequests==2.28.0")
        integration = DjangoIntegration(tmpdir)

        result = integration.detect()
        assert result["detected"] is True
        assert result["confidence"] == ConfidenceLevel.HIGH
        assert result["version"] == "4.2.0"


def test_django_detection_no_django():
    """Test Django detection when Django is not present."""
    with TemporaryDirectory() as tmpdir:
        integration = DjangoIntegration(tmpdir)
        result = integration.detect()
        assert result["detected"] is False


def test_django_service_worker_config():
    """Test Django service worker configuration generation."""
    with TemporaryDirectory() as tmpdir:
        integration = DjangoIntegration(tmpdir)
        config = integration.generate_service_worker_config()

        assert "runtime_caching" in config
        assert len(config["runtime_caching"]) > 0
        assert config["skip_waiting"] is True
        assert config["clients_claim"] is True

        # Check for Django-specific routes
        routes = [r["urlPattern"] for r in config["runtime_caching"]]
        assert "/static/**" in routes
        assert "/media/**" in routes
        assert "/api/**" in routes
        assert "/admin/**" in routes


def test_django_manifest_variables():
    """Test Django manifest variables generation."""
    with TemporaryDirectory() as tmpdir:
        integration = DjangoIntegration(tmpdir)
        variables = integration.generate_manifest_variables()

        assert "start_url" in variables
        assert "scope" in variables
        assert "display" in variables


def test_django_validation():
    """Test Django setup validation."""
    with TemporaryDirectory() as tmpdir:
        integration = DjangoIntegration(tmpdir)
        result = integration.validate_setup()

        assert "isValid" in result
        assert "errors" in result
        assert "warnings" in result
        assert "suggestions" in result


def test_django_validation_with_settings():
    """Test Django validation with settings.py."""
    with TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "settings.py").write_text("STATIC_URL = '/static/'")
        integration = DjangoIntegration(tmpdir)
        result = integration.validate_setup()

        # Should have fewer errors with settings.py present
        assert isinstance(result["errors"], list)
