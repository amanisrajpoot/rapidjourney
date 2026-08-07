"""Enable PostGIS extension"""

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

from alembic import op

def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS postgis")
