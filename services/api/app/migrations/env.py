import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

# Add the parent directory of the app to sys.path so we can import settings
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(BASE_DIR)

from app.core.config import Settings

# Load settings with explicit .env path (project root)
ENV_PATH = os.path.abspath(os.path.join(BASE_DIR, ".env"))
settings = Settings(_env_file=ENV_PATH)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
from alembic import context
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# set the sqlalchemy.url dynamically from settings
config.set_main_option('sqlalchemy.url', settings.SQLALCHEMY_DATABASE_URL)

from app.models.base import Base
import app.models # To ensure everything is imported
target_metadata = Base.metadata

def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name in [
        "spatial_ref_sys", "topology", "layer", "faces", "edges", "bg",
        "county", "state", "place", "tract", "zcta5", "cousub", "addr",
        "featnames", "addrfeat", "pagc_lex", "pagc_gaz", "pagc_rules",
        "geocode_settings", "geocode_settings_default", "loader_platform",
        "loader_lookuptables", "loader_variables", "zip_lookup", "zip_state",
        "zip_state_loc", "zip_lookup_all", "zip_lookup_base", "street_type_lookup",
        "direction_lookup", "secondary_unit_lookup", "state_lookup", "county_lookup",
        "countysub_lookup", "place_lookup", "tabblock", "tabblock20"
    ]:
        return False
    return True

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.
    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DB connection.
    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.
    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
