"""Application-wide logging configuration."""

import logging
import sys


def configure_logging(debug: bool = False) -> None:
    """
    Configure root logging for the API process.

    Uses stdout, a concise format, and respects the debug flag for verbosity.
    """
    level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
    # Quiet overly chatty third-party loggers in production
    if not debug:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
