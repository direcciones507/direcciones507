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

# Radar migrations are exact, reviewed copies of their isolated module SQL.
# Only these versions may use Radar-specific DDL; all other files retain foundation rules.
RADAR_FILES = {
    "0009_radar_schema.sql": "schema.sql",
    "0010_radar_core_constraints.sql": "core-constraints.sql",
    "0011_radar_ownership.sql": "ownership.sql",
    "0012_radar_abuse_constraints.sql": "abuse-constraints.sql",
    "0013_radar_account_retention.sql": "account-retention.sql",
    "0014_radar_address_link.sql": "address-link.sql",
    "0015_radar_campaigns.sql": "campaigns.sql",
    "0016_radar_business_details.sql": "business-details.sql",
    "0017_radar_anonymous_reports.sql": "anonymous-reports.sql",
    "0018_radar_activity_confirmations.sql": "activity-confirmations.sql",
    "0019_radar_favorites.sql": "favorites.sql",
    "0020_radar_alert_preferences.sql": "alert-preferences.sql",
    "0021_radar_registration_profiles.sql": "registration-profiles.sql",
}

for path in SQL_FILES:
    text = path.read_text(encoding="utf-8")
    upper = text.upper()
    radar = path.name in RADAR_FILES
    if radar:
        source = (ROOT / "core" / "runtime" / "radar" / RADAR_FILES[path.name]).read_text(encoding="utf-8")
        if "BEGIN;" not in source.upper():
            source = "BEGIN;\n" + source.strip() + "\nCOMMIT;\n"
        if text != source:
            errors.append(f"{path.name}: Radar migration differs from reviewed module SQL")
        for target in re.findall(r"\bALTER\s+TABLE\s+([\w.]+)", text, flags=re.IGNORECASE):
            if not target.lower().startswith("radar."):
                errors.append(f"{path.name}: ALTER outside Radar: {target}")
    if "BEGIN;" not in upper or "COMMIT;" not in upper:
        errors.append(f"{path.name}: migration must be transactional (BEGIN/COMMIT)")
    # All new persistent objects belong to the existing production ad507 schema.
    if not radar and "AD507." not in upper:
        errors.append(f"{path.name}: expected schema-qualified ad507 objects")
    for pattern in FORBIDDEN:
        if re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE):
            errors.append(f"{path.name}: forbidden destructive statement matched: {pattern}")
    # Foundation phase must not alter legacy tables. ALTER is allowed only for explicitly
    # schema-qualified new Core objects, and no current foundation migration needs it.
    if not radar and re.search(r"\bALTER\s+TABLE\b", text, flags=re.IGNORECASE):
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
