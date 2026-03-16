"""002 — Add api_keys, scraper_runs, user_preferences, analytics_events,
subscription_payments tables; add is_admin to users.

Revision ID: 002_add_api_keys_scrapers_preferences
Revises: 001_initial
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision = "002_add_api_keys_scrapers_preferences"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # ENUM types
    # -------------------------------------------------------------------------
    scraper_source_enum = postgresql.ENUM(
        "zillow",
        "redfin",
        "realtor",
        "rentometer",
        "public_records",
        name="scraper_source",
        create_type=True,
    )
    scraper_source_enum.create(op.get_bind(), checkfirst=True)

    scraper_status_enum = postgresql.ENUM(
        "running",
        "completed",
        "failed",
        name="scraper_status",
        create_type=True,
    )
    scraper_status_enum.create(op.get_bind(), checkfirst=True)

    scraper_trigger_enum = postgresql.ENUM(
        "schedule",
        "manual",
        "api",
        name="scraper_trigger",
        create_type=True,
    )
    scraper_trigger_enum.create(op.get_bind(), checkfirst=True)

    experience_level_enum = postgresql.ENUM(
        "beginner",
        "intermediate",
        "advanced",
        name="experience_level",
        create_type=True,
    )
    experience_level_enum.create(op.get_bind(), checkfirst=True)

    subscription_payment_status_enum = postgresql.ENUM(
        "succeeded",
        "failed",
        "refunded",
        name="subscription_payment_status",
        create_type=True,
    )
    # May already exist from model definitions — create only if missing
    subscription_payment_status_enum.create(op.get_bind(), checkfirst=True)

    # -------------------------------------------------------------------------
    # Alter users — add is_admin column
    # -------------------------------------------------------------------------
    op.add_column(
        "users",
        sa.Column(
            "is_admin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index("ix_users_is_admin", "users", ["is_admin"])

    # -------------------------------------------------------------------------
    # Table: api_keys
    # -------------------------------------------------------------------------
    op.create_table(
        "api_keys",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("uuid_generate_v4()"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False, server_default="Default"),
        sa.Column("key_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("key_prefix", sa.String(12), nullable=False),
        sa.Column("last_four", sa.String(4), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "usage_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "rate_limit_per_hour",
            sa.Integer(),
            nullable=False,
            server_default="100",
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_index("ix_api_keys_user_id", "api_keys", ["user_id"])
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)
    op.create_index("ix_api_keys_is_active", "api_keys", ["is_active"])

    # -------------------------------------------------------------------------
    # Table: scraper_runs
    # -------------------------------------------------------------------------
    op.create_table(
        "scraper_runs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("uuid_generate_v4()"),
            primary_key=True,
        ),
        sa.Column("source", scraper_source_enum, nullable=False),
        sa.Column(
            "status",
            scraper_status_enum,
            nullable=False,
            server_default="running",
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("properties_found", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("properties_new", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "properties_updated", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("errors_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_log", sa.Text(), nullable=True),
        sa.Column("target_market", sa.String(255), nullable=True),
        sa.Column(
            "triggered_by",
            scraper_trigger_enum,
            nullable=False,
            server_default="schedule",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_index("ix_scraper_runs_source", "scraper_runs", ["source"])
    op.create_index("ix_scraper_runs_status", "scraper_runs", ["status"])
    op.create_index(
        "ix_scraper_runs_source_started",
        "scraper_runs",
        ["source", "started_at"],
    )
    op.create_index(
        "ix_scraper_runs_status_started",
        "scraper_runs",
        ["status", "started_at"],
    )

    # -------------------------------------------------------------------------
    # Table: user_preferences
    # -------------------------------------------------------------------------
    op.create_table(
        "user_preferences",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("uuid_generate_v4()"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "investment_types",
            postgresql.ARRAY(sa.String(50)),
            nullable=True,
        ),
        sa.Column(
            "target_markets",
            postgresql.JSONB(),
            nullable=True,
            server_default="[]",
        ),
        sa.Column("budget_min", sa.Numeric(14, 2), nullable=True),
        sa.Column("budget_max", sa.Numeric(14, 2), nullable=True),
        sa.Column("min_cap_rate", sa.Numeric(6, 3), nullable=True),
        sa.Column("min_cash_flow", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "property_types",
            postgresql.ARRAY(sa.String(50)),
            nullable=True,
        ),
        sa.Column("experience_level", experience_level_enum, nullable=True),
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "onboarding_step",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_user_preferences_user_id", "user_preferences", ["user_id"], unique=True
    )

    # -------------------------------------------------------------------------
    # Table: analytics_events (if not created in 001)
    # -------------------------------------------------------------------------
    # This table may have been created by the ORM autodiscovery but not in
    # migration 001.  Create it here to ensure it exists.
    op.execute("""
        CREATE TABLE IF NOT EXISTS analytics_events (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_name VARCHAR(100) NOT NULL,
            event_properties JSONB NOT NULL DEFAULT '{}',
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # Indexes for analytics_events (idempotent)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_analytics_events_user_id
            ON analytics_events (user_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_analytics_events_event_name
            ON analytics_events (event_name)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_analytics_user_event_created
            ON analytics_events (user_id, event_name, created_at)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_analytics_event_created
            ON analytics_events (event_name, created_at)
    """)

    # -------------------------------------------------------------------------
    # Table: subscription_payments (if not created in 001)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS subscription_payments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            stripe_payment_intent_id VARCHAR(255) UNIQUE,
            stripe_invoice_id VARCHAR(255),
            amount_cents INTEGER NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'usd',
            status subscription_payment_status NOT NULL DEFAULT 'succeeded',
            plan_tier VARCHAR(50) NOT NULL,
            billing_period_start TIMESTAMPTZ,
            billing_period_end TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_sub_pay_user_id
            ON subscription_payments (user_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_sub_pay_stripe_pi
            ON subscription_payments (stripe_payment_intent_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_sub_pay_status
            ON subscription_payments (status)
    """)

    # -------------------------------------------------------------------------
    # Triggers: auto-update updated_at for new tables
    # -------------------------------------------------------------------------
    for table in (
        "api_keys",
        "scraper_runs",
        "user_preferences",
        "analytics_events",
        "subscription_payments",
    ):
        op.execute(f"""
            CREATE TRIGGER IF NOT EXISTS trigger_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    # Drop triggers
    for table in (
        "api_keys",
        "scraper_runs",
        "user_preferences",
        "analytics_events",
        "subscription_payments",
    ):
        op.execute(f"DROP TRIGGER IF EXISTS trigger_{table}_updated_at ON {table}")

    # Drop tables
    op.drop_table("user_preferences")
    op.drop_table("scraper_runs")
    op.drop_table("api_keys")
    op.drop_table("analytics_events")
    op.drop_table("subscription_payments")

    # Drop is_admin column
    op.drop_index("ix_users_is_admin", table_name="users")
    op.drop_column("users", "is_admin")

    # Drop enums
    for enum_name in (
        "scraper_source",
        "scraper_status",
        "scraper_trigger",
        "experience_level",
        "subscription_payment_status",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
