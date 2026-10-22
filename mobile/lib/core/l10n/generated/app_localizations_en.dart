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

  @override
  String get loginTitle => 'Sign in';

  @override
  String get loginIdLabel => 'Mobile number or email';

  @override
  String get loginPasswordLabel => 'Password';

  @override
  String get loginButton => 'Sign in';

  @override
  String get loginNeedsNetwork =>
      'Signing in needs the network once. After that the app works without it.';

  @override
  String get loginNoConnection =>
      'No connection. Signing in needs the network — try where there is signal.';

  @override
  String get loginSuspendedTitle => 'Company access is on hold';

  @override
  String get loginSessionExpired =>
      'Your session has ended. Sign in again to send the entries still on this phone.';

  @override
  String get kilnPickerTitle => 'Choose your kiln';

  @override
  String get kilnPickerHint => 'Every entry you make is recorded against this kiln.';

  @override
  String get kilnPickerNone =>
      'Your account has no kiln yet. Ask the owner to give you access to one.';

  @override
  String homeGreeting(String name) {
    return 'Hello, $name';
  }

  @override
  String get homeKiln => 'Kiln';

  @override
  String get homeSwitchKiln => 'Switch kiln';

  @override
  String get homeNoTasks =>
      'Your role has nothing to enter from the app. Ask the owner if that is wrong.';

  @override
  String get homeSignOut => 'Sign out';

  @override
  String get homeSignOutUnsentTitle => 'Entries not sent yet';

  @override
  String homeSignOutUnsentBody(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count entries have',
      one: '1 entry has',
    );
    String _temp1 = intl.Intl.pluralLogic(count, locale: localeName, other: 'them', one: 'it');
    return '$_temp0 not reached the server. Signing out deletes $_temp1 from this phone.';
  }

  @override
  String get homeSignOutAnyway => 'Sign out anyway';

  @override
  String get homeSyncAndWait => 'Keep them';

  @override
  String get tileProduction => 'Production';

  @override
  String get tileProductionHint => 'Batches, making, drying, firing, sorting';

  @override
  String get tileAttendance => 'Attendance';

  @override
  String get tileAttendanceHint => 'Daily muster roll by gang';

  @override
  String get tileGrn => 'Goods receipt';

  @override
  String get tileGrnHint => 'Coal, soil and material arriving';

  @override
  String get tileDispatch => 'Dispatch';

  @override
  String get tileDispatchHint => 'Challans, gate out, delivery';

  @override
  String get tileSync => 'Sync status';

  @override
  String tileWaiting(int count) {
    return '$count waiting';
  }

  @override
  String get comingSoon => 'This screen arrives in the next update.';

  @override
  String get syncTitle => 'Sync';

  @override
  String get syncNow => 'Sync now';

  @override
  String syncLastSynced(String time) {
    return 'Last synced $time';
  }

  @override
  String get syncNeverSynced => 'Not synced yet';

  @override
  String get syncOfflineNote =>
      'No network. Entries are saved on this phone and go out when signal returns.';

  @override
  String get syncEmpty => 'Nothing entered on this phone yet.';

  @override
  String get syncRetry => 'Send again';

  @override
  String get syncDiscardTitle => 'Discard this entry?';

  @override
  String get syncDiscardBody =>
      'It has not reached the server. Discarding deletes it from this phone, with anything that depends on it.';

  @override
  String syncServerNo(String ref) {
    return 'No. $ref';
  }

  @override
  String syncAttempts(int count) {
    return 'Tried $count times — will retry';
  }

  @override
  String get entityProductionBatch => 'New batch';

  @override
  String get entityProductionMaking => 'Making';

  @override
  String get entityProductionDrying => 'Drying';

  @override
  String get entityProductionFiring => 'Firing';

  @override
  String get entityProductionSorting => 'Sorting';

  @override
  String get entityAttendance => 'Attendance';

  @override
  String get entityGoodsReceipt => 'Goods receipt';

  @override
  String get entityDispatch => 'Challan';

  @override
  String get entityDispatchConfirm => 'Gate out';

  @override
  String get entityDispatchAcknowledge => 'Delivery';
}
