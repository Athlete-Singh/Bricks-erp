import 'package:brics_mobile/core/l10n/generated/app_localizations.dart';
import 'package:flutter/widgets.dart';

export 'package:brics_mobile/core/l10n/generated/app_localizations.dart';

extension L10nX on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}
