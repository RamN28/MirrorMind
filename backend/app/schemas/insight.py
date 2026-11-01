from pydantic import BaseModel


class PatternItem(BaseModel):
    title: str
    description: str


class MoodBreakdownItem(BaseModel):
    mood: str
    count: int


class WeeklySummary(BaseModel):
    title: str
    summary: str
    change_note: str
    dominant_moods: list[str]
    frequent_tags: list[str]
    growth_signals: list[str]
    helpful_patterns: list[str]
    suggested_focus: str


class DashboardSummary(BaseModel):
    total_entries: int
    entries_this_week: int
    average_mood_score: float
    mood_breakdown: list[MoodBreakdownItem]
    trend_points: list[dict[str, str | float]]
    recent_patterns: list[PatternItem]
    weekly_summary: WeeklySummary
