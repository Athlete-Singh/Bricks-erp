# BRICS mobile (Flutter supervisor app)

**Status:** folder structure only. **P0.4 is closed ✅** — it delivered everything that could be built without the Flutter SDK
(this folder tree, the placeholder app, a widget test, `env/dev.example.json` and this README).

**The rest is step `M0`.** The Flutter work is a separate track (`M0` → `M6`) in `.brain/PROGRESS.md`, run on whatever machine
has the Flutter SDK. The backend and web track (`P0` → `P13`) is built first and never waits on this.
Rules: `../AGENTS.md`, `../.brain/CONVENTIONS.md` (Mobile section). Tracker: `../.brain/PROGRESS.md` → "Resume here: mobile".

## First time, on a machine with Flutter (step M0)
```bash
cd mobile
flutter create --org com.brics --project-name brics_mobile --platforms=android,ios .   # adds android/ ios/; keeps existing files
# NOTE: `--org` sets the package id and is painful to change after the first store upload. Confirm it first — OPEN_QUESTIONS #12.
flutter pub add flutter_riverpod riverpod_annotation go_router dio freezed_annotation json_annotation \
  drift drift_flutter flutter_secure_storage connectivity_plus decimal intl uuid flutter_localizations:'{"sdk":"flutter"}'
flutter pub add --dev build_runner riverpod_generator freezed json_serializable drift_dev mocktail very_good_analysis
cp env/dev.example.json env/dev.json
flutter analyze && flutter test
```
Then build the M0 scaffold (theme tokens, widgets, router, dio client, Drift stub, sync skeleton, l10n) per BRICS_MASTER_PROMPT.md §4 / §6, and commit the generated `*.g.dart` / `*.freezed.dart` files (ADR-007).

Run: `flutter run --dart-define-from-file=env/dev.json`

## Structure
```
lib/
  main.dart, app.dart
  core/
    theme/      colours, text styles, spacing, light + dark theme (tokens from docs/05-design-system.md)
    widgets/    AppButton, AppTextField, AppCard, AppDropdown, AppLoader, EmptyView, ErrorView, SyncStatusBadge, NumberStepper
    network/    dio client, interceptors (auth, retry, logging), api_endpoints.dart, ApiException
    database/   Drift database, tables, DAOs
    sync/       sync queue, SyncService, connectivity watcher, conflict policy
    router/     go_router config + guards
    utils/      ₹ / date formatters, validators, constants
    l10n/       app_en.arb (Hindi-ready)
  features/<auth|production|attendance|grn|dispatch|sync>/
    data/         models (freezed), remote + local data sources, repository impl
    domain/       entities, repository interfaces (keep light)
    presentation/ screens, widgets, Riverpod providers
test/
env/            dev.example.json (copy to dev.json, git-ignored)
```
