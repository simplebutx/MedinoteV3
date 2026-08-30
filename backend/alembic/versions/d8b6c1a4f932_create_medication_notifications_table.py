"""create medication notifications table

Revision ID: d8b6c1a4f932
Revises: c4a8f1d62b91
Create Date: 2026-08-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8b6c1a4f932"
down_revision: Union[str, Sequence[str], None] = "c4a8f1d62b91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "medication_notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("medication_schedule_id", sa.Integer(), nullable=False),
        sa.Column("medication_schedule_medicine_id", sa.Integer(), nullable=False),
        sa.Column("medication_schedule_time_id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum("MEDICATION_REMINDER", name="medicationnotificationtype"),
            server_default="MEDICATION_REMINDER",
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.String(length=500), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "SENT", "FAILED", name="medicationnotificationstatus"),
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("is_visible", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["medication_schedule_id"],
            ["schedules.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["medication_schedule_medicine_id"],
            ["schedule_medicines.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["medication_schedule_time_id"],
            ["schedule_times.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "medication_schedule_id",
            "medication_schedule_medicine_id",
            "medication_schedule_time_id",
            "scheduled_at",
            name="uq_medication_notifications_occurrence",
        ),
    )
    op.create_index(
        "ix_medication_notifications_user_visible_scheduled",
        "medication_notifications",
        ["user_id", "is_visible", "scheduled_at"],
        unique=False,
    )
    op.create_index(
        "ix_medication_notifications_user_read_at",
        "medication_notifications",
        ["user_id", "read_at"],
        unique=False,
    )
    op.create_index(
        "ix_medication_notifications_schedule_scheduled",
        "medication_notifications",
        ["medication_schedule_id", "scheduled_at"],
        unique=False,
    )
    op.create_index(
        "ix_medication_notifications_time_scheduled",
        "medication_notifications",
        ["medication_schedule_time_id", "scheduled_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_medication_notifications_time_scheduled",
        table_name="medication_notifications",
    )
    op.drop_index(
        "ix_medication_notifications_schedule_scheduled",
        table_name="medication_notifications",
    )
    op.drop_index(
        "ix_medication_notifications_user_read_at",
        table_name="medication_notifications",
    )
    op.drop_index(
        "ix_medication_notifications_user_visible_scheduled",
        table_name="medication_notifications",
    )
    op.drop_table("medication_notifications")
