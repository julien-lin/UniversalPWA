"""
Unit tests for BaseBackendIntegration.
"""

import pytest
from pathlib import Path
from tempfile import TemporaryDirectory

from universal_pwa.backends.base import BaseBackendIntegration
from universal_pwa.backends.types import Framework, BackendLanguage


class ConcreteBackend(BaseBackendIntegration):
    """Concrete implementation for testing."""

    @property
    def id(self) -> str:
        return "test"

    @property
    def name(self) -> str:
        return "Test Backend"

    @property
    def framework(self) -> Framework:
        return Framework.STATIC

    @property
    def language(self) -> BackendLanguage:
        return BackendLanguage.PYTHON

    def detect(self):
        return {"detected": True, "confidence": "high", "indicators": ["test"], "version": None}

    def generate_service_worker_config(self):
        return {"precache": [], "runtime_caching": []}

    def generate_manifest_variables(self):
        return {"start_url": "/"}

    def get_start_url(self) -> str:
        return "/"

    def validate_setup(self):
        return {"isValid": True, "errors": [], "warnings": [], "suggestions": []}


def test_base_backend_initialization():
    """Test base backend initialization."""
    with TemporaryDirectory() as tmpdir:
        backend = ConcreteBackend(tmpdir)
        assert backend.project_path == Path(tmpdir)
        assert backend.id == "test"
        assert backend.name == "Test Backend"
        assert backend.framework == Framework.STATIC
        assert backend.language == BackendLanguage.PYTHON


def test_base_backend_file_operations():
    """Test file and directory operations."""
    with TemporaryDirectory() as tmpdir:
        backend = ConcreteBackend(tmpdir)
        test_file = Path(tmpdir) / "test.txt"
        test_file.write_text("test content")

        assert backend._file_exists("test.txt") is True
        assert backend._file_exists("nonexistent.txt") is False
        assert backend._read_file("test.txt") == "test content"


def test_base_backend_default_methods():
    """Test default methods."""
    with TemporaryDirectory() as tmpdir:
        backend = ConcreteBackend(tmpdir)

        middleware = backend.inject_middleware()
        assert "code" in middleware
        assert "path" in middleware
        assert "language" in middleware
        assert "instructions" in middleware

        secure_routes = backend.get_secure_routes()
        assert isinstance(secure_routes, list)
        assert len(secure_routes) > 0

        api_patterns = backend.get_api_patterns()
        assert isinstance(api_patterns, list)
        assert len(api_patterns) > 0

        static_patterns = backend.get_static_asset_patterns()
        assert isinstance(static_patterns, list)
        assert len(static_patterns) > 0
