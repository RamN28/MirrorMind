from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReminderSettingsPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    enabled: bool = False
    time: str = "20:00"
    cadence: str = "daily"
    message: str = "Take five quiet minutes to notice what felt heavy, what helped, and what you want to carry forward."
    last_triggered_at: str | None = Field(default=None, alias="lastTriggeredAt")
    notifications_enabled: bool = Field(default=False, alias="notificationsEnabled")


class PrivacySettingsPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    local_only_mode: bool = Field(default=False, alias="localOnlyMode")
    hide_sensitive_previews: bool = Field(default=False, alias="hideSensitivePreviews")
    export_format: str = Field(default="json", alias="exportFormat")


class WeeklyReviewAnswers(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    noticed: str = ""
    pressure: str = ""
    helped: str = ""
    carry_forward: str = Field(default="", alias="carryForward")


class WeeklyReviewGenerated(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    headline: str
    summary: str
    what_changed: str = Field(alias="whatChanged")
    what_helped: str = Field(alias="whatHelped")
    carry_forward: str = Field(alias="carryForward")


class WeeklyReviewRecordPayload(BaseModel):
    created_at: datetime
    answers: WeeklyReviewAnswers
    generated: WeeklyReviewGenerated


class UserStateEnvelope(BaseModel):
    user_id: int = Field(..., gt=0)
    reminders: ReminderSettingsPayload | None = None
    privacy: PrivacySettingsPayload | None = None
    weekly_review: WeeklyReviewRecordPayload | None = None
