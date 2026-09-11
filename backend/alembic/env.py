from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.base import Base
from app.models import *  # noqa: ensure all models are imported
from app.core.config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Ignore PostGIS internal & Tiger geocoder tables during autogenerate
def include_object(object, name, type_, reflected, compare_to):
    ignored_tables = {
        'spatial_ref_sys', 'layer', 'topology',
        'zip_lookup_base', 'county_lookup', 'loader_variables',
        'county', 'faces', 'street_type_lookup', 'zip_lookup',
        'geocode_settings_default', 'cousub', 'state', 'direction_lookup',
        'pagc_lex', 'place', 'zip_state_loc', 'secondary_unit_lookup',
        'tract', 'pagc_rules', 'place_lookup', 'geocode_settings',
        'addr', 'addrfeat', 'state_lookup', 'countysub_lookup',
        'zcta5', 'tabblock', 'zip_state', 'pagc_gaz', 'tabblock20',
        'zip_lookup_all', 'loader_platform', 'featnames', 'edges',
        'bg', 'loader_lookuptables'
    }
    if type_ == "table" and name in ignored_tables:
        return False
    return True


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
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
