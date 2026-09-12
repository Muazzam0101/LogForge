"""Pydantic schemas for LogForge Analytics and Dashboard APIs."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AnalyticsSummary(BaseModel):
    """Core KPI summary metrics for the operational dashboard."""
    model_config = ConfigDict(extra="ignore")

    total_events: int = Field(default=0, description="Total events stored in MySQL")
    events_today: int = Field(default=0, description="Events received today (since 00:00 UTC)")
    events_last_24h: int = Field(default=0, description="Events received in the trailing 24 hours")
    high_severity_events: int = Field(default=0, description="Count of events marked high or critical")
    critical_severity_events: int = Field(default=0, description="Count of events marked critical")
    blocked_events: int = Field(default=0, description="Count of events where action is block, deny, or drop")
    active_sources_count: int = Field(default=0, description="Count of unique source IPs detected")


class DistributionItem(BaseModel):
    """Generic category distribution item with count and percentage."""
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., description="Category name (e.g. JSON, CEF, Critical, ALLOW)")
    count: int = Field(..., description="Total event count in category")
    percentage: float = Field(default=0.0, description="Percentage of total events (0.0 - 100.0)")


class TopEndpointItem(BaseModel):
    """IP endpoint item with event count."""
    model_config = ConfigDict(extra="ignore")

    ip: str = Field(..., description="IP address")
    count: int = Field(..., description="Occurrences in stored events")


class TrendPoint(BaseModel):
    """Time-series data point for event volume charts."""
    model_config = ConfigDict(extra="ignore")

    timestamp: str = Field(..., description="ISO or formatted interval timestamp")
    ingested: int = Field(default=0, description="Total logs ingested in this interval")
    normalized: int = Field(default=0, description="Total logs normalized in this interval")
    alerts: int = Field(default=0, description="High/critical severity logs in this interval")


class AnalyticsDistributions(BaseModel):
    """Categorical distributions for detected formats, severities, actions, and top IPs."""
    model_config = ConfigDict(extra="ignore")

    format_distribution: List[DistributionItem] = Field(default_factory=list)
    severity_distribution: List[DistributionItem] = Field(default_factory=list)
    action_distribution: List[DistributionItem] = Field(default_factory=list)
    top_source_ips: List[TopEndpointItem] = Field(default_factory=list)
    top_destination_ips: List[TopEndpointItem] = Field(default_factory=list)


class AnalyticsOverview(BaseModel):
    """Consolidated dashboard analytics response combining summary, distributions, and trend data."""
    model_config = ConfigDict(extra="ignore")

    summary: AnalyticsSummary
    distributions: AnalyticsDistributions
    trends: List[TrendPoint] = Field(default_factory=list)
    time_range: str = Field(default="24h")
