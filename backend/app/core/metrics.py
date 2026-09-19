"""Real-time Performance Measurement, Telemetry & Metrics System for LogForge.

Tracks actual runtime events throughput, latency percentiles (P50, P95, P99),
ULPF stage timing breakdowns, database/search latencies, Kafka consumer lag,
active worker heartbeats, and host hardware resource utilization.
"""
from collections import deque
from datetime import datetime, timezone
import math
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from .logging import logger


class PerformanceMetricsCollector:
    """Thread-safe runtime performance telemetry engine.
    
    All calculations are performed over live measured data. No synthetic or mock
    values are generated. Subsystems that are offline or disabled return explicit None.
    """

    def __init__(self, max_samples: int = 10000, window_seconds: float = 10.0) -> None:
        self._lock = threading.Lock()
        self.max_samples = max_samples
        self.window_seconds = window_seconds

        # Absolute Counters
        self.events_received = 0
        self.events_processed = 0
        self.events_failed = 0
        self.events_routed_dlq = 0

        # Throughput sliding window [(timestamp, event_count)]
        self._throughput_window: deque[Tuple[float, int]] = deque()

        # Latency samples in milliseconds (rolling deque)
        self._latencies_ms: deque[float] = deque(maxlen=max_samples)

        # Stage timings samples (rolling deques)
        self._stage_timings: Dict[str, deque[float]] = {
            "format_detection": deque(maxlen=max_samples),
            "parsing": deque(maxlen=max_samples),
            "normalization": deque(maxlen=max_samples),
            "schema_validation": deque(maxlen=max_samples),
            "persistence": deque(maxlen=max_samples),
        }

        # Subsystem latencies in milliseconds (rolling deques)
        self._mysql_latencies_ms: deque[float] = deque(maxlen=max_samples)
        self._opensearch_latencies_ms: deque[float] = deque(maxlen=max_samples)
        self._kafka_produce_latencies_ms: deque[float] = deque(maxlen=max_samples)

        # Active worker heartbeats: {worker_id: {"last_seen": timestamp, "batch_size": int, "processed": int}}
        self._workers: Dict[str, Dict[str, Any]] = {}

        # Kafka lag cache: (timestamp, lag_value)
        self._last_kafka_lag: Optional[Tuple[float, Optional[int]]] = None

        # Process handle for CPU/Memory
        self._process = None
        if PSUTIL_AVAILABLE:
            try:
                self._process = psutil.Process(os.getpid())
                self._process.cpu_percent()  # prime CPU counter
            except Exception:
                pass

    def record_event_received(self, count: int = 1) -> None:
        """Records reception of raw events into the ingestion pipeline."""
        with self._lock:
            self.events_received += count

    def record_event_processed(
        self,
        latency_ms: float,
        count: int = 1,
        stage_breakdown: Optional[Dict[str, float]] = None,
    ) -> None:
        """Records successfully processed event(s) with measured processing latency."""
        now = time.time()
        with self._lock:
            self.events_processed += count
            self._throughput_window.append((now, count))
            self._latencies_ms.append(max(0.001, latency_ms))

            if stage_breakdown:
                for stage, dur in stage_breakdown.items():
                    if stage in self._stage_timings:
                        self._stage_timings[stage].append(max(0.001, dur))

            self._prune_throughput_window(now)

    def record_event_failed(self, count: int = 1) -> None:
        """Records failed events."""
        with self._lock:
            self.events_failed += count

    def record_dlq_routed(self, count: int = 1) -> None:
        """Records events safely routed to DLQ."""
        with self._lock:
            self.events_routed_dlq += count

    def record_mysql_latency(self, latency_ms: float) -> None:
        """Records MySQL query/write roundtrip latency in milliseconds."""
        with self._lock:
            self._mysql_latencies_ms.append(max(0.001, latency_ms))

    def record_opensearch_latency(self, latency_ms: float) -> None:
        """Records OpenSearch indexing/query latency in milliseconds."""
        with self._lock:
            self._opensearch_latencies_ms.append(max(0.001, latency_ms))

    def record_kafka_latency(self, latency_ms: float) -> None:
        """Records Kafka produce latency in milliseconds."""
        with self._lock:
            self._kafka_produce_latencies_ms.append(max(0.001, latency_ms))

    def record_worker_heartbeat(
        self,
        worker_id: str,
        batch_size: int = 100,
        processed_count: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Registers or refreshes heartbeat telemetry for a ULPF stream worker."""
        now = time.time()
        with self._lock:
            self._workers[worker_id] = {
                "worker_id": worker_id,
                "last_seen": now,
                "batch_size": batch_size,
                "processed_count": processed_count,
                "metadata": metadata or {},
            }

    def get_active_worker_count(self, timeout_seconds: float = 15.0) -> int:
        """Returns the number of ULPF workers with heartbeats within timeout_seconds."""
        now = time.time()
        with self._lock:
            active = sum(
                1 for w in self._workers.values()
                if (now - w["last_seen"]) <= timeout_seconds
            )
            return active

    def get_active_workers(self, timeout_seconds: float = 15.0) -> List[Dict[str, Any]]:
        """Returns metadata list of active workers."""
        now = time.time()
        with self._lock:
            return [
                {
                    "worker_id": w["worker_id"],
                    "age_seconds": round(now - w["last_seen"], 2),
                    "batch_size": w["batch_size"],
                    "processed_count": w["processed_count"],
                    "metadata": w["metadata"],
                }
                for w in self._workers.values()
                if (now - w["last_seen"]) <= timeout_seconds
            ]

    def _prune_throughput_window(self, now: float) -> None:
        cutoff = now - self.window_seconds
        while self._throughput_window and self._throughput_window[0][0] < cutoff:
            self._throughput_window.popleft()

    def get_throughput(self) -> float:
        """Calculates current events/sec rate over the active rolling window."""
        now = time.time()
        with self._lock:
            self._prune_throughput_window(now)
            if not self._throughput_window:
                return 0.0
            total_events = sum(count for _, count in self._throughput_window)
            time_span = max(0.001, now - self._throughput_window[0][0])
            return round(total_events / time_span, 2)

    @staticmethod
    def _compute_percentiles(samples: List[float]) -> Dict[str, float]:
        """Calculates exact min, p50, p95, p99, max, and avg for sample list."""
        if not samples:
            return {
                "avg": 0.0,
                "p50": 0.0,
                "p95": 0.0,
                "p99": 0.0,
                "min": 0.0,
                "max": 0.0,
            }
        sorted_samples = sorted(samples)
        n = len(sorted_samples)

        def pct(p: float) -> float:
            k = (n - 1) * p
            f = math.floor(k)
            c = math.ceil(k)
            if f == c:
                return sorted_samples[int(k)]
            d0 = sorted_samples[int(f)] * (c - k)
            d1 = sorted_samples[int(c)] * (k - f)
            return d0 + d1

        return {
            "avg": round(sum(sorted_samples) / n, 3),
            "p50": round(pct(0.50), 3),
            "p95": round(pct(0.95), 3),
            "p99": round(pct(0.99), 3),
            "min": round(sorted_samples[0], 3),
            "max": round(sorted_samples[-1], 3),
        }

    def get_hardware_metrics(self) -> Dict[str, Optional[float]]:
        """Returns real host & process CPU and memory utilization."""
        if not PSUTIL_AVAILABLE:
            return {"cpu_percent": None, "memory_percent": None}

        try:
            cpu = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory().percent
            return {
                "cpu_percent": round(cpu, 1),
                "memory_percent": round(mem, 1),
            }
        except Exception as exc:
            logger.debug("Failed reading hardware metrics: %s", exc)
            return {"cpu_percent": None, "memory_percent": None}

    def get_stage_timings(self) -> Dict[str, float]:
        """Returns average execution times for each ULPF processing stage."""
        with self._lock:
            result: Dict[str, float] = {}
            for stage, samples in self._stage_timings.items():
                if samples:
                    result[stage] = round(sum(samples) / len(samples), 3)
                else:
                    result[stage] = 0.0
            return result

    def get_snapshot(
        self,
        kafka_lag: Optional[int] = None,
        mysql_connected: bool = True,
        opensearch_connected: bool = False,
    ) -> Dict[str, Any]:
        """Returns a consolidated runtime performance metrics snapshot."""
        now = time.time()
        with self._lock:
            lat_samples = list(self._latencies_ms)
            my_samples = list(self._mysql_latencies_ms)
            os_samples = list(self._opensearch_latencies_ms)

        stats = self._compute_percentiles(lat_samples)
        hw = self.get_hardware_metrics()
        stage_timings = self.get_stage_timings()
        active_workers = self.get_active_worker_count()
        throughput = self.get_throughput()

        mysql_lat = round(sum(my_samples) / len(my_samples), 3) if (my_samples and mysql_connected) else (0.0 if mysql_connected else None)
        opensearch_lat = round(sum(os_samples) / len(os_samples), 3) if (os_samples and opensearch_connected) else None

        return {
            "events_received": self.events_received,
            "events_processed": self.events_processed,
            "events_failed": self.events_failed,
            "events_routed_dlq": self.events_routed_dlq,
            "events_per_second": throughput,
            "avg_latency_ms": stats["avg"],
            "p50_latency_ms": stats["p50"],
            "p95_latency_ms": stats["p95"],
            "p99_latency_ms": stats["p99"],
            "min_latency_ms": stats["min"],
            "max_latency_ms": stats["max"],
            "kafka_lag": kafka_lag,
            "active_workers": active_workers,
            "mysql_latency_ms": mysql_lat,
            "opensearch_latency_ms": opensearch_lat,
            "cpu_percent": hw["cpu_percent"],
            "memory_percent": hw["memory_percent"],
            "stage_timings_ms": stage_timings,
        }

    def reset(self) -> None:
        """Resets all metrics counters and samples for reproducible benchmarks."""
        with self._lock:
            self.events_received = 0
            self.events_processed = 0
            self.events_failed = 0
            self.events_routed_dlq = 0
            self._throughput_window.clear()
            self._latencies_ms.clear()
            for q in self._stage_timings.values():
                q.clear()
            self._mysql_latencies_ms.clear()
            self._opensearch_latencies_ms.clear()
            self._kafka_produce_latencies_ms.clear()
            self._workers.clear()


# Global Singleton Metrics Collector
metrics_collector = PerformanceMetricsCollector()
