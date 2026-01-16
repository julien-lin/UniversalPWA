"""
HTTP client for communicating with UniversalPWA Core API.
"""

import json
from typing import Any, Dict, Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .exceptions import ApiUnreachableException, TimeoutException, HttpException


class HttpClient:
    """HTTP client with retry logic and error handling."""

    def __init__(
        self,
        api_endpoint: str = "http://localhost:3000",
        timeout: int = 30,
        retries: int = 3,
    ):
        """
        Initialize HTTP client.

        Args:
            api_endpoint: Base URL of Core API
            timeout: Request timeout in seconds
            retries: Number of retries for transient failures
        """
        self.api_endpoint = api_endpoint.rstrip("/")
        self.timeout = timeout

        # Configure session with retries
        self.session = requests.Session()
        retry_strategy = Retry(
            total=retries,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def post(self, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make POST request to API.

        Args:
            path: API endpoint path (e.g., "/api/scan")
            data: Request body

        Returns:
            Response JSON

        Raises:
            ApiUnreachableException: If API is unreachable
            TimeoutException: If request times out
            HttpException: For other HTTP errors
        """
        url = f"{self.api_endpoint}{path}"

        try:
            response = self.session.post(
                url,
                json=data,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"},
            )

            response.raise_for_status()
            return response.json()

        except requests.exceptions.Timeout as e:
            raise TimeoutException(f"API request timed out after {self.timeout}s: {e}")
        except requests.exceptions.ConnectionError as e:
            raise ApiUnreachableException(f"Cannot reach API at {url}: {e}")
        except requests.exceptions.HTTPError as e:
            raise HttpException(f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            raise HttpException(f"HTTP request failed: {e}")

    def close(self) -> None:
        """Close session."""
        self.session.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
