# BRICS mobile (Flutter supervisor app)

Offline-first field app: production, attendance, goods receipt, dispatch + delivery. Built in steps M0–M6
(`../.brain/PROGRESS.md`); design in `../docs/09-offline-sync.md` and `../.brain/modules/mobile-app.md` (ADR-053).
Rules: `../AGENTS.md`, `../.brain/CONVENTIONS.md` (Mobile section).

Flutter 3.47 / Dart 3.13 · Riverpod 3 · go_router · dio · Drift · freezed + json_serializable · `very_good_analysis`.

## Run
```bash
cd mobile
cp env/dev.example.json env/dev.json        # API_BASE_URL; git-ignored
flutter pub get
flutter run --dart-define-from-file=env/dev.json
```
`env/dev.json` points at the deployed dev API (`https://bhatta-erp-backend.vercel.app/api/v1`), which is also the debug
default when no file is passed. For a local backend use `http://10.0.2.2:4000/api/v1` (Android emulator) or
`http://localhost:4000/api/v1` (iOS simulator).
Debug builds allow plain HTTP to the local API only; release builds are HTTPS only.

## Gate (M track)
```bash
dart run build_runner build -d && flutter analyze && flutter test
```
Generated files (`*.g.dart`, `*.freezed.dart`, `lib/core/l10n/generated/`) are committed (ADR-007). After editing
`lib/core/l10n/app_en.arb` run `flutter gen-l10n`.

## Release builds
```bash
API_BASE_URL=https://<api-host>/api/v1 scripts/build_release.sh android   # per-ABI APKs (~20 MB) + an .aab for Play
API_BASE_URL=https://<api-host>/api/v1 scripts/build_release.sh ios       # .ipa — needs signing in Xcode
```
The script refuses to build without an `https://` API address; a release build has no fallback server.

**Android signing.** Create a keystore once and keep it — and its passwords — somewhere the owner controls (OPEN_QUESTIONS #22):
```bash
keytool -genkey -v -keystore ~/brics-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```
then `android/key.properties` (git-ignored):
```
storeFile=/absolute/path/brics-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```
Without it the release build is signed with the debug key — fine for installing on a test phone, refused by the Play Store.

**Package id.** `com.brics.brics_mobile` / `com.brics.bricsMobile` are placeholders (OPEN_QUESTIONS #12). They are fixed for
good at the first store upload — settle the publishing account first.

**iOS.** Builds unsigned here (`flutter build ios --release --no-codesign`). TestFlight / App Store need the client's
Apple developer account (OPEN_QUESTIONS #23; the $99/yr fee is the client's, SOW §3).

## Structure
```
lib/
  main.dart, app.dart
  core/       config, theme (tokens), widgets, network (ApiClient, AuthInterceptor), storage (tokens),
              database (Drift: sync_queue, cached_records, app_state), sync (queue, cache, SyncService,
              MasterSyncService, RecordRef), router, utils (formatters, validators), l10n
  features/   auth · home · masters · production · attendance · grn · dispatch · sync
              each data/ domain/ presentation/
test/         helpers (fake API with lost-response simulation, test env, harness) + core, sync, auth, features
scripts/      build_release.sh
```
