"""
UniversalPWA Python SDK

Progressive Web App generation for Python frameworks.
"""

__version__ = "2.0.0.dev0"
__author__ = "UniversalPWA Team"
__license__ = "MIT"

from .client import UniversalPwaClient
from .config import Config, ScanResult, GenerationResult, ValidationResult
from .exceptions import UniversalPwaException

__all__ = [
    "UniversalPwaClient",
    "Config",
    "ScanResult",
    "GenerationResult",
    "ValidationResult",
    "UniversalPwaException",
]
