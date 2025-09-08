#!/bin/bash
# create_bip.sh

# This script creates a new BIP file from the template.

TEMPLATE_FILE="scripts/bip_system/BIP_TEMPLATE.md"
BIPS_DIR="bips"

# Check if a title is provided
if [ -z "$1" ]; then
  echo "Usage: $0 \"<BIP Title>\""
  exit 1
fi

BIP_TITLE="$1"

# Find the next BIP number
LAST_BIP_NUMBER=$(ls "$BIPS_DIR" | grep -E "BIP-[0-9]+" | sed -E 's/BIP-([0-9]+).*/\1/' | sort -n | tail -1)
NEXT_BIP_NUMBER=$((LAST_BIP_NUMBER + 1))
FORMATTED_BIP_NUMBER=$(printf "%02d" $NEXT_BIP_NUMBER)

# Create the new BIP file path
NEW_BIP_FILE="$BIPS_DIR/BIP-$FORMATTED_BIP_NUMBER.md"

# Create the new BIP file from the template
cp "$TEMPLATE_FILE" "$NEW_BIP_FILE"

# Replace placeholders in the new BIP file
sed -i "s/\[NUMBER\]/$FORMATTED_BIP_NUMBER/g" "$NEW_BIP_FILE"
sed -i "s/\[TITLE\]/$BIP_TITLE/g" "$NEW_BIP_FILE"
sed -i "s/\[MODEL_ID\]/$(whoami)/g" "$NEW_BIP_FILE"
sed -i "s/\[MODEL_EMAIL\]/$(whoami)@cmmv.dev/g" "$NEW_BIP_FILE"
sed -i "s/YYYY-MM-DD/$(date +%F)/g" "$NEW_BIP_FILE"

echo "Created new BIP: $NEW_BIP_FILE"
