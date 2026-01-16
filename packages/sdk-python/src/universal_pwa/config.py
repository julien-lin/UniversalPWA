"""
Configuration models for UniversalPWA SDK.

Uses Pydantic v2 for validation and serialization.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Config(BaseModel):
    """Main configuration for UniversalPWA generation."""

    # Required
    project_root: str = Field(..., description="Root directory of the project")

    # Application metadata
    app_name: Optional[str] = Field(None, description="Application display name")
    app_description: Optional[str] = Field(None, description="Application description")
    app_theme_color: Optional[str] = Field("#000000", description="Theme color (hex)")
    app_background_color: Optional[str] = Field("#FFFFFF", description="Background color (hex)")
    app_start_url: Optional[str] = Field("/", description="Start URL for PWA")
    app_scope: Optional[str] = Field("/", description="Scope for PWA")

    # Backend detection
    auto_detect_backend: bool = Field(True, description="Auto-detect backend framework")
    backend: Optional[str] = Field(
        None,
        description="Specific backend (django, flask, fastapi)",
        pattern="^(django|flask|fastapi|laravel|symfony)$",
    )

    # Icon generation
    generate_icons: bool = Field(True, description="Generate PWA icons")
    generate_splash_screens: bool = Field(False, description="Generate splash screens")
    icon_source: Optional[str] = Field(None, description="Path to source icon")

    # Caching
    caching_strategy: str = Field("balanced", pattern="^(aggressive|balanced|conservative)$")

    # Output
    output_dir: Optional[str] = Field(None, description="Output directory for generated files")
    manifest_path: str = Field("public/manifest.json", description="Path to manifest.json")
    service_worker_path: str = Field("public/sw.js", description="Path to service worker")

    # API connection
    api_endpoint: str = Field("http://localhost:3000", description="Core API endpoint")
    timeout: int = Field(30, description="HTTP request timeout (seconds)", ge=1, le=300)

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "project_root": "/path/to/project",
                "app_name": "My App",
                "backend": "django",
                "generate_icons": True,
            }
        }


class ScanResult(BaseModel):
    """Result of project scanning."""

    framework: Dict[str, Any]
    features: Dict[str, bool]
    assets: Dict[str, List[str]]
    routes: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class GenerationResult(BaseModel):
    """Result of PWA generation."""

    success: bool
    manifest: Dict[str, Any]
    service_worker: str
    icons: List[Dict[str, Any]] = Field(default_factory=list)
    splash_screens: List[Dict[str, Any]] = Field(default_factory=list)
    files: List[Dict[str, Any]] = Field(default_factory=list)
    stats: Dict[str, Any] = Field(default_factory=dict)


class ValidationResult(BaseModel):
    """Result of PWA validation."""

    valid: bool
    score: float
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    suggestions: List[Dict[str, Any]] = Field(default_factory=list)
