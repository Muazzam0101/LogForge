"""LogForge Load Testing Scenarios Suite for NTRO SIH 2026.

Usage:
    python scripts/load_test_scenarios.py --scenario [A|B|C|D|E|ALL] [--url http://127.0.0.1:8000]

Scenarios:
    Scenario A: 100 events (quick sanity test)
    Scenario B: 1,000 events (standard load test)
    Scenario C: 10,000 events (high-volume ingestion stress test)
    Scenario D: 100 concurrent clients (high-concurrency test)
    Scenario E: Sustained event stream (continuous stream across 10 seconds)
"""
import argparse
import base64
import concurrent.futures
import hashlib
import hmac
import json
import os
import random
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

LOG_TEMPLATES = [
    (
        "json",
        json.dumps({
            "timestamp": "2026-09-20T01:30:00Z",
            "source_ip": "10.0.4.15",
            "destination_ip": "172.16.0.1",
            "source_port": 51234,
            "destination_port": 443,
            "protocol": "TCP",
            "action": "ALLOW",
            "severity": "INFORMATIONAL",
            "message": "Outbound TLS tunnel verified",
        }),
    ),
    (
        "cef",
        "CEF:0|CheckPoint|FireWall-1|R81|drop|Drop packet|High|src=198.51.100.22 dst=203.0.113.50 spt=49152 dpt=22 proto=tcp act=drop cs1=Policy_Block",
    ),
    (
        "syslog",
        "<165>1 2026-09-20T01:30:00Z border-gw01 cisco-asa 12345 ID47 - %ASA-4-106023: Deny tcp src 192.168.1.100:4432 dst 10.0.0.5:80 by access-group 'OUTSIDE_IN'",
    ),
]


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


def send_batch(url: str, logs: List[str], token: Optional[str] = None) -> Tuple[bool, float, int, int]:
    payload = json.dumps({"raw_logs": logs, "source_hint": "load-test-agent"}).encode("utf-8")
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
        with urllib.request.urlopen(req, timeout=45.0) as resp:
            dur_ms = (time.perf_counter() - start) * 1000.0
            data = json.loads(resp.read().decode("utf-8"))
            return True, dur_ms, data.get("successful", len(logs)), data.get("failed", 0)
    except Exception as e:
        dur_ms = (time.perf_counter() - start) * 1000.0
        return False, dur_ms, 0, len(logs)


def run_scenario(
    name: str,
    target_url: str,
    total_events: int,
    batch_size: int,
    concurrency: int,
    duration_limit_sec: Optional[float] = None,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    print("=" * 65)
    print(f"RUNNING LOAD TEST: {name}")
    print(f"Target: {target_url} | Target Events: {total_events:,} | Batch: {batch_size} | Concurrency: {concurrency}")
    print("=" * 65)

    auth_token = get_auth_token(token)
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    # Reset metrics on target server
    try:
        req = urllib.request.Request(
            f"{target_url}/api/v1/system/performance/reset",
            data=b"{}",
            headers=headers,
            method="POST",
        )
        urllib.request.urlopen(req, timeout=3.0)
    except Exception:
        pass

    batches = []
    if duration_limit_sec is None:
        rem = total_events
        while rem > 0:
            sz = min(rem, batch_size)
            batches.append([random.choice(LOG_TEMPLATES)[1] for _ in range(sz)])
            rem -= sz
    else:
        # Pre-generate candidate batches for sustained stream
        for _ in range(max(10, total_events // batch_size)):
            batches.append([random.choice(LOG_TEMPLATES)[1] for _ in range(batch_size)])

    latencies: List[float] = []
    total_succ = 0
    total_fail = 0

    start_time = time.perf_counter()

    if duration_limit_sec:
        # Sustained stream across time limit
        def worker_loop():
            nonlocal total_succ, total_fail
            local_lat = []
            while (time.perf_counter() - start_time) < duration_limit_sec:
                batch = random.choice(batches)
                ok, dur_ms, succ, fail = send_batch(target_url, batch, auth_token)
                total_succ += succ
                total_fail += fail
                if succ + fail > 0:
                    local_lat.extend([dur_ms / (succ + fail)] * (succ + fail))
            return local_lat

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futs = [executor.submit(worker_loop) for _ in range(concurrency)]
            for f in concurrent.futures.as_completed(futs):
                latencies.extend(f.result())
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futs = [executor.submit(send_batch, target_url, b, auth_token) for b in batches]
            for f in concurrent.futures.as_completed(futs):
                ok, dur_ms, succ, fail = f.result()
                total_succ += succ
                total_fail += fail
                if succ + fail > 0:
                    latencies.extend([dur_ms / (succ + fail)] * (succ + fail))

    elapsed = max(0.001, time.perf_counter() - start_time)
    throughput = round(total_succ / elapsed, 1)

    latencies.sort()
    n = len(latencies)
    p50 = latencies[int(n * 0.50)] if n else 0.0
    p95 = latencies[int(n * 0.95)] if n else 0.0
    p99 = latencies[int(n * 0.99)] if n else 0.0
    avg_lat = sum(latencies) / n if n else 0.0

    # Read system telemetry from backend
    cpu = "N/A"
    mem = "N/A"
    mysql_lat = "N/A"
    opensearch_lat = "N/A"
    try:
        with urllib.request.urlopen(f"{target_url}/api/v1/system/performance", timeout=3.0) as resp:
            perf = json.loads(resp.read().decode("utf-8"))
            if perf.get("cpu_percent") is not None:
                cpu = f"{perf['cpu_percent']}%"
            if perf.get("memory_percent") is not None:
                mem = f"{perf['memory_percent']}%"
            if perf.get("mysql_latency_ms") is not None:
                mysql_lat = f"{perf['mysql_latency_ms']:.2f} ms"
            if perf.get("opensearch_latency_ms") is not None:
                opensearch_lat = f"{perf['opensearch_latency_ms']:.2f} ms"
    except Exception:
        pass

    results = {
        "scenario": name,
        "total_requests": len(batches) if not duration_limit_sec else total_succ // batch_size,
        "total_events": total_succ + total_fail,
        "successful_events": total_succ,
        "failed_events": total_fail,
        "success_rate": round(total_succ / max(1, total_succ + total_fail) * 100, 1),
        "duration_seconds": round(elapsed, 2),
        "throughput_eps": throughput,
        "avg_latency_ms": round(avg_lat, 2),
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
        "cpu": cpu,
        "memory": mem,
        "mysql_latency": mysql_lat,
        "opensearch_latency": opensearch_lat,
    }

    print("-" * 65)
    print(f"Results for {name}:")
    print(f"  Processed: {total_succ:,} events ({results['success_rate']}% success)")
    print(f"  Failures : {total_fail}")
    print(f"  Duration : {results['duration_seconds']}s")
    print(f"  Throughput: {throughput:,} events/sec")
    print(f"  Latency  : P50: {results['p50_ms']}ms | P95: {results['p95_ms']}ms | P99: {results['p99_ms']}ms")
    print(f"  Hardware : CPU: {cpu} | Memory: {mem}")
    print(f"  Storage  : MySQL: {mysql_lat} | OpenSearch: {opensearch_lat}")
    print("=" * 65 + "\n")
    return results


def main():
    parser = argparse.ArgumentParser(description="LogForge Load Testing Scenarios")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Base API URL")
    parser.add_argument("--scenario", default="ALL", choices=["A", "B", "C", "D", "E", "ALL"], help="Scenario to execute")
    parser.add_argument("--token", default=None, help="Optional JWT auth token")
    args = parser.parse_args()

    url = args.url.rstrip("/")
    scenarios_to_run = ["A", "B", "C", "D", "E"] if args.scenario == "ALL" else [args.scenario]
    all_results = []

    for sc in scenarios_to_run:
        if sc == "A":
            res = run_scenario("Scenario A: 100 Events Sanity Load", url, total_events=100, batch_size=20, concurrency=2, token=args.token)
        elif sc == "B":
            res = run_scenario("Scenario B: 1,000 Events Standard Load", url, total_events=1000, batch_size=100, concurrency=5, token=args.token)
        elif sc == "C":
            res = run_scenario("Scenario C: 10,000 Events High-Volume Ingestion", url, total_events=10000, batch_size=500, concurrency=10, token=args.token)
        elif sc == "D":
            res = run_scenario("Scenario D: 100 Concurrent Clients", url, total_events=5000, batch_size=50, concurrency=100, token=args.token)
        elif sc == "E":
            res = run_scenario("Scenario E: Sustained Event Stream (10s continuous)", url, total_events=5000, batch_size=100, concurrency=10, duration_limit_sec=10.0, token=args.token)
        all_results.append(res)

    print("\n" + "=" * 80)
    print("LOAD TESTING CONSOLIDATED SUMMARY")
    print("=" * 80)
    print(f"{'Scenario':<42} {'Events':<10} {'Throughput':<14} {'P50':<9} {'P95':<9} {'Success'}")
    print("-" * 80)
    for r in all_results:
        print(f"{r['scenario']:<42} {r['successful_events']:<10,} {r['throughput_eps']:<14.1f} {r['p50_ms']:<9.2f} {r['p95_ms']:<9.2f} {r['success_rate']}%")
    print("=" * 80)


if __name__ == "__main__":
    main()
