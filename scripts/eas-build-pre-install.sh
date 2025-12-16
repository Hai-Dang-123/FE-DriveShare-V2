#!/usr/bin/env bash

# Decode and create google-services.json from environment variable
if [ -n "$GOOGLE_SERVICES_JSON_BASE64" ]; then
  echo "Creating google-services.json from environment variable..."
  echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > android/app/google-services.json
  echo "✓ google-services.json created successfully"
else
  echo "⚠ Warning: GOOGLE_SERVICES_JSON_BASE64 environment variable not found"
fi
