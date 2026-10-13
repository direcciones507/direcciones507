#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "db" / "migrations"
SQL_FILES = sorted(MIGRATIONS.glob("[0-9][0-9][0-9][0-9]_*.sql"))
errors = []

if not SQL_FILES:
    errors.append("No versioned SQL migrations found")

versions = []
for path in SQL_FILES:
    match = re.match(r"^(\d{4})_[a-z0-9_]+\.sql$", path.name)
    if not match:
        errors.append(f"Invalid migration filename: {path.name}")
        continue
    versions.append(match.group(1))
if len(versions) != len(set(versions)):
    errors.append("Duplicate migration version detected")
if versions and versions != sorted(versions):
    errors.append("Migration versions are not ordered")

FORBIDDEN = [r"\bDROP\s+(?:TABLE|SCHEMA|DATABASE|COLUMN)\b", r"\bTRUNCATE\b", r"\bDELETE\s+FROM\b"]
SECRET_PATTERNS = [r"postgres(?:ql)?://[^\s'\"]+", r"\bsk-[A-Za-z0-9_-]{16,}\b", r"\bBearer\s+[A-Za-z0-9._~-]{16,}\b"]

for path in SQL_FILES:
    text = path.read_text(encoding="utf-8")
    upper = text.upper()
    if "BEGIN;" not in upper or "COMMIT;" not in upper:
        errors.append(f"{path.name}: migration must be transactional (BEGIN/COMMIT)")
    # All new persistent objects belong to the existing production ad507 schema.
    if "AD507." not in upper:
        errors.append(f"{path.name}: expected schema-qualified ad507 objects")
    for pattern in FORBIDDEN:
        if re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE):
            errors.append(f"{path.name}: forbidden destructive statement matched: {pattern}")
    # Foundation phase must not alter legacy tables. ALTER is allowed only for explicitly
    # schema-qualified new Core objects, and no current foundation migration needs it.
    if re.search(r"\bALTER\s+TABLE\b", text, flags=re.IGNORECASE):
        errors.append(f"{path.name}: ALTER TABLE is forbidden during foundation phase")
    update_scan = re.sub(r"\bDO\s+UPDATE\b", "DO_UPSERT", text, flags=re.IGNORECASE)
    if re.search(r"\bUPDATE\s+", update_scan, flags=re.IGNORECASE | re.MULTILINE):
        errors.append(f"{path.name}: direct UPDATE statements are forbidden during foundation phase")
    for pattern in SECRET_PATTERNS:
        if re.search(pattern, text, flags=re.IGNORECASE):
            errors.append(f"{path.name}: possible secret/credential embedded in migration")

if errors:
    print("Migration validation FAILED")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)
print(f"Migration validation OK: {len(SQL_FILES)} file(s):")
for path in SQL_FILES:
    print(f"- {path.name}")
