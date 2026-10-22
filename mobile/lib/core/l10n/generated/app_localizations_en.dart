// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'BRICS';

  @override
  String get appSubtitle => 'Supervisor';

  @override
  String get commonRetry => 'Try again';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonSave => 'Save';

  @override
  String get commonDiscard => 'Discard';

  @override
  String get commonClose => 'Close';

  @override
  String get commonEdit => 'Edit';

  @override
  String get commonOptional => 'Optional';

  @override
  String get commonNotes => 'Notes';

  @override
  String get commonDate => 'Date';

  @override
  String get commonLoading => 'Loading…';

  @override
  String get commonSomethingWrong => 'Something went wrong';

  @override
  String get commonNothingHere => 'Nothing here yet';

  @override
  String get commonRequired => 'Required';

  @override
  String get commonAdd => 'Add';

  @override
  String get commonRemove => 'Remove';

  @override
  String get commonSelect => 'Select…';

  @override
  String get commonDecrease => 'Decrease';

  @override
  String get commonIncrease => 'Increase';

  @override
  String get errorNoConnection =>
      'No connection. Your entry is saved on this phone and will be sent when the network is back.';

  @override
  String get errorTimeout => 'The server took too long to answer.';

  @override
  String get errorServer => 'The server had a problem. It will be retried.';

  @override
  String get errorUnknown => 'Something went wrong. Please try again.';

  @override
  String get syncBadgeOffline => 'Offline';

  @override
  String get syncBadgeSynced => 'All sent';

  @override
  String syncBadgePending(int count) {
    return '$count waiting';
  }

  @override
  String syncBadgeFailed(int count) {
    return '$count need attention';
  }

  @override
  String get syncBadgeSyncing => 'Sending…';

  @override
  String get statusPending => 'Waiting';

  @override
  String get statusSyncing => 'Sending';

  @override
  String get statusSynced => 'Sent';

  @override
  String get statusFailed => 'Needs attention';

  @override
  String get statusBlocked => 'Waiting on another entry';

  @override
  String get validationWholeNumber => 'Enter a whole number, like 10000';

  @override
  String get validationQuantity => 'Enter a quantity like 100 or 12.500';

  @override
  String get validationMoreThanZero => 'Must be more than zero';

  @override
  String get validationNotNegative => 'Cannot be negative';

  @override
  String get validationFutureDate => 'The date cannot be in the future';

  @override
  String validationTooLong(int max) {
    return 'Keep it under $max characters';
  }
}
