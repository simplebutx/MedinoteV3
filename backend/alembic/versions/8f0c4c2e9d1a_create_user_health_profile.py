"""create user health profile

Revision ID: 8f0c4c2e9d1a
Revises: 3024382d303c
Create Date: 2026-08-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f0c4c2e9d1a"
down_revision: Union[str, Sequence[str], None] = "3024382d303c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_health_profile",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("is_pregnant", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("is_breastfeeding", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("is_smoking", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("is_drinking", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("is_child", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("is_elderly", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_user_health_profile_user_id",
        "user_health_profile",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_health_profile_user_id", table_name="user_health_profile")
    op.drop_table("user_health_profile")
