"""ORM models package — re-exports all models for convenient access."""

from app.models.base import Base, TimestampMixin
from app.models.alert import Alert
from app.models.analytics import AnalyticsEvent
from app.models.contractor import Contractor
from app.models.conversation import (
    ChannelType,
    Conversation,
    ConversationStatus,
    Message,
    SenderType,
)
from app.models.document import Document
from app.models.expense import Expense, ExpenseCategory
from app.models.lease import Lease, LeaseStatus, LeaseType
from app.models.maintenance import (
    MaintenanceCategory,
    MaintenancePhoto,
    MaintenanceRequest,
    MaintenanceStatus,
    MaintenanceUrgency,
)
from app.models.notification import Notification, NotificationType
from app.models.payment import (
    Payment,
    PaymentMethod,
    PaymentStatus,
    PaymentType,
    SubscriptionPayment,
    SubscriptionPaymentStatus,
)
from app.models.property import Property, PropertyType
from app.models.quote import Quote, QuoteStatus
from app.models.saved_deal import SavedDeal
from app.models.tenant import Tenant
from app.models.unit import Unit, UnitStatus
from app.models.api_key import APIKey
from app.models.scraper_run import ScraperRun, ScraperSource, ScraperStatus, ScraperTrigger
from app.models.user import PlanTier, User
from app.models.user_preferences import ExperienceLevel, UserPreferences

__all__ = [
    "Alert",
    "AnalyticsEvent",
    "Base",
    "ChannelType",
    "Contractor",
    "Conversation",
    "ConversationStatus",
    "Document",
    "Expense",
    "ExpenseCategory",
    "Lease",
    "LeaseStatus",
    "LeaseType",
    "MaintenanceCategory",
    "MaintenancePhoto",
    "MaintenanceRequest",
    "MaintenanceStatus",
    "MaintenanceUrgency",
    "Message",
    "Notification",
    "Payment",
    "PaymentMethod",
    "PaymentStatus",
    "PaymentType",
    "PlanTier",
    "Property",
    "PropertyType",
    "Quote",
    "QuoteStatus",
    "NotificationType",
    "SavedDeal",
    "SenderType",
    "SubscriptionPayment",
    "SubscriptionPaymentStatus",
    "Tenant",
    "TimestampMixin",
    "Unit",
    "UnitStatus",
    "APIKey",
    "ExperienceLevel",
    "ScraperRun",
    "ScraperSource",
    "ScraperStatus",
    "ScraperTrigger",
    "User",
    "UserPreferences",
]
