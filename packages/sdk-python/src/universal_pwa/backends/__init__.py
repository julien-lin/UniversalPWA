"""
Backend integrations for UniversalPWA SDK.

Provides framework-specific integrations for Django, Flask, and other Python frameworks.
"""

from .base import BaseBackendIntegration
from .django import DjangoIntegration
from .flask import FlaskIntegration
from .types import (
    Framework,
    BackendLanguage,
    ConfidenceLevel,
    BackendDetectionResult,
    ServiceWorkerConfig,
    ValidationResult,
)

__all__ = [
    "BaseBackendIntegration",
    "DjangoIntegration",
    "FlaskIntegration",
    "Framework",
    "BackendLanguage",
    "ConfidenceLevel",
    "BackendDetectionResult",
    "ServiceWorkerConfig",
    "ValidationResult",
]
