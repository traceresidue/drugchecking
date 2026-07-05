"""Test package bootstrap.

pipeline/ is a script directory, not an installed package (build_db.py is
run directly with `python3 pipeline/build_db.py`, relying on Python
prepending the script's directory to sys.path). To import `build_db` and
`adapters.*` the same way from tests -- without adding a setup.py/pytest
dependency -- we prepend pipeline/ to sys.path here. `unittest discover`
imports this package (test/__init__.py) before any test_*.py module, so this
runs exactly once per test session.
"""
import sys
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent.parent
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))
