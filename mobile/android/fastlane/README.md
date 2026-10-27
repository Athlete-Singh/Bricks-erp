fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android upload_production

```sh
[bundle exec] fastlane android upload_production
```

Build Flutter AAB and upload to Play Store Production track with full metadata, poster, changelog, and screenshots

### android upload_metadata

```sh
[bundle exec] fastlane android upload_metadata
```

Upload only metadata, store listing, poster, and screenshots (without rebuilding AAB)

### android upload_internal

```sh
[bundle exec] fastlane android upload_internal
```

Build Flutter AAB and upload to Play Store Internal Testing track

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
