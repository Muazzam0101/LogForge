"""OpenSearch Data Access Repository.

Encapsulates low-level OpenSearch operations: single indexing, bulk ingestion with helpers.bulk,
search queries, and aggregation computations.
"""
from typing import Any, Dict, List, Optional, Tuple
from opensearchpy import OpenSearch, helpers
from opensearchpy.exceptions import OpenSearchException

from ..core.config import settings
from ..core.logging import logger
from .index import DEFAULT_ALIAS_NAME


class OpenSearchRepository:
    """Repository handling raw document ingestion, bulk requests, and search queries."""

    def __init__(self, client: Optional[OpenSearch] = None, alias: str = DEFAULT_ALIAS_NAME) -> None:
        self.client = client
        self.alias = alias

    def set_client(self, client: OpenSearch) -> None:
        self.client = client

    def index_document(self, doc: Dict[str, Any], event_id: str) -> bool:
        """Indexes a single document using event_id as the document _id."""
        if not self.client:
            return False

        try:
            self.client.index(
                index=self.alias,
                id=event_id,
                body=doc,
                refresh=False,
            )
            return True
        except OpenSearchException as exc:
            logger.warning("OpenSearch failed to index document %s: %s", event_id, exc)
            return False
        except Exception as exc:
            logger.error("Unexpected error indexing document %s: %s", event_id, exc)
            return False

    def bulk_index_documents(
        self,
        docs: List[Dict[str, Any]],
        chunk_size: Optional[int] = None,
    ) -> Tuple[int, List[Any]]:
        """Indexes a list of documents in batches using OpenSearch Bulk API."""
        if not self.client or not docs:
            return 0, []

        batch_size = chunk_size or settings.OPENSEARCH_BULK_SIZE

        # Prepare actions for helpers.bulk
        actions = [
            {
                "_index": self.alias,
                "_id": doc["event_id"],
                "_source": doc,
            }
            for doc in docs
            if "event_id" in doc
        ]

        try:
            success_count, errors = helpers.bulk(
                client=self.client,
                actions=actions,
                chunk_size=batch_size,
                raise_on_error=False,
                raise_on_exception=False,
                max_retries=settings.OPENSEARCH_MAX_RETRIES,
                refresh=False,
            )
            if errors:
                logger.warning("OpenSearch bulk indexing completed with %d errors out of %d", len(errors), len(actions))
            return success_count, errors
        except OpenSearchException as exc:
            logger.warning("OpenSearch bulk indexing encountered exception: %s", exc)
            return 0, [str(exc)]
        except Exception as exc:
            logger.error("Unexpected error during bulk indexing: %s", exc)
            return 0, [str(exc)]

    def search(self, query_body: Dict[str, Any]) -> Dict[str, Any]:
        """Executes a search query against the OpenSearch alias."""
        if not self.client:
            return {"hits": {"total": {"value": 0}, "hits": []}}

        try:
            return self.client.search(
                index=self.alias,
                body=query_body,
            )
        except OpenSearchException as exc:
            logger.warning("OpenSearch search query failed: %s", exc)
            raise
        except Exception as exc:
            logger.error("Unexpected error during search query: %s", exc)
            raise

    def get_document_count(self) -> int:
        """Retrieves total document count in the alias."""
        if not self.client:
            return 0
        try:
            res = self.client.count(index=self.alias)
            return int(res.get("count", 0))
        except Exception as exc:
            logger.debug("Failed to get document count: %s", exc)
            return 0
