"""
Unit tests for FlaskIntegration.
"""

import pytest
from pathlib import Path
from tempfile import TemporaryDirectory

from universal_pwa.backends.flask import FlaskIntegration
from universal_pwa.backends.types import Framework, BackendLanguage, ConfidenceLevel


def test_flask_integration_properties():
    """Test Flask integration properties."""
    with TemporaryDirectory() as tmpdir:
        integration = FlaskIntegration(tmpdir)
        assert integration.id == "flask"
        assert integration.name == "Flask"
        assert integration.framework == Framework.FLASK
        assert integration.language == BackendLanguage.PYTHON


def test_flask_detection_with_app_py():
    """Test Flask detection with app.py."""
    with TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "app.py").write_text("from flask import Flask")
        integration = FlaskIntegration(tmpdir)

        result = integration.detect()
        assert result["detected"] is True
        assert "app.py or application.py" in result["indicators"]


def test_flask_detection_with_requirements():
    """Test Flask detection with requirements.txt."""
    with TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "app.py").write_text("from flask import Flask")
        (Path(tmpdir) / "requirements.txt").write_text("Flask==2.3.0")
        integration = FlaskIntegration(tmpdir)

        result = integration.detect()
        assert result["detected"] is True
        assert result["confidence"] == ConfidenceLevel.HIGH


def test_flask_detection_with_structure():
    """Test Flask detection with Flask structure."""
    with TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "app.py").write_text("from flask import Flask")
        (Path(tmpdir) / "templates").mkdir()
        integration = FlaskIntegration(tmpdir)

        result = integration.detect()
        assert result["detected"] is True
        assert result["confidence"] == ConfidenceLevel.HIGH


def test_flask_detection_no_flask():
    """Test Flask detection when Flask is not present."""
    with TemporaryDirectory() as tmpdir:
        integration = FlaskIntegration(tmpdir)
        result = integration.detect()
        assert result["detected"] is False


def test_flask_service_worker_config():
    """Test Flask service worker configuration generation."""
    with TemporaryDirectory() as tmpdir:
        integration = FlaskIntegration(tmpdir)
        config = integration.generate_service_worker_config()

        assert "runtime_caching" in config
        assert len(config["runtime_caching"]) > 0
        assert config["skip_waiting"] is True
        assert config["clients_claim"] is True

        # Check for Flask-specific routes
        routes = [r["urlPattern"] for r in config["runtime_caching"]]
        assert "/static/**" in routes
        assert "/api/**" in routes


def test_flask_manifest_variables():
    """Test Flask manifest variables generation."""
    with TemporaryDirectory() as tmpdir:
        integration = FlaskIntegration(tmpdir)
        variables = integration.generate_manifest_variables()

        assert "start_url" in variables
        assert "scope" in variables
        assert "display" in variables


def test_flask_validation():
    """Test Flask setup validation."""
    with TemporaryDirectory() as tmpdir:
        integration = FlaskIntegration(tmpdir)
        result = integration.validate_setup()

        assert "isValid" in result
        assert "errors" in result
        assert "warnings" in result
        assert "suggestions" in result
