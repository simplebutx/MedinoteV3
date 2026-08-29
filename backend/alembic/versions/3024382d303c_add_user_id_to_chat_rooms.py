from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3024382d303c"
down_revision: Union[str, Sequence[str], None] = "2b1e7e95be0f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chat_rooms",
        sa.Column("user_id", sa.Integer(), nullable=True),
    )

    op.create_foreign_key(
        "fk_chat_rooms_user_id_users",
        "chat_rooms",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 기존 chat_rooms 데이터가 없을 때만 바로 가능
    op.alter_column(
        "chat_rooms",
        "user_id",
        existing_type=sa.Integer(),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_chat_rooms_user_id_users",
        "chat_rooms",
        type_="foreignkey",
    )

    op.drop_column("chat_rooms", "user_id")