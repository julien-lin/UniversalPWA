"""
Custom exceptions for UniversalPWA SDK.
"""


class UniversalPwaException(Exception):
    """Base exception for all UniversalPWA errors."""

    pass


class ScanException(UniversalPwaException):
    """Raised when project scanning fails."""

    pass


class FrameworkNotDetectedException(ScanException):
    """Raised when framework cannot be detected."""

    pass


class GenerationException(UniversalPwaException):
    """Raised when PWA generation fails."""

    pass


class InvalidConfigurationException(GenerationException):
    """Raised when configuration is invalid."""

    pass


class ValidationException(UniversalPwaException):
    """Raised when validation fails."""

    pass


class HttpException(UniversalPwaException):
    """Raised when HTTP communication fails."""

    pass


class ApiUnreachableException(HttpException):
    """Raised when API server is unreachable."""

    pass


class TimeoutException(HttpException):
    """Raised when API request times out."""

    pass


class ConfigException(UniversalPwaException):
    """Raised when configuration is invalid."""

    pass
