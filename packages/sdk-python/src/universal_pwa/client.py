"""
Main UniversalPWA SDK client.
"""

from typing import Optional, Dict, Any
from pathlib import Path

from .config import Config, ScanResult, GenerationResult, ValidationResult
from .http import HttpClient
from .exceptions import (
    ConfigException,
    ScanException,
    GenerationException,
    ValidationException,
)


class UniversalPwaClient:
    """
    Main SDK client for UniversalPWA.

    Handles communication with Core API for scan, generate, and validate operations.
    """

    def __init__(self, config: Config):
        """
        Initialize SDK client.

        Args:
            config: Configuration object or dict

        Raises:
            ConfigException: If configuration is invalid
        """
        if isinstance(config, dict):
            self.config = Config(**config)
        else:
            self.config = config

        # Validate project root exists
        project_path = Path(self.config.project_root)
        if not project_path.exists():
            raise ConfigException(f"Project root does not exist: {self.config.project_root}")

        # Initialize HTTP client
        self.http_client = HttpClient(
            api_endpoint=self.config.api_endpoint,
            timeout=self.config.timeout,
        )

    def scan(self) -> ScanResult:
        """
        Scan project to detect framework and features.

        Returns:
            ScanResult with framework info and asset inventory

        Raises:
            ScanException: If scanning fails
        """
        try:
            request_data = {
                "projectRoot": str(self.config.project_root),
                "autoDetectBackend": self.config.auto_detect_backend,
            }

            response = self.http_client.post("/api/scan", request_data)
            return ScanResult(**response)

        except Exception as e:
            raise ScanException(f"Failed to scan project: {e}")

    def generate(self, config: Optional[Dict[str, Any]] = None) -> GenerationResult:
        """
        Generate PWA files.

        Args:
            config: Override configuration (merged with main config)

        Returns:
            GenerationResult with manifest, SW, icons, etc.

        Raises:
            GenerationException: If generation fails
        """
        try:
            # Merge configurations
            merged = self.config.model_dump()
            if config:
                merged.update(config)

            request_data = {
                "config": merged,
            }

            response = self.http_client.post("/api/generate", request_data)
            return GenerationResult(**response)

        except Exception as e:
            raise GenerationException(f"Failed to generate PWA: {e}")

    def validate(self) -> ValidationResult:
        """
        Validate project PWA readiness.

        Returns:
            ValidationResult with score and issues

        Raises:
            ValidationException: If validation fails
        """
        try:
            request_data = {
                "projectRoot": str(self.config.project_root),
            }

            response = self.http_client.post("/api/validate", request_data)
            return ValidationResult(**response)

        except Exception as e:
            raise ValidationException(f"Failed to validate project: {e}")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.http_client.close()
