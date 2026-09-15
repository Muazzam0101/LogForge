"""OpenSearch Scalability and Distributed Search Subsystem."""
from .client import search_client_manager
from .index import BASE_INDEX_NAME, DEFAULT_ALIAS_NAME, ensure_index_and_alias
from .queries import OpenSearchQueryBuilder, decode_search_after, encode_search_after
from .repository import OpenSearchRepository
from .serializers import EventDocumentSerializer
from .service import search_service

__all__ = [
    "search_client_manager",
    "BASE_INDEX_NAME",
    "DEFAULT_ALIAS_NAME",
    "ensure_index_and_alias",
    "OpenSearchQueryBuilder",
    "encode_search_after",
    "decode_search_after",
    "OpenSearchRepository",
    "EventDocumentSerializer",
    "search_service",
]
