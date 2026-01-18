"""
Type definitions for backend integrations.
"""

from typing import Literal, TypedDict, List, Dict, Any, Optional
from enum import Enum


class Framework(str, Enum):
    """Supported frameworks."""

    LARAVEL = "laravel"
    SYMFONY = "symfony"
    DJANGO = "django"
    FLASK = "flask"
    FASTAPI = "fastapi"
    STATIC = "static"
    REACT = "react"
    VUE = "vue"
    ANGULAR = "angular"
    NEXT = "next"
    NUXT = "nuxt"


class BackendLanguage(str, Enum):
    """Backend languages."""

    PHP = "php"
    PYTHON = "python"
    RUBY = "ruby"
    GO = "go"
    JAVA = "java"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"


class ConfidenceLevel(str, Enum):
    """Detection confidence levels."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class BackendDetectionResult(TypedDict):
    """Result of backend detection."""

    detected: bool
    confidence: ConfidenceLevel
    indicators: List[str]
    version: Optional[str]


class ServiceWorkerConfig(TypedDict, total=False):
    """Service Worker configuration."""

    precache: List[str]
    runtime_caching: List[Dict[str, Any]]
    skip_waiting: bool
    clients_claim: bool
    navigation_preload: bool


class RouteConfig(TypedDict, total=False):
    """Route caching configuration."""

    pattern: str
    strategy: str
    options: Optional[Dict[str, Any]]


class MiddlewareInjection(TypedDict):
    """Middleware injection instructions."""

    code: str
    path: str
    language: str
    instructions: List[str]


class ValidationResult(TypedDict):
    """Backend validation result."""

    isValid: bool
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]
