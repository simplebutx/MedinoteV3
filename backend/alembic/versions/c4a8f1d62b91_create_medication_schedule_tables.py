"""create medication schedule tables

Revision ID: c4a8f1d62b91
Revises: 7c9e1d2f4a6b
Create Date: 2026-08-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4a8f1d62b91"
down_revision: Union[str, Sequence[str], None] = "7c9e1d2f4a6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "schedules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("hospital_name", sa.String(length=255), nullable=True),
        sa.Column("pharmacy_name", sa.String(length=255), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("dispensed_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_schedules_user_id", "schedules", ["user_id"], unique=False)

    op.create_table(
        "schedule_medicines",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("item_seq", sa.Integer(), nullable=True),
        sa.Column("custom_medicine_name", sa.String(length=255), nullable=False),
        sa.Column("dosage_amount", sa.String(length=50), nullable=True),
        sa.Column("dosage_unit", sa.String(length=50), nullable=True),
        sa.Column("times_per_day", sa.Integer(), nullable=True),
        sa.Column("duration_days", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["schedule_id"], ["schedules.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_schedule_medicines_schedule_id",
        "schedule_medicines",
        ["schedule_id"],
        unique=False,
    )

    op.create_table(
        "schedule_times",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("schedule_medicine_id", sa.Integer(), nullable=False),
        sa.Column("timing", sa.String(length=100), nullable=True),
        sa.Column("take_time", sa.Time(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["schedule_medicine_id"],
            ["schedule_medicines.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_schedule_times_schedule_medicine_id",
        "schedule_times",
        ["schedule_medicine_id"],
        unique=False,
    )

    op.create_table(
        "medication_intake_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("medication_schedule_id", sa.Integer(), nullable=False),
        sa.Column("medication_schedule_time_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("taken_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["medication_schedule_id"],
            ["schedules.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["medication_schedule_time_id"],
            ["schedule_times.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_medication_intake_logs_schedule_id",
        "medication_intake_logs",
        ["medication_schedule_id"],
        unique=False,
    )
    op.create_index(
        "ix_medication_intake_logs_time_scheduled_at",
        "medication_intake_logs",
        ["medication_schedule_time_id", "scheduled_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_medication_intake_logs_time_scheduled_at", table_name="medication_intake_logs")
    op.drop_index("ix_medication_intake_logs_schedule_id", table_name="medication_intake_logs")
    op.drop_table("medication_intake_logs")
    op.drop_index("ix_schedule_times_schedule_medicine_id", table_name="schedule_times")
    op.drop_table("schedule_times")
    op.drop_index("ix_schedule_medicines_schedule_id", table_name="schedule_medicines")
    op.drop_table("schedule_medicines")
    op.drop_index("ix_schedules_user_id", table_name="schedules")
    op.drop_table("schedules")
