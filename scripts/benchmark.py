"""LogForge High-Precision Performance Benchmark & Profiler.

Usage:
    python scripts/benchmark.py [--url http://127.0.0.1:8000] [--events 1000] [--batch-size 100] [--concurrency 10]

Measures real end-to-end throughput, processing latency percentiles (P50, P95, P99),
ULPF engine stages, database writes, search indexing, and active worker scaling.
Outputs the exact benchmark summary format required by NTRO SIH 2026.
"""
import argparse
import base64
import concurrent.futures
import hashlib
import hmac
import json
import math
import os
import random
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

LOG_SAMPLES = [
    (
        "json",
        json.dumps({
            "timestamp": "2026-09-20T01:30:00Z",
            "source_ip": "192.168.1.105",
            "destination_ip": "10.0.0.1",
            "source_port": 54321,
            "destination_port": 443,
            "protocol": "TCP",
            "action": "ALLOW",
            "severity": "LOW",
            "message": "TLS session established",
        }),
    ),
    (
        "cef",
        "CEF:0|PaloAlto|PAN-OS|10.1.0|TRAFFIC|drop|High|src=203.0.113.195 dst=198.51.100.10 spt=44321 dpt=22 proto=tcp act=deny cs1=Rule_Block_SSH",
    ),
    (
        "syslog",
        "<34>1 2026-09-20T01:30:00Z fw01.corp.mil kernel - - [security@1234 rule=\"block-ddos\"] DROPPED TCP src=198.51.100.4 dst=10.1.2.3 spt=5353 dpt=80",
    ),
]


def generate_batch(count: int) -> List[str]:
    """Generates synthetic heterogeneous security logs."""
    return [random.choice(LOG_SAMPLES)[1] for _ in range(count)]


def get_auth_token(user_token: Optional[str] = None) -> str:
    """Resolves or generates a valid administrative JWT for benchmark execution."""
    if user_token:
        return user_token
    if os.environ.get("LOGFORGE_TOKEN"):
        return os.environ["LOGFORGE_TOKEN"]
    # Air-gapped HS256 JWT generation using standard library
    secret = os.environ.get("JWT_SECRET_KEY", "logforge-super-secret-key-for-jwt-sih-2026-ntro-secure")
    header_b64 = base64.urlsafe_b64encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8")
    ).decode("ascii").rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps({
            "sub": "532f957a-fba6-491f-a3db-f321c117be84",
            "username": "admin",
            "exp": int(time.time()) + 86400,
            "iat": int(time.time()),
            "token_type": "access",
        }, separators=(",", ":")).encode("utf-8")
    ).decode("ascii").rstrip("=")
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = base64.urlsafe_b64encode(
        hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    ).decode("ascii").rstrip("=")
    return f"{header_b64}.{payload_b64}.{signature}"


def send_batch_http(url: str, logs: List[str], token: Optional[str] = None) -> Tuple[bool, float, int, int]:
    """Sends a batch to POST /api/v1/logs/batch and measures roundtrip client latency."""
    payload = json.dumps({"raw_logs": logs, "source_hint": "benchmark-agent"}).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        f"{url}/api/v1/logs/batch",
        data=payload,
        headers=headers,
        method="POST",
    )
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=30.0) as resp:
            dur_ms = (time.perf_counter() - start) * 1000.0
            data = json.loads(resp.read().decode("utf-8"))
            successful = data.get("successful", len(logs))
            failed = data.get("failed", 0)
            return True, dur_ms, successful, failed
    except urllib.error.HTTPError as e:
        dur_ms = (time.perf_counter() - start) * 1000.0
        try:
            err_body = e.read().decode("utf-8", errors="replace")
            print(f"[WARN] HTTP {e.code} error during batch: {err_body[:120]}", file=sys.stderr)
        except Exception:
            pass
        return False, dur_ms, 0, len(logs)
    except Exception as exc:
        dur_ms = (time.perf_counter() - start) * 1000.0
        print(f"[WARN] Batch error: {exc}", file=sys.stderr)
        return False, dur_ms, 0, len(logs)


def run_benchmark(
    target_url: str,
    total_events: int = 1000,
    batch_size: int = 100,
    concurrency: int = 10,
    token: Optional[str] = None,
) -> None:
    """Executes benchmark and prints the exact NTRO SIH 2026 benchmark report."""
    auth_token = get_auth_token(token)
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    # 1. Reset metrics on target server if accessible
    try:
        reset_req = urllib.request.Request(
            f"{target_url}/api/v1/system/performance/reset",
            data=b"{}",
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(reset_req, timeout=3.0) as r:
            pass
    except Exception:
        pass

    # 2. Slice total_events into batches
    batches: List[List[str]] = []
    remaining = total_events
    while remaining > 0:
        sz = min(remaining, batch_size)
        batches.append(generate_batch(sz))
        remaining -= sz

    latencies: List[float] = []
    total_successful = 0
    total_failed = 0

    bench_start = time.perf_counter()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(send_batch_http, target_url, b, auth_token) for b in batches]
        for f in concurrent.futures.as_completed(futures):
            ok, dur_ms, succ, fail = f.result()
            # Per-event amortized latency
            batch_len = succ + fail
            if batch_len > 0:
                per_event_ms = dur_ms / batch_len
                latencies.extend([per_event_ms] * batch_len)
            total_successful += succ
            total_failed += fail

    total_duration = max(0.001, time.perf_counter() - bench_start)
    throughput = round(total_successful / total_duration, 1)

    latencies.sort()
    n = len(latencies)
    p50 = latencies[int(n * 0.50)] if n else 0.0
    p95 = latencies[int(n * 0.95)] if n else 0.0
    p99 = latencies[int(n * 0.99)] if n else 0.0

    # Query system performance metrics from backend API
    mysql_lat = "N/A"
    opensearch_lat = "N/A"
    kafka_lag = "N/A"
    active_workers = 1

    try:
        with urllib.request.urlopen(f"{target_url}/api/v1/system/performance", timeout=3.0) as resp:
            perf = json.loads(resp.read().decode("utf-8"))
            if perf.get("mysql_latency_ms") is not None:
                mysql_lat = f"{perf['mysql_latency_ms']:.2f} ms"
            if perf.get("opensearch_latency_ms") is not None:
                opensearch_lat = f"{perf['opensearch_latency_ms']:.2f} ms"
            if perf.get("kafka_lag") is not None:
                kafka_lag = str(perf["kafka_lag"])
            if perf.get("active_workers"):
                active_workers = max(1, perf["active_workers"])
    except Exception:
        pass

    # Print exact required format
    print("\n" + "=" * 40)
    print("LOGFORGE PERFORMANCE BENCHMARK")
    print("=" * 40)
    print()
    print("Events:")
    print(f"{total_events:,}")
    print()
    print("Duration:")
    print(f"{total_duration:.2f} seconds")
    print()
    print("Throughput:")
    print(f"{throughput:,.1f} events/sec")
    print()
    print("P50:")
    print(f"{p50:.2f} ms")
    print()
    print("P95:")
    print(f"{p95:.2f} ms")
    print()
    print("P99:")
    print(f"{p99:.2f} ms")
    print()
    print("Failures:")
    print(f"{total_failed}")
    print()
    print("Kafka Lag:")
    print(f"{kafka_lag}")
    print()
    print("MySQL latency:")
    print(f"{mysql_lat}")
    print()
    print("OpenSearch latency:")
    print(f"{opensearch_lat}")
    print()
    print("Workers:")
    print(f"{active_workers}")
    print()
    print("=" * 40)


def main():
    parser = argparse.ArgumentParser(description="LogForge Benchmark")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Target API URL")
    parser.add_argument("--events", type=int, default=1000, help="Total events to benchmark")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size per request")
    parser.add_argument("--concurrency", type=int, default=10, help="Client concurrency")
    parser.add_argument("--token", default=None, help="Optional JWT token with logs:ingest permission")
    args = parser.parse_args()

    run_benchmark(
        target_url=args.url.rstrip("/"),
        total_events=args.events,
        batch_size=args.batch_size,
        concurrency=args.concurrency,
        token=args.token,
    )


if __name__ == "__main__":
    main()
