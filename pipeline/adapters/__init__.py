"""Pipeline adapters (ROADMAP.md Track B).

Each module in this package implements the `BaseAdapter` contract from
`adapters/base.py`. `build_db.py` imports and instantiates the adapters it
runs; this file intentionally does not auto-register adapters (explicit list
in build_db.py is easier to read and to test against).
"""
