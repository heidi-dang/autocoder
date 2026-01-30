"""
JSON to SQLite Migration
========================

Automatically migrates existing feature_list.json files to SQLite database.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session, sessionmaker

from api.database import Feature


def migrate_json_to_sqlite(
    project_dir: Path,
    session_maker: sessionmaker,
) -> bool:
    """
    Detect existing feature_list.json, import to SQLite, rename to backup.

    This function:
    1. Checks if feature_list.json exists
    2. Checks if database already has data (skips if so)
    3. Imports all features from JSON
    4. Renames JSON file to feature_list.json.backup.<timestamp>

    Args:
        project_dir: Directory containing the project
        session_maker: SQLAlchemy session maker

    Returns:
        True if migration was performed, False if skipped
    """
    json_file = project_dir / "feature_list.json"

    if not json_file.exists():
        return False  # No JSON file to migrate

    # Check if database already has data
    session: Session = session_maker()
    try:
        existing_count = session.query(Feature).count()
        if existing_count > 0:
            return False
    finally:
        session.close()

    # Load JSON data
    try:
        with open(json_file, encoding="utf-8") as f:
            features_data = json.load(f)
    except json.JSONDecodeError:
        return False
    except OSError:
        return False

    if not isinstance(features_data, list):
        return False

    # Import features into database
    session = session_maker()
    try:
        imported_count = 0
        for i, feature_dict in enumerate(features_data):
            # Handle both old format (no id/priority/name) and new format
            feature = Feature(
                id=feature_dict.get("id", i + 1),
                priority=feature_dict.get("priority", i + 1),
                category=feature_dict.get("category", "uncategorized"),
                name=feature_dict.get("name", f"Feature {i + 1}"),
                description=feature_dict.get("description", ""),
                steps=feature_dict.get("steps", []),
                passes=feature_dict.get("passes", False),
                in_progress=feature_dict.get("in_progress", False),
                dependencies=feature_dict.get("dependencies"),
            )
            session.add(feature)
            imported_count += 1

        session.commit()

        # Verify import
        session.query(Feature).count()

    except Exception:
        session.rollback()
        return False
    finally:
        session.close()

    # Rename JSON file to backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = project_dir / f"feature_list.json.backup.{timestamp}"

    try:
        shutil.move(json_file, backup_file)
    except OSError:
        pass
        # Continue anyway - the data is in the database

    return True


def export_to_json(
    project_dir: Path,
    session_maker: sessionmaker,
    output_file: Path | None = None,
) -> Path:
    """
    Export features from database back to JSON format.

    Useful for debugging or if you need to revert to the old format.

    Args:
        project_dir: Directory containing the project
        session_maker: SQLAlchemy session maker
        output_file: Output file path (default: feature_list_export.json)

    Returns:
        Path to the exported file
    """
    if output_file is None:
        output_file = project_dir / "feature_list_export.json"

    session: Session = session_maker()
    try:
        features = session.query(Feature).order_by(Feature.priority.asc(), Feature.id.asc()).all()

        features_data = [f.to_dict() for f in features]

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(features_data, f, indent=2)

        return output_file

    finally:
        session.close()
