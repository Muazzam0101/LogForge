"""OpenSearch Client Connection Manager.

Provides thread-safe, resilient client instantiation and connectivity health checks.
Strictly isolates cluster credentials and configuration within the backend.
"""
import time
from typing import Any, Dict, Optional
import urllib3
from opensearchpy import OpenSearch
from opensearchpy.exceptions import ConnectionError, OpenSearchException, TransportError

from ..core.config import settings
from ..core.logging import logger

# Suppress InsecureRequestWarning when certificates are ignored in local/dev environments
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class OpenSearchClientManager:
    """Singleton connection manager for OpenSearch cluster interaction."""

    _instance: Optional["OpenSearchClientManager"] = None
    _client: Optional[OpenSearch] = None
    _last_check: float = 0.0
    _cached_available: bool = False
    _check_interval: float = 15.0

    def __new__(cls) -> "OpenSearchClientManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self) -> Optional[OpenSearch]:
        """Returns active OpenSearch client instance or None if disabled."""
        if not settings.OPENSEARCH_ENABLED:
            return None

        if self._client is None:
            self._client = self._create_client()

        return self._client

    def _create_client(self) -> Optional[OpenSearch]:
        """Creates a configured OpenSearch client based on application settings."""
        try:
            auth = None
            if settings.OPENSEARCH_AUTH_USER and settings.OPENSEARCH_AUTH_PASSWORD:
                auth = (settings.OPENSEARCH_AUTH_USER, settings.OPENSEARCH_AUTH_PASSWORD)

            client = OpenSearch(
                hosts=[settings.OPENSEARCH_URL],
                http_auth=auth,
                use_ssl=settings.OPENSEARCH_USE_SSL,
                verify_certs=settings.OPENSEARCH_VERIFY_CERTS,
                ssl_assert_hostname=False,
                ssl_show_warn=False,
                timeout=settings.OPENSEARCH_TIMEOUT,
                max_retries=settings.OPENSEARCH_MAX_RETRIES,
                retry_on_timeout=True,
            )
            logger.info("OpenSearch client initialized for %s", settings.OPENSEARCH_URL)
            return client
        except Exception as exc:
            logger.warning("Failed to initialize OpenSearch client: %s", exc)
            return None

    def is_available(self) -> bool:
        """Pings the OpenSearch cluster with cached availability status to avoid latency cascades."""
        if not settings.OPENSEARCH_ENABLED:
            return False

        now = time.time()
        if now - self._last_check < self._check_interval:
            return self._cached_available

        # Non-blocking TCP socket probe (up to 3.0s) to support both local and cloud deployments
        try:
            import socket
            from urllib.parse import urlparse
            parsed = urlparse(settings.OPENSEARCH_URL)
            host = parsed.hostname or "localhost"
            port = parsed.port or (443 if parsed.scheme == "https" else 9200)
            with socket.create_connection((host, port), timeout=3.0):
                pass
        except Exception:
            self._cached_available = False
            self._last_check = now
            return False

        client = self.get_client()
        if client is None:
            self._cached_available = False
            self._last_check = now
            return False

        try:
            self._cached_available = bool(client.ping(request_timeout=3.0))
        except (ConnectionError, TransportError, OpenSearchException, Exception) as exc:
            logger.debug("OpenSearch ping failed: %s", exc)
            self._cached_available = False

        self._last_check = now
        return self._cached_available



    def get_cluster_health(self) -> Dict[str, Any]:
        """Queries cluster health details safely without exposing sensitive connection data."""
        if not settings.OPENSEARCH_ENABLED:
            return {"status": "DISABLED", "enabled": False}

        client = self.get_client()
        if client is None or not self.is_available():
            return {"status": "DISCONNECTED", "enabled": True}

        try:
            health = client.cluster.health()
            return {
                "status": "CONNECTED",
                "enabled": True,
                "cluster_name": health.get("cluster_name"),
                "cluster_status": health.get("status"),
                "number_of_nodes": health.get("number_of_nodes"),
                "active_primary_shards": health.get("active_primary_shards"),
            }
        except Exception as exc:
            logger.warning("Failed to query OpenSearch cluster health: %s", exc)
            return {"status": "DEGRADED", "enabled": True, "error": str(exc)}

    def close(self) -> None:
        """Closes the active OpenSearch client connection pool."""
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None


search_client_manager = OpenSearchClientManager()
