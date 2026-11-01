export type User = {
  id: number;
  name: string;
  email: string;
};

export type Insight = {
  summary: string;
  emotional_patterns: string;
  recurring_concerns: string;
  based_on_patterns?: string | null;
  follow_up_questions: string[];
  action_suggestion: string;
  disclaimer: string;
};

export type Entry = {
  id: number;
  user_id: number;
  content: string;
  mood: string | null;
  mood_score: number | null;
  tags: string[];
  created_at: string;
  insight: Insight | null;
};

export type PatternItem = {
  title: string;
  description: string;
};

export type WeeklySummary = {
  title: string;
  summary: string;
  change_note: string;
  dominant_moods: string[];
  frequent_tags: string[];
  growth_signals: string[];
  helpful_patterns: string[];
  suggested_focus: string;
};

export type DashboardSummary = {
  total_entries: number;
  entries_this_week: number;
  average_mood_score: number;
  mood_breakdown: { mood: string; count: number }[];
  trend_points: { date: string; score: number }[];
  recent_patterns: PatternItem[];
  weekly_summary: WeeklySummary;
};

export type WeeklyReviewRecord = {
  created_at: string;
  answers: {
    noticed: string;
    pressure: string;
    helped: string;
    carryForward: string;
  };
  generated: {
    headline: string;
    summary: string;
    whatChanged: string;
    whatHelped: string;
    carryForward: string;
  };
};

export type ReminderSettings = {
  enabled: boolean;
  time: string;
  cadence: "daily" | "weekdays";
  message: string;
  lastTriggeredAt: string | null;
  notificationsEnabled: boolean;
};

export type PrivacySettings = {
  localOnlyMode: boolean;
  hideSensitivePreviews: boolean;
  exportFormat: "json" | "markdown";
};
