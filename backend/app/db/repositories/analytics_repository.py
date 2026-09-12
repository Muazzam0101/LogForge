"""Analytics Repository for Database-Level SQL Aggregations."""
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ...models.event import EventModel
from ...schemas.analytics import (
    AnalyticsDistributions,
    AnalyticsOverview,
    AnalyticsSummary,
    DistributionItem,
    TopEndpointItem,
    TrendPoint,
)


class AnalyticsRepository:
    """High-efficiency database aggregator using native SQL functions."""

    @staticmethod
    def get_summary(db: Session) -> AnalyticsSummary:
        """Computes top-level KPI metrics directly in MySQL/SQLite."""
        now_utc = datetime.now(timezone.utc)
        today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        last_24h_start = now_utc - timedelta(hours=24)

        # 1. Total events
        total_events = db.scalar(select(func.count(EventModel.id))) or 0

        # 2. Events today (since 00:00 UTC)
        events_today = (
            db.scalar(
                select(func.count(EventModel.id)).where(EventModel.created_at >= today_start)
            )
            or 0
        )

        # 3. Events last 24h
        events_last_24h = (
            db.scalar(
                select(func.count(EventModel.id)).where(EventModel.created_at >= last_24h_start)
            )
            or 0
        )

        # 4. High & critical severity counts
        high_crit_filter = func.lower(EventModel.severity).in_(
            ["high", "critical", "fatal", "err", "error"]
        )
        high_severity_events = (
            db.scalar(select(func.count(EventModel.id)).where(high_crit_filter)) or 0
        )

        crit_filter = func.lower(EventModel.severity).in_(["critical", "fatal"])
        critical_severity_events = (
            db.scalar(select(func.count(EventModel.id)).where(crit_filter)) or 0
        )

        # 5. Blocked / Denied action counts
        blocked_filter = func.lower(EventModel.action).in_(
            ["block", "deny", "drop", "reject"]
        )
        blocked_events = (
            db.scalar(select(func.count(EventModel.id)).where(blocked_filter)) or 0
        )

        # 6. Active sources count (distinct source IPs)
        active_sources_count = (
            db.scalar(
                select(func.count(func.distinct(EventModel.source_ip))).where(
                    EventModel.source_ip.isnot(None)
                )
            )
            or 0
        )

        return AnalyticsSummary(
            total_events=total_events,
            events_today=events_today,
            events_last_24h=events_last_24h,
            high_severity_events=high_severity_events,
            critical_severity_events=critical_severity_events,
            blocked_events=blocked_events,
            active_sources_count=active_sources_count,
        )

    @staticmethod
    def get_distributions(db: Session, total_events: int) -> AnalyticsDistributions:
        """Aggregates format, severity, action, and top endpoint distributions."""
        # Format distribution
        format_stmt = (
            select(EventModel.detected_format, func.count(EventModel.id))
            .group_by(EventModel.detected_format)
            .order_by(func.count(EventModel.id).desc())
        )
        format_rows = db.execute(format_stmt).all()
        format_distribution = [
            DistributionItem(
                name=row[0].upper() if row[0] else "UNKNOWN",
                count=row[1],
                percentage=round((row[1] / total_events) * 100, 1) if total_events > 0 else 0.0,
            )
            for row in format_rows
        ]

        # Severity distribution
        sev_stmt = (
            select(EventModel.severity, func.count(EventModel.id))
            .group_by(EventModel.severity)
            .order_by(func.count(EventModel.id).desc())
        )
        sev_rows = db.execute(sev_stmt).all()
        severity_distribution = [
            DistributionItem(
                name=row[0].upper() if row[0] else "UNCLASSIFIED",
                count=row[1],
                percentage=round((row[1] / total_events) * 100, 1) if total_events > 0 else 0.0,
            )
            for row in sev_rows
        ]

        # Action distribution
        action_stmt = (
            select(EventModel.action, func.count(EventModel.id))
            .where(EventModel.action.isnot(None))
            .group_by(EventModel.action)
            .order_by(func.count(EventModel.id).desc())
        )
        action_rows = db.execute(action_stmt).all()
        action_distribution = [
            DistributionItem(
                name=row[0].upper(),
                count=row[1],
                percentage=round((row[1] / total_events) * 100, 1) if total_events > 0 else 0.0,
            )
            for row in action_rows
        ]

        # Top Source IPs
        src_stmt = (
            select(EventModel.source_ip, func.count(EventModel.id))
            .where(EventModel.source_ip.isnot(None))
            .group_by(EventModel.source_ip)
            .order_by(func.count(EventModel.id).desc())
            .limit(5)
        )
        src_rows = db.execute(src_stmt).all()
        top_source_ips = [TopEndpointItem(ip=row[0], count=row[1]) for row in src_rows]

        # Top Destination IPs
        dst_stmt = (
            select(EventModel.destination_ip, func.count(EventModel.id))
            .where(EventModel.destination_ip.isnot(None))
            .group_by(EventModel.destination_ip)
            .order_by(func.count(EventModel.id).desc())
            .limit(5)
        )
        dst_rows = db.execute(dst_stmt).all()
        top_destination_ips = [TopEndpointItem(ip=row[0], count=row[1]) for row in dst_rows]

        return AnalyticsDistributions(
            format_distribution=format_distribution,
            severity_distribution=severity_distribution,
            action_distribution=action_distribution,
            top_source_ips=top_source_ips,
            top_destination_ips=top_destination_ips,
        )

    @staticmethod
    def get_event_trends(db: Session, time_range: str = "24h") -> List[TrendPoint]:
        """Aggregates event counts grouped by hourly or daily interval in SQL."""
        now_utc = datetime.now(timezone.utc)

        if time_range == "7d":
            start_time = now_utc - timedelta(days=7)
            is_hourly = False
        elif time_range == "30d":
            start_time = now_utc - timedelta(days=30)
            is_hourly = False
        else:  # default 24h
            start_time = now_utc - timedelta(hours=24)
            is_hourly = True

        # Dialect-agnostic date formatting expression
        bind = db.get_bind()
        dialect_name = bind.dialect.name if bind else "sqlite"

        if dialect_name == "sqlite":
            if is_hourly:
                bucket_expr = func.strftime("%Y-%m-%d %H:00", EventModel.created_at)
            else:
                bucket_expr = func.strftime("%Y-%m-%d", EventModel.created_at)
        elif dialect_name in ("mysql", "mariadb"):
            if is_hourly:
                bucket_expr = func.date_format(EventModel.created_at, "%Y-%m-%d %H:00")
            else:
                bucket_expr = func.date_format(EventModel.created_at, "%Y-%m-%d")
        else:
            # Fallback (PostgreSQL or generic)
            if is_hourly:
                bucket_expr = func.to_char(EventModel.created_at, "YYYY-MM-DD HH24:00")
            else:
                bucket_expr = func.to_char(EventModel.created_at, "YYYY-MM-DD")

        alert_expr = case(
            (
                func.lower(EventModel.severity).in_(
                    ["critical", "high", "fatal", "err", "error"]
                ),
                1,
            ),
            else_=0,
        )

        trend_stmt = (
            select(
                bucket_expr.label("bucket"),
                func.count(EventModel.id).label("ingested"),
                func.sum(alert_expr).label("alerts"),
            )
            .where(EventModel.created_at >= start_time)
            .group_by("bucket")
            .order_by("bucket")
        )

        rows = db.execute(trend_stmt).all()
        return [
            TrendPoint(
                timestamp=str(row[0]),
                ingested=int(row[1]),
                normalized=int(row[1]),  # Stored events are 100% normalized by ULPF
                alerts=int(row[2] or 0),
            )
            for row in rows
            if row[0]
        ]

    @classmethod
    def get_overview(cls, db: Session, time_range: str = "24h") -> AnalyticsOverview:
        """Assembles consolidated dashboard metrics in a unified response."""
        summary = cls.get_summary(db)
        distributions = cls.get_distributions(db, total_events=summary.total_events)
        trends = cls.get_event_trends(db, time_range=time_range)

        return AnalyticsOverview(
            summary=summary,
            distributions=distributions,
            trends=trends,
            time_range=time_range,
        )
