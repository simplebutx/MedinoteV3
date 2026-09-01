"""create prescription analysis table

Revision ID: f4a9c8d7e6b5
Revises: d8b6c1a4f932
Create Date: 2026-08-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4a9c8d7e6b5"
down_revision: Union[str, Sequence[str], None] = "d8b6c1a4f932"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prescription_analysis",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["schedule_id"], ["schedules.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_prescription_analysis_schedule_id",
        "prescription_analysis",
        ["schedule_id"],
        unique=False,
    )
    op.create_index(
        "ix_prescription_analysis_user_id",
        "prescription_analysis",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_prescription_analysis_user_id", table_name="prescription_analysis")
    op.drop_index("ix_prescription_analysis_schedule_id", table_name="prescription_analysis")
    op.drop_table("prescription_analysis")
