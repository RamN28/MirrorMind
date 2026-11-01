import json
from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Any

from openai import OpenAI

from app.core.config import get_settings
from app.schemas.entry import InsightPayload
from app.schemas.insight import PatternItem, WeeklySummary

settings = get_settings()

DISCLAIMER = (
    "MirrorMind is a self-reflection tool for personal insight. It is not a mental health professional, "
    "and it does not provide medical, psychological, or crisis support."
)

MOOD_SCORE_MAP = {
    "overwhelmed": 2.0,
    "anxious": 3.0,
    "tired": 4.0,
    "uncertain": 4.5,
    "neutral": 5.0,
    "hopeful": 7.0,
    "motivated": 8.0,
    "calm": 8.5,
    "grateful": 9.0,
}


class AIReflectionService:
    def __init__(self) -> None:
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def mood_to_score(self, mood: str | None) -> float | None:
        if not mood:
            return None
        return MOOD_SCORE_MAP.get(mood.lower(), 5.0)

    def generate_entry_reflection(
        self,
        content: str,
        mood: str | None,
        tags: list[str],
        recent_entries: list[dict[str, Any]] | None = None,
    ) -> InsightPayload:
        recent_entries = recent_entries or []
        context = self._build_reflection_context(recent_entries, mood, tags, content)
        if not self.client:
            return self._fallback_reflection(content=content, mood=mood, tags=tags, context=context)

        system_prompt = (
            "You are MirrorMind, an AI self-awareness coach. Respond in a grounded, thoughtful, human tone. "
            "Help the user reflect on patterns, concerns, and next steps without sounding clinical or diagnostic. "
            "Avoid certainty, avoid therapy language, and never imply a medical judgment."
        )
        user_prompt = f"""
Analyze this journal entry and return JSON with keys:
summary, emotional_patterns, recurring_concerns, based_on_patterns, follow_up_questions, action_suggestion.

Entry:
{content}

Mood: {mood or "not provided"}
Tags: {", ".join(tags) if tags else "none"}
Recent reflection context:
- repeated_themes: {", ".join(context["repeated_themes"]) or "none"}
- repeated_moods: {", ".join(context["repeated_moods"]) or "none"}
- common stressors: {", ".join(context["stressors"]) or "none"}
- helpful signals: {", ".join(context["helpful_signals"]) or "none"}
- notable shift: {context["change_note"]}

Rules:
- Keep the summary to 2-3 sentences.
- emotional_patterns and recurring_concerns should be careful and non-diagnostic.
- based_on_patterns should be one sentence beginning with wording like "Based on your recent reflections..."
- follow_up_questions must contain 2 or 3 reflective questions.
- action_suggestion should be supportive and practical in one sentence.
- If relevant, connect this entry to the recent reflection context without overstating certainty.
"""
        try:
            response = self.client.responses.create(
                model=settings.openai_model,
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                text={"format": {"type": "json_object"}},
            )
            payload = json.loads(response.output_text)
            return InsightPayload(
                summary=payload["summary"],
                emotional_patterns=payload["emotional_patterns"],
                recurring_concerns=payload["recurring_concerns"],
                based_on_patterns=payload.get("based_on_patterns"),
                follow_up_questions=payload["follow_up_questions"],
                action_suggestion=payload["action_suggestion"],
                disclaimer=DISCLAIMER,
            )
        except Exception:
            return self._fallback_reflection(content=content, mood=mood, tags=tags, context=context)

    def generate_patterns(self, entries: list[dict[str, Any]]) -> list[PatternItem]:
        if not entries:
            return [
                PatternItem(
                    title="Patterns will appear here",
                    description="Add a few reflections over several days and MirrorMind will surface recurring themes, moods, and stressors.",
                )
            ]

        context = self._build_reflection_context(entries)
        tag_counter = Counter(tag for entry in entries for tag in entry["tags"])
        mood_counter = Counter(entry["mood"] for entry in entries if entry.get("mood"))
        items: list[PatternItem] = []

        if context["repeated_themes"]:
            tag = context["repeated_themes"][0]
            items.append(
                PatternItem(
                    title="Repeated theme",
                    description=f"You've mentioned {tag} several times lately, which suggests it is holding a lot of attention in the background of daily life.",
                )
            )
        elif tag_counter:
            tag, _ = tag_counter.most_common(1)[0]
            items.append(
                PatternItem(
                    title="Repeated theme",
                    description=f"You've returned to {tag} often lately, which suggests it is taking up meaningful mental space right now.",
                )
            )

        if context["repeated_moods"]:
            mood = context["repeated_moods"][0]
            items.append(
                PatternItem(
                    title="Recurring mood",
                    description=f"{mood.capitalize()} appears repeatedly in recent entries, so it may be shaping how you interpret pressure, progress, or uncertainty.",
                )
            )

        if context["stressors"]:
            items.append(
                PatternItem(
                    title="Common stressor",
                    description=f"{context['stressors'][0].capitalize()} keeps appearing around difficult moments, so it may be one of the clearest pressure points to watch.",
                )
            )

        if context["helpful_signals"]:
            items.append(
                PatternItem(
                    title="What seems to help",
                    description=f"You sound steadier when {context['helpful_signals'][0]}, which may be worth treating as a repeatable support rather than a one-time exception.",
                )
            )

        return items[:4]

    def generate_weekly_summary(self, entries: list[dict[str, Any]]) -> WeeklySummary:
        recent = entries[:7]
        older = entries[7:14]
        context = self._build_reflection_context(recent, fallback_entries=older)
        recent_tags = Counter(tag for entry in recent for tag in entry["tags"])
        recent_moods = Counter(entry["mood"] for entry in recent if entry.get("mood"))

        dominant_moods = [mood for mood, _ in recent_moods.most_common(3)] or ["neutral"]
        frequent_tags = [tag for tag, _ in recent_tags.most_common(3)] or ["reflection"]

        growth_signals = []
        if "goals" in frequent_tags or "motivation" in frequent_tags:
            growth_signals.append("You are checking in on direction and momentum more intentionally.")
        if "relationships" in frequent_tags:
            growth_signals.append("You are noticing how connection affects your emotional clarity.")
        if context["helpful_signals"]:
            growth_signals.append(f"You are starting to notice that {context['helpful_signals'][0]} helps you regain perspective.")
        if not growth_signals:
            growth_signals.append("You are building a more consistent reflection habit, which makes patterns easier to notice.")

        summary_parts = []
        if context["repeated_themes"]:
            summary_parts.append(
                f"Recent entries keep circling back to {', '.join(context['repeated_themes'][:2])}, which suggests those areas are carrying the most emotional weight right now."
            )
        if context["stressors"]:
            summary_parts.append(
                f"A common pressure point seems to be {context['stressors'][0]}, especially when you are already feeling stretched or uncertain."
            )
        if context["helpful_signals"]:
            summary_parts.append(
                f"You also seem to stabilize when {context['helpful_signals'][0]}, which is an encouraging pattern worth repeating on purpose."
            )
        if not summary_parts:
            summary_parts.append(
                "Recent entries point to a mix of self-observation, stress processing, and future planning. Your reflections show you are trying to make sense of both feelings and habits rather than simply reacting to them."
            )

        return WeeklySummary(
            title="This week in reflection",
            summary=" ".join(summary_parts),
            change_note=context["change_note"],
            dominant_moods=dominant_moods,
            frequent_tags=frequent_tags,
            growth_signals=growth_signals,
            helpful_patterns=context["helpful_signals"] or ["Small moments of reflection are giving you useful signal, even when the pattern is still emerging."],
            suggested_focus=self._build_suggested_focus(context),
        )

    def _fallback_reflection(
        self,
        content: str,
        mood: str | None,
        tags: list[str],
        context: dict[str, Any] | None = None,
    ) -> InsightPayload:
        context = context or self._build_reflection_context([])
        opening = content.strip().split(".")[0][:180]
        emotional_patterns = (
            f"The tone suggests {mood.lower()} energy."
            if mood
            else "The entry carries a reflective tone with a mix of observation and emotion."
        )
        recurring_bits = []
        if context["repeated_themes"]:
            recurring_bits.append(f"You've revisited {', '.join(context['repeated_themes'][:2])} across recent reflections")
        if context["stressors"]:
            recurring_bits.append(f"{context['stressors'][0]} seems to be one of the clearer pressure points")
        if not recurring_bits and tags:
            recurring_bits.append(f"{', '.join(tags[:2])} may be part of a recurring concern here")
        recurring_concerns = (
            ". ".join(recurring_bits) + "."
            if recurring_bits
            else "There may be an underlying concern around pressure, uncertainty, or wanting more clarity."
        )
        summary = (
            f"You're reflecting on {opening.lower()} and trying to understand what it means for you. "
            "There is a sense of wanting more clarity instead of staying on autopilot."
        )
        if context["repeated_themes"]:
            summary += f" This also seems connected to your recent pattern around {context['repeated_themes'][0]}."
        questions = [
            "What part of this situation feels most important to you right now?",
            "When this theme shows up, what do you usually need but rarely name directly?",
            "What would a slightly more grounded response look like this week?",
        ]
        if context["helpful_signals"]:
            questions[2] = f"When {context['helpful_signals'][0]} helps, what is different about the way you respond to yourself?"
        based_on_patterns = self._build_based_on_patterns(context)
        return InsightPayload(
            summary=summary,
            emotional_patterns=emotional_patterns,
            recurring_concerns=recurring_concerns,
            based_on_patterns=based_on_patterns,
            follow_up_questions=questions[:3],
            action_suggestion=self._build_suggested_focus(context),
            disclaimer=DISCLAIMER,
        )

    def _build_reflection_context(
        self,
        entries: list[dict[str, Any]],
        current_mood: str | None = None,
        current_tags: list[str] | None = None,
        current_content: str | None = None,
        fallback_entries: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        entries = entries or []
        fallback_entries = fallback_entries or []
        all_entries = entries or fallback_entries
        current_tags = current_tags or []

        tag_counter = Counter(tag for entry in entries for tag in entry.get("tags", []))
        mood_counter = Counter(entry["mood"] for entry in entries if entry.get("mood"))
        stressor_counter = Counter()
        helpful_counter = Counter()

        for entry in entries:
            text = entry.get("content", "").lower()
            for label, keywords in STRESSOR_KEYWORDS.items():
                if any(keyword in text for keyword in keywords):
                    stressor_counter[label] += 1
            for label, keywords in HELPFUL_SIGNAL_KEYWORDS.items():
                if any(keyword in text for keyword in keywords):
                    helpful_counter[label] += 1

        if current_content:
            text = current_content.lower()
            for label, keywords in STRESSOR_KEYWORDS.items():
                if any(keyword in text for keyword in keywords):
                    stressor_counter[label] += 1
            for label, keywords in HELPFUL_SIGNAL_KEYWORDS.items():
                if any(keyword in text for keyword in keywords):
                    helpful_counter[label] += 1

        for tag in current_tags:
            tag_counter[tag] += 1
        if current_mood:
            mood_counter[current_mood] += 1

        recent_scores = [self.mood_to_score(entry.get("mood")) for entry in entries if entry.get("mood")]
        older_scores = [self.mood_to_score(entry.get("mood")) for entry in fallback_entries if entry.get("mood")]
        change_note = "Your recent reflections are fairly consistent with earlier ones."
        if recent_scores and older_scores:
            recent_avg = sum(score for score in recent_scores if score is not None) / len(recent_scores)
            older_avg = sum(score for score in older_scores if score is not None) / len(older_scores)
            if recent_avg - older_avg >= 1:
                change_note = "Compared with older entries, your recent reflections sound a little steadier and more resourced."
            elif older_avg - recent_avg >= 1:
                change_note = "Compared with older entries, recent reflections carry more strain or pressure, which may be worth checking in on earlier."
        elif mood_counter:
            top_mood = mood_counter.most_common(1)[0][0]
            change_note = f"{top_mood.capitalize()} has been especially present lately, which may be shaping how you interpret current situations."

        repeated_themes = [tag for tag, count in tag_counter.most_common(3) if count >= 2]
        repeated_moods = [mood for mood, count in mood_counter.most_common(3) if count >= 2]
        stressors = [label for label, count in stressor_counter.most_common(3) if count >= 1]
        helpful_signals = [label for label, count in helpful_counter.most_common(3) if count >= 1]

        if not helpful_signals and all_entries:
            positive_entries = [
                entry for entry in all_entries if self.mood_to_score(entry.get("mood")) and self.mood_to_score(entry.get("mood")) >= 7
            ]
            if positive_entries:
                helpful_signals.append("you describe concrete next steps instead of carrying everything at once")

        return {
            "repeated_themes": repeated_themes,
            "repeated_moods": repeated_moods,
            "stressors": stressors,
            "helpful_signals": helpful_signals,
            "change_note": change_note,
        }

    def _build_suggested_focus(self, context: dict[str, Any]) -> str:
        if context["helpful_signals"]:
            return f"For your next reflection, pay attention to whether {context['helpful_signals'][0]} changes your energy, clarity, or self-talk."
        if context["stressors"]:
            return f"This week, try naming {context['stressors'][0]} earlier, before it turns into a bigger spiral."
        if context["repeated_themes"]:
            return f"Pick one small action that supports your ongoing theme around {context['repeated_themes'][0]}, even if it only takes ten minutes."
        return "For your next reflection, focus on one moment that drained you and one moment that helped you feel more grounded."

    def _build_based_on_patterns(self, context: dict[str, Any]) -> str | None:
        if context["repeated_themes"] and context["helpful_signals"]:
            return (
                f"Based on your recent reflections, {context['repeated_themes'][0]} has been a repeating theme, "
                f"and you tend to sound steadier when {context['helpful_signals'][0]}."
            )
        if context["repeated_themes"]:
            return f"Based on your recent reflections, {context['repeated_themes'][0]} keeps returning as an important theme."
        if context["stressors"]:
            return f"Based on your recent reflections, {context['stressors'][0]} seems to show up around your harder moments."
        return None


STRESSOR_KEYWORDS = {
    "academic stress": ["school", "class", "exam", "grades", "homework", "study", "assignment", "college"],
    "relationship tension": ["relationship", "friend", "partner", "family", "people", "roommate", "text", "conversation"],
    "uncertainty about the future": ["future", "uncertain", "what if", "career", "next year", "after graduation"],
    "self-pressure": ["behind", "progress", "productive", "enough", "expectation", "pressure", "should"],
}

HELPFUL_SIGNAL_KEYWORDS = {
    "you break things into smaller steps": ["small step", "smaller step", "break", "one thing", "chunk"],
    "you slow down enough to name what is actually in your control": ["control", "grounded", "clarity", "pause", "breathe"],
    "you reconnect with long-term goals instead of only reacting to the moment": ["goal", "future", "direction", "plan", "purpose"],
    "you feel better after honest conversation or connection": ["talk", "friend", "conversation", "support", "together"],
}


def build_trend_points(entries: list[dict[str, Any]]) -> list[dict[str, str | float]]:
    points = []
    ordered = sorted(entries, key=lambda entry: entry["created_at"])
    for entry in ordered[-10:]:
        points.append(
            {
                "date": entry["created_at"].strftime("%b %d"),
                "score": float(entry["mood_score"] or 5.0),
            }
        )
    return points


def count_entries_this_week(entries: list[dict[str, Any]]) -> int:
    week_ago = datetime.now(UTC) - timedelta(days=7)
    return sum(1 for entry in entries if entry["created_at"].replace(tzinfo=UTC) >= week_ago)
