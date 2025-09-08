#!/bin/bash
# validate_bip.sh

# This script validates the structure of a BIP file against a predefined template.

# Check if a file path is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_bip_file.md>"
  exit 1
fi

BIP_FILE="$1"
REQUIRED_SECTIONS=(
  "Abstract"
  "Motivation"
  "Specification"
  "Rationale"
  "Implementation"
  "Backward Compatibility"
  "Security Considerations"
  "Copyright"
)

echo "Validating BIP file: $BIP_FILE"

# Check for file existence
if [ ! -f "$BIP_FILE" ]; then
  echo "Error: File not found at $BIP_FILE"
  exit 1
fi

# Validate sections
for section in "${REQUIRED_SECTIONS[@]}"; do
  if ! grep -q "## $section" "$BIP_FILE"; then
    echo "Error: Missing required section: $section"
    exit 1
  fi
done

echo "BIP structure validation successful."
exit 0
