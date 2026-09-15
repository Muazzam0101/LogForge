import time
from typing import List, Optional
from ..core.logging import logger
from ..normalization.normalizer import EventNormalizer
from ..parsers.detector import FormatDetector
from ..parsers.registry import ParserRegistry, parser_registry
from ..schemas.event import ProcessingMetadata, ProcessingResult
from ..utils.hashing import compute_sha256
from ..utils.ids import generate_event_id


class ULPFEngine:
    """Universal Log Pre-processing Framework (ULPF) Core Engine.
    
    Decoupled processing engine that ingests raw log strings, performs deterministic
    format detection, selects pluggable parsers, normalizes attributes into the
    Universal Event Schema, generates cryptographic SHA-256 digests, and guarantees
    lossless event preservation without requiring FastAPI or HTTP context.
    """

    def __init__(self, registry: Optional[ParserRegistry] = None) -> None:
        self.registry = registry or parser_registry

    def process_event(
        self,
        raw_log: str,
        source_hint: Optional[str] = None,
        event_id: Optional[str] = None,
    ) -> ProcessingResult:
        """Processes a single raw log event into the Universal Event Schema.
        
        Guarantees:
          1. Exact byte preservation of raw_event
          2. SHA-256 cryptographic digest calculation
          3. Collision-resistant event_id assignment (or preserves pre-assigned event_id)
          4. Zero silent field drop (unmapped fields -> additional_fields)
          5. Structured failure handling without raising unhandled exceptions
        """
        start_time = time.perf_counter()

        # Step 1: Input Validation
        assigned_id = event_id or generate_event_id()
        if raw_log is None or not isinstance(raw_log, str) or not raw_log.strip():
            return ProcessingResult(
                status="failed",
                event_id=assigned_id,
                format_detected="unknown",
                normalized_event=None,
                raw_event=raw_log or "",
                raw_event_hash=compute_sha256(raw_log or ""),
                processing_metadata=ProcessingMetadata(
                    processing_time_ms=round((time.perf_counter() - start_time) * 1000, 3)
                ),
                error={
                    "code": "EMPTY_OR_INVALID_INPUT",
                    "message": "Raw log payload cannot be null, empty, or non-string",
                },
            )

        # Step 2: Hashing & ID assignment
        raw_event_hash = compute_sha256(raw_log)
        event_id = assigned_id

        # Step 3: Deterministic Format Detection
        format_detected = FormatDetector.detect(raw_log)
        if format_detected == "unknown":
            return ProcessingResult(
                status="failed",
                event_id=event_id,
                format_detected="unknown",
                normalized_event=None,
                raw_event=raw_log,
                raw_event_hash=raw_event_hash,
                processing_metadata=ProcessingMetadata(
                    processing_time_ms=round((time.perf_counter() - start_time) * 1000, 3)
                ),
                error={
                    "code": "INVALID_LOG_FORMAT",
                    "message": "Unable to detect supported log format (expected JSON, CEF, or Syslog)",
                },
            )

        # Step 4: Parser Resolution via Registry
        parser = self.registry.get_parser_for_format(format_detected)
        if not parser:
            return ProcessingResult(
                status="failed",
                event_id=event_id,
                format_detected=format_detected,
                normalized_event=None,
                raw_event=raw_log,
                raw_event_hash=raw_event_hash,
                processing_metadata=ProcessingMetadata(
                    processing_time_ms=round((time.perf_counter() - start_time) * 1000, 3)
                ),
                error={
                    "code": "NO_PARSER_REGISTERED",
                    "message": f"No active parser plugin registered for format '{format_detected}'",
                },
            )

        # Step 5: Parser Execution
        parse_start = time.perf_counter()
        try:
            extracted_data = parser.parse(raw_log)
        except Exception as exc:
            logger.warning(
                "Parser '%s' failed for format '%s': %s",
                parser.parser_name,
                format_detected,
                str(exc),
            )
            return ProcessingResult(
                status="failed",
                event_id=event_id,
                format_detected=format_detected,
                normalized_event=None,
                raw_event=raw_log,
                raw_event_hash=raw_event_hash,
                processing_metadata=ProcessingMetadata(
                    processing_time_ms=round((time.perf_counter() - start_time) * 1000, 3)
                ),
                error={
                    "code": "PARSER_FAILURE",
                    "message": f"Parser '{parser.parser_name}' failed to extract attributes: {str(exc)}",
                },
            )
        parse_time_ms = round((time.perf_counter() - parse_start) * 1000, 3)

        # Step 6: Normalization into Universal Event Schema
        normalized_event = EventNormalizer.normalize(
            extracted=extracted_data,
            parser_name=parser.parser_name,
            format_detected=format_detected,
            parse_time_ms=parse_time_ms,
        )

        # If source_hint was provided and device vendor/product not already known, inject it
        if source_hint and normalized_event.device:
            if not normalized_event.device.vendor:
                normalized_event.device.vendor = source_hint

        total_time_ms = round((time.perf_counter() - start_time) * 1000, 3)

        # Step 7: Return lossless outcome
        return ProcessingResult(
            status="success",
            event_id=event_id,
            format_detected=format_detected,
            normalized_event=normalized_event,
            raw_event=raw_log,
            raw_event_hash=raw_event_hash,
            processing_metadata=ProcessingMetadata(
                processing_time_ms=total_time_ms,
            ),
            error=None,
        )

    def process_batch(
        self, raw_logs: List[str], source_hint: Optional[str] = None
    ) -> List[ProcessingResult]:
        """Processes a list of raw log events sequentially (ready for future async/pool)."""
        return [self.process_event(log, source_hint) for log in raw_logs]


# Standalone global instance ready for direct Python imports and workers
ulpf_engine = ULPFEngine()
