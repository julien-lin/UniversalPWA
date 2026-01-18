"""
Base Backend Integration class.

Abstract class with common logic for all backend integrations.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from pathlib import Path

from .types import (
    BackendDetectionResult,
    BackendLanguage,
    Framework,
    ServiceWorkerConfig,
    MiddlewareInjection,
    ValidationResult,
)


class BaseBackendIntegration(ABC):
    """Abstract base class for backend integrations."""

    @property
    @abstractmethod
    def id(self) -> str:
        """Backend/framework identifier."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Backend/framework name."""
        pass

    @property
    @abstractmethod
    def framework(self) -> Framework:
        """Framework enum value."""
        pass

    @property
    @abstractmethod
    def language(self) -> BackendLanguage:
        """Backend language."""
        pass

    def __init__(self, project_path: str):
        """
        Initialize backend integration.

        Args:
            project_path: Root path of the project
        """
        self.project_path = Path(project_path)

    @abstractmethod
    def detect(self) -> BackendDetectionResult:
        """Detect if backend is present in project."""
        pass

    @abstractmethod
    def generate_service_worker_config(self) -> ServiceWorkerConfig:
        """Generate optimized Service Worker configuration."""
        pass

    @abstractmethod
    def generate_manifest_variables(self) -> Dict[str, Any]:
        """Generate manifest.json variables/metadata."""
        pass

    @abstractmethod
    def get_start_url(self) -> str:
        """Get recommended start URL for PWA."""
        pass

    @abstractmethod
    def validate_setup(self) -> ValidationResult:
        """Validate backend-specific PWA setup."""
        pass

    def inject_middleware(self) -> MiddlewareInjection:
        """
        Inject middleware/helper code into project.

        Returns:
            Code snippet that developer should add to their project
        """
        return {
            "code": self._get_default_middleware_code(),
            "path": self._get_default_middleware_path(),
            "language": self.language.value,
            "instructions": [
                f"Add the following code to {self._get_default_middleware_path()}",
                "Restart your server",
                "The PWA routes will be automatically available",
            ],
        }

    def get_secure_routes(self) -> List[str]:
        """Get secure routes that need CSRF/session protection."""
        return ["/admin/**", "/api/auth/**", "/dashboard/**"]

    def get_api_patterns(self) -> List[str]:
        """Get API endpoint patterns for this backend."""
        return ["/api/**", "/json/**", "/graphql/**"]

    def get_static_asset_patterns(self) -> List[str]:
        """Get static asset patterns."""
        return [
            "/assets/**",
            "/public/**",
            "/static/**",
            "**/*.{js,css,png,jpg,svg,webp,woff,woff2}",
        ]

    def _get_default_middleware_code(self) -> str:
        """Default middleware code (should be overridden)."""
        return "# Add PWA middleware here"

    def _get_default_middleware_path(self) -> str:
        """Default middleware path (should be overridden)."""
        return "middleware/pwa.py"

    def _file_exists(self, path: str) -> bool:
        """Check if file exists in project."""
        return (self.project_path / path).exists()

    def _dir_exists(self, path: str) -> bool:
        """Check if directory exists in project."""
        return (self.project_path / path).is_dir()

    def _read_file(self, path: str) -> str:
        """Read file content from project."""
        file_path = self.project_path / path
        return file_path.read_text(encoding="utf-8")
