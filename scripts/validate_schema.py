#!/usr/bin/env python3
"""
Schema Validation Script for CMMV-Hive

This script validates JSON files against their corresponding JSON schemas
to ensure data integrity and consistency across the project.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import jsonschema
from jsonschema import ValidationError, SchemaError


class SchemaValidator:
    """Validates JSON files against JSON schemas."""

    def __init__(self, schemas_dir: str = "schemas"):
        self.schemas_dir = Path(schemas_dir)
        self.schemas: Dict[str, dict] = {}
        self._load_schemas()

    def _load_schemas(self) -> None:
        """Load all JSON schemas from the schemas directory."""
        if not self.schemas_dir.exists():
            print(f"Error: Schemas directory '{self.schemas_dir}' not found.")
            sys.exit(1)

        for schema_file in self.schemas_dir.glob("*.schema.json"):
            try:
                with open(schema_file, 'r', encoding='utf-8') as f:
                    schema = json.load(f)
                    schema_name = schema_file.stem.replace('.schema', '')
                    self.schemas[schema_name] = schema
                    print(f"Loaded schema: {schema_name}")
            except (json.JSONDecodeError, IOError) as e:
                print(f"Error loading schema {schema_file}: {e}")

    def validate_file(self, file_path: str, schema_name: Optional[str] = None) -> Tuple[bool, List[str]]:
        """
        Validate a JSON file against a schema.

        Args:
            file_path: Path to the JSON file to validate
            schema_name: Name of the schema to use (auto-detected if None)

        Returns:
            Tuple of (is_valid, error_messages)
        """
        file_path = Path(file_path)

        if not file_path.exists():
            return False, [f"File not found: {file_path}"]

        # Auto-detect schema if not provided
        if schema_name is None:
            schema_name = self._detect_schema(file_path)

        if schema_name not in self.schemas:
            return False, [f"Schema not found: {schema_name}"]

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            jsonschema.validate(data, self.schemas[schema_name])
            return True, []

        except json.JSONDecodeError as e:
            return False, [f"Invalid JSON: {e}"]
        except ValidationError as e:
            return False, [f"Validation error: {e.message}"]
        except SchemaError as e:
            return False, [f"Schema error: {e}"]
        except IOError as e:
            return False, [f"File read error: {e}"]

    def _detect_schema(self, file_path: Path) -> str:
        """Auto-detect the appropriate schema based on file path and content."""
        file_name = file_path.name.lower()

        # Detect based on file name and path
        if 'proposal' in file_name or file_path.parent.name == 'discussion':
            return 'proposal'
        elif 'minutes' in str(file_path) or 'report' in file_name:
            return 'minutes_report'
        elif 'evaluation' in file_name or 'model' in str(file_path).lower():
            return 'model_evaluation_entry'
        elif 'test' in file_name:
            return 'model_test_result'
        else:
            return 'proposal'  # Default fallback

    def validate_directory(self, directory: str, recursive: bool = True) -> Dict[str, List[str]]:
        """
        Validate all JSON files in a directory.

        Args:
            directory: Directory path to scan
            recursive: Whether to scan subdirectories

        Returns:
            Dictionary mapping file paths to error messages
        """
        directory = Path(directory)
        errors = {}

        pattern = "**/*.json" if recursive else "*.json"

        for json_file in directory.glob(pattern):
            is_valid, error_messages = self.validate_file(str(json_file))
            if not is_valid:
                errors[str(json_file)] = error_messages

        return errors

    def list_schemas(self) -> List[str]:
        """List all available schemas."""
        return list(self.schemas.keys())


def main():
    """Main CLI interface."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Validate JSON files against JSON schemas for CMMV-Hive"
    )
    parser.add_argument(
        'paths',
        nargs='*',
        help='Files or directories to validate'
    )
    parser.add_argument(
        '--schema',
        help='Specific schema to use for validation'
    )
    parser.add_argument(
        '--schemas-dir',
        default='schemas',
        help='Directory containing JSON schemas'
    )
    parser.add_argument(
        '--list-schemas',
        action='store_true',
        help='List available schemas'
    )
    parser.add_argument(
        '--recursive',
        action='store_true',
        default=True,
        help='Recursively validate directories'
    )

    args = parser.parse_args()

    validator = SchemaValidator(args.schemas_dir)

    if args.list_schemas:
        print("Available schemas:")
        for schema in validator.list_schemas():
            print(f"  - {schema}")
        return

    if not args.paths:
        print("Error: No files or directories specified.")
        print("Use --help for usage information.")
        sys.exit(1)

    all_errors = {}
    total_files = 0
    valid_files = 0

    for path in args.paths:
        path_obj = Path(path)

        if path_obj.is_file() and path_obj.suffix == '.json':
            # Validate single file
            total_files += 1
            is_valid, errors = validator.validate_file(path, args.schema)
            if is_valid:
                valid_files += 1
                print(f"✅ {path}")
            else:
                all_errors[path] = errors
                print(f"❌ {path}")
                for error in errors:
                    print(f"   {error}")

        elif path_obj.is_dir():
            # Validate directory
            dir_errors = validator.validate_directory(path, args.recursive)
            total_files += len(dir_errors) + sum(
                1 for _ in path_obj.glob("**/*.json" if args.recursive else "*.json")
            ) - len(dir_errors)
            valid_files += (total_files - len(dir_errors))

            for file_path, errors in dir_errors.items():
                all_errors[file_path] = errors
                print(f"❌ {file_path}")
                for error in errors:
                    print(f"   {error}")

            # Print valid files
            for json_file in path_obj.glob("**/*.json" if args.recursive else "*.json"):
                if str(json_file) not in dir_errors:
                    print(f"✅ {json_file}")

        else:
            print(f"Warning: {path} is not a JSON file or directory")

    # Summary
    print(f"\nSummary: {valid_files}/{total_files} files validated successfully")

    if all_errors:
        print(f"\nFound {len(all_errors)} files with validation errors:")
        for file_path, errors in all_errors.items():
            print(f"- {file_path}: {len(errors)} errors")
        sys.exit(1)
    else:
        print("\nAll files validated successfully! 🎉")


if __name__ == "__main__":
    main()
