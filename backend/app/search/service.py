"""OpenSearch Search & Analytics Business Service.

Coordinates document indexing, bulk buffering, high-speed queries, aggregations,
and seamless fallback to MySQL persistence when OpenSearch is offline or disabled.
"""
from datetime import datetime, timezone
import time
from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.logging import logger
from ..db.repositories.event_repository import EventRepository
from ..models.event import EventModel
from ..schemas.event import ProcessingResult
from ..schemas.explorer import EventListResponse, EventSummaryItem
from .client import OpenSearchClientManager, search_client_manager
from .index import BASE_INDEX_NAME, DEFAULT_ALIAS_NAME, ensure_index_and_alias
from .queries import OpenSearchQueryBuilder, encode_search_after
from .repository import OpenSearchRepository
from .serializers import EventDocumentSerializer


class SearchService:
    """Service layer orchestrating OpenSearch operations with transparent MySQL fallback."""

    def __init__(
        self,
        client_manager: Optional[OpenSearchClientManager] = None,
        repository: Optional[OpenSearchRepository] = None,
    ) -> None:
        self.client_manager = client_manager or search_client_manager
        self.repository = repository or OpenSearchRepository()

    def _get_active_repo(self) -> Optional[OpenSearchRepository]:
        """Returns repository with active client if OpenSearch is enabled and available."""
        if not settings.OPENSEARCH_ENABLED:
            return None

        client = self.client_manager.get_client()
        if client is None or not self.client_manager.is_available():
            return None

        self.repository.set_client(client)
        return self.repository

    def initialize_index(self) -> bool:
        """Ensures index and alias exist during application startup."""
        if not settings.OPENSEARCH_ENABLED:
            logger.info("OpenSearch indexing disabled by configuration (OPENSEARCH_ENABLED=False)")
            return False

        client = self.client_manager.get_client()
        if client is None:
            logger.warning("OpenSearch client could not be created; skipping index initialization")
            return False

        if not self.client_manager.is_available():
            logger.warning("OpenSearch cluster is unreachable at %s; skipping index initialization", settings.OPENSEARCH_URL)
            return False

        return ensure_index_and_alias(client, BASE_INDEX_NAME, DEFAULT_ALIAS_NAME)

    def index_event_safely(self, result: ProcessingResult) -> bool:
        """Non-blocking single event indexer. Never raises exceptions or disrupts log ingestion."""
        if result.status != "success":
            return False

        repo = self._get_active_repo()
        if not repo:
            return False

        try:
            doc = EventDocumentSerializer.serialize_processing_result(result)
            return repo.index_document(doc, event_id=result.event_id)
        except Exception as exc:
            logger.warning("Non-blocking OpenSearch indexing skipped for event %s: %s", result.event_id, exc)
            return False

    def index_batch_safely(self, results: List[ProcessingResult]) -> Tuple[int, int]:
        """Non-blocking bulk event indexer using Bulk API. Never disrupts log ingestion."""
        successful_results = [r for r in results if r.status == "success"]
        if not successful_results:
            return 0, 0

        repo = self._get_active_repo()
        if not repo:
            return 0, 0

        try:
            docs = [EventDocumentSerializer.serialize_processing_result(r) for r in successful_results]
            indexed_count, errors = repo.bulk_index_documents(docs)
            return indexed_count, len(errors)
        except Exception as exc:
            logger.warning("Non-blocking OpenSearch bulk indexing failed: %s", exc)
            return 0, len(successful_results)

    def search_events(
        self,
        db: Session,
        engine: str = "mysql",
        q: Optional[str] = None,
        event_id: Optional[str] = None,
        source_ip: Optional[str] = None,
        destination_ip: Optional[str] = None,
        source_port: Optional[int] = None,
        destination_port: Optional[int] = None,
        protocol: Optional[str] = None,
        action: Optional[str] = None,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        detected_format: Optional[str] = None,
        start_time: Optional[Union[datetime, str]] = None,
        end_time: Optional[Union[datetime, str]] = None,
        limit: int = 50,
        offset: int = 0,
        search_after: Optional[str] = None,
    ) -> EventListResponse:
        """Searches events via MySQL or OpenSearch based on user engine choice."""
        target_engine = (engine or "mysql").lower().strip()

        # Attempt high-performance search via OpenSearch if explicitly requested or in auto mode
        if target_engine in ("opensearch", "auto"):
            repo = self._get_active_repo()
            if repo is not None:
                try:
                    query_body = OpenSearchQueryBuilder.build_search_query(
                        q=q,
                        event_id=event_id,
                        source_ip=source_ip,
                        destination_ip=destination_ip,
                        source_port=source_port,
                        destination_port=destination_port,
                        protocol=protocol,
                        action=action,
                        severity=severity,
                        event_type=event_type,
                        detected_format=detected_format,
                        start_time=start_time,
                        end_time=end_time,
                        limit=limit,
                        offset=offset,
                        search_after=search_after,
                    )

                    res = repo.search(query_body)
                    hits_info = res.get("hits", {})
                    total_hits = hits_info.get("total", {})
                    total_count = total_hits.get("value", 0) if isinstance(total_hits, dict) else int(total_hits)

                    raw_hits = hits_info.get("hits", [])
                    events_list: List[EventSummaryItem] = []
                    next_search_after: Optional[str] = None

                    for hit in raw_hits:
                        src = hit.get("_source", {})
                        ts = src.get("timestamp")
                        parsed_ts = None
                        if ts:
                            try:
                                parsed_ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                            except Exception:
                                parsed_ts = None

                        events_list.append(
                            EventSummaryItem(
                                event_id=src.get("event_id", hit.get("_id")),
                                timestamp=parsed_ts,
                                detected_format=src.get("detected_format", "unknown"),
                                severity=src.get("severity", "informational"),
                                action=src.get("action"),
                                protocol=src.get("protocol"),
                                source_ip=src.get("source_ip"),
                                destination_ip=src.get("destination_ip"),
                                raw_event=src.get("raw_event", ""),
                                sha256_hash=src.get("sha256_hash", ""),
                            )
                        )

                    if raw_hits and "sort" in raw_hits[-1]:
                        next_search_after = encode_search_after(raw_hits[-1]["sort"])

                    page = (offset // limit) + 1 if limit > 0 else 1

                    return EventListResponse(
                        total=total_count,
                        page=page,
                        limit=limit,
                        events=events_list,
                        search_engine="opensearch",
                        search_after=next_search_after,
                    )
                except Exception as search_err:
                    logger.warning("OpenSearch search failed, executing MySQL fallback: %s", search_err)

        # Default & Direct Execution: Query MySQL Database
        logger.info("Executing search query via MySQL persistence store")
        mysql_events, mysql_total = EventRepository.get_events(
            db=db,
            limit=limit,
            offset=offset,
            q=q,
            event_id=event_id,
            detected_format=detected_format,
            severity=severity,
            action=action,
            source_ip=source_ip,
            destination_ip=destination_ip,
            protocol=protocol,
            start_time=datetime.fromisoformat(str(start_time)) if start_time else None,
            end_time=datetime.fromisoformat(str(end_time)) if end_time else None,
        )

        page = (offset // limit) + 1 if limit > 0 else 1
        summary_items = [
            EventSummaryItem(
                event_id=m.event_id,
                timestamp=m.timestamp,
                detected_format=m.detected_format,
                severity=m.severity or "informational",
                action=m.action,
                protocol=m.protocol,
                source_ip=m.source_ip,
                destination_ip=m.destination_ip,
                raw_event_preview=m.raw_event[:200],
                sha256_hash=m.sha256_hash,
            )
            for m in mysql_events
        ]

        return EventListResponse(
            total=mysql_total,
            page=page,
            limit=limit,
            events=summary_items,
            search_engine="mysql" if target_engine == "mysql" else "mysql_fallback",
        )

    def reindex_from_mysql(self, db: Session, batch_size: Optional[int] = None) -> Dict[str, Any]:
        """Administrative service: Rebuilds OpenSearch index from authoritative MySQL records."""
        if not settings.OPENSEARCH_ENABLED:
            return {"status": "disabled", "message": "OpenSearch is disabled (OPENSEARCH_ENABLED=False)"}

        client = self.client_manager.get_client()
        if client is None or not self.client_manager.is_available():
            return {"status": "unavailable", "message": "OpenSearch cluster is currently unreachable"}

        # Ensure index exists before reindexing
        ensure_index_and_alias(client, BASE_INDEX_NAME, DEFAULT_ALIAS_NAME)
        repo = OpenSearchRepository(client=client, alias=DEFAULT_ALIAS_NAME)

        chunk_size = batch_size or settings.OPENSEARCH_BULK_SIZE
        total_events = db.scalar(select(func.count(EventModel.id))) or 0

        start_time = time.time()
        indexed_total = 0
        failed_total = 0
        offset = 0

        logger.info("Starting OpenSearch reindex from MySQL: %d total events", total_events)

        while offset < total_events:
            stmt = (
                select(EventModel)
                .order_by(EventModel.id.asc())
                .limit(chunk_size)
                .offset(offset)
            )
            models = list(db.scalars(stmt).all())
            if not models:
                break

            docs = [EventDocumentSerializer.serialize_event_model(m) for m in models]
            success, errors = repo.bulk_index_documents(docs, chunk_size=chunk_size)

            indexed_total += success
            failed_total += len(errors)
            offset += len(models)

        duration = round(time.time() - start_time, 3)
        logger.info(
            "OpenSearch reindex completed: %d indexed, %d failed in %.3fs",
            indexed_total,
            failed_total,
            duration,
        )

        return {
            "status": "completed",
            "total_mysql_events": total_events,
            "indexed_documents": indexed_total,
            "failed_documents": failed_total,
            "duration_seconds": duration,
        }

    def get_health(self) -> Dict[str, Any]:
        """Returns structured health metadata for OpenSearch cluster and index status."""
        if not settings.OPENSEARCH_ENABLED:
            return {
                "status": "DISABLED",
                "enabled": False,
                "message": "OpenSearch search layer is disabled. System is operating in standalone MySQL mode.",
            }

        client = self.client_manager.get_client()
        if client is None or not self.client_manager.is_available():
            return {
                "status": "DISCONNECTED",
                "enabled": True,
                "message": f"OpenSearch cluster unreachable at {settings.OPENSEARCH_URL}. Search queries fall back to MySQL.",
            }

        cluster_info = self.client_manager.get_cluster_health()
        repo = OpenSearchRepository(client=client, alias=DEFAULT_ALIAS_NAME)
        doc_count = repo.get_document_count()

        index_exists = False
        try:
            index_exists = client.indices.exists(index=BASE_INDEX_NAME)
        except Exception:
            index_exists = False

        cluster_status = cluster_info.get("cluster_status", "unknown")
        overall_status = "CONNECTED"
        if cluster_status == "red":
            overall_status = "DEGRADED"

        return {
            "status": overall_status,
            "enabled": True,
            "cluster_name": cluster_info.get("cluster_name"),
            "cluster_status": cluster_status,
            "index_name": BASE_INDEX_NAME,
            "alias_name": DEFAULT_ALIAS_NAME,
            "index_exists": index_exists,
            "document_count": doc_count,
        }


search_service = SearchService()
