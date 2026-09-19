"""LogForge In-Process & HTTP Benchmark Entrypoint.

Usage:
    python -m app.benchmark [--events 1000] [--batch-size 100] [--concurrency 10]
"""
import argparse
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from scripts.benchmark import run_benchmark


def main():
    parser = argparse.ArgumentParser(description="LogForge Benchmark Entrypoint")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Target API URL")
    parser.add_argument("--events", type=int, default=1000, help="Total events to benchmark")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size per request")
    parser.add_argument("--concurrency", type=int, default=10, help="Client concurrency")
    parser.add_argument("--token", default=None, help="Optional JWT auth token")
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
