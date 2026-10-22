#!/usr/bin/env bash
# Builds the supervisor app for release (MOB-05 Android, MOB-06 iOS).
#
#   API_BASE_URL=https://<api-host>/api/v1 scripts/build_release.sh android|ios
#
# A release build has no fallback server address, so this refuses to run
# without one. Android signing comes from android/key.properties (see README);
# iOS signing needs the client's Apple developer account and is done in Xcode.
set -euo pipefail
cd "$(dirname "$0")/.."

target="${1:-}"
if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "API_BASE_URL is required, e.g. https://brics-api.example.com/api/v1" >&2
  exit 1
fi
if [[ "$API_BASE_URL" != https://* ]]; then
  echo "API_BASE_URL must be https:// for a release build" >&2
  exit 1
fi

dart run build_runner build -d
flutter analyze
flutter test

case "$target" in
  android)
    [[ -f android/key.properties ]] || echo "warning: no android/key.properties — signing with the debug key (not for the Play Store)" >&2
    # One APK per CPU type: about a third of the size each, which matters on
    # the cheap phones and thin data plans at a kiln. Play Store: use appbundle.
    flutter build apk --release --split-per-abi --dart-define=API_BASE_URL="$API_BASE_URL"
    flutter build appbundle --release --dart-define=API_BASE_URL="$API_BASE_URL"
    ls -lh build/app/outputs/flutter-apk/*-release.apk build/app/outputs/bundle/release/*.aab
    ;;
  ios)
    flutter build ipa --release --dart-define=API_BASE_URL="$API_BASE_URL"
    ;;
  *)
    echo "usage: API_BASE_URL=… $0 android|ios" >&2
    exit 1
    ;;
esac
