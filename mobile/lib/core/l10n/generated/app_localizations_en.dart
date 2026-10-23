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

  @override
  String get savedOffline => 'Saved on this phone. It goes to the server by itself.';

  @override
  String get savedCorrected => 'Corrected. It will be sent again.';

  @override
  String get formFixErrors => 'Check the fields marked in red.';

  @override
  String get productionTitle => 'Production';

  @override
  String get productionTabBatches => 'Open batches';

  @override
  String get productionTabEntries => 'My entries';

  @override
  String get productionNewBatch => 'New batch';

  @override
  String get productionNoBatches => 'No open batches at this kiln. Start one with New batch.';

  @override
  String get productionNoEntries => 'No production entries from this phone yet.';

  @override
  String get productionChamber => 'Chamber';

  @override
  String get productionChamberHint => 'e.g. Chamber 3';

  @override
  String get productionBatchDate => 'Batch date';

  @override
  String get productionStatusOpen => 'Open';

  @override
  String get productionStatusFiring => 'Firing';

  @override
  String get productionStatusSorted => 'Sorted';

  @override
  String get productionStatusClosed => 'Closed';

  @override
  String get productionStages => 'Stages';

  @override
  String get productionStageRecorded => 'Recorded';

  @override
  String get productionStageNotYet => 'Not yet';

  @override
  String get productionDryingOptional => 'Optional';

  @override
  String get productionRecord => 'Record';

  @override
  String get productionEntryDate => 'Date';

  @override
  String get productionGreenBricks => 'Green bricks';

  @override
  String get productionFiredBricks => 'Fired bricks';

  @override
  String get productionSardar => 'Sardar\'s gang';

  @override
  String get productionNoSardar => 'Not named';

  @override
  String get productionConsumption => 'Material used';

  @override
  String get productionConsumptionMaking => 'Soil or other raw material taken from stock.';

  @override
  String get productionConsumptionFiring => 'Coal or other fuel taken from stock.';

  @override
  String get productionAddMaterial => 'Add material';

  @override
  String get productionItem => 'Material';

  @override
  String get productionFromStore => 'From store';

  @override
  String get productionQuantity => 'Quantity';

  @override
  String productionQuantityUnit(String unit) {
    return 'Quantity ($unit)';
  }

  @override
  String get productionSortingWarehouse => 'Good bricks go to';

  @override
  String get productionGrades => 'Good bricks by grade';

  @override
  String get productionBroken => 'Broken';

  @override
  String get productionRejects => 'Rejects';

  @override
  String get productionAtLeastOneGrade => 'Enter good bricks for at least one grade.';

  @override
  String get productionNoGrades =>
      'No brick grades on this phone yet. Sync where there is signal, or ask the owner to add them.';

  @override
  String get productionNoStores =>
      'No stores for this kiln on this phone yet. Sync where there is signal.';

  @override
  String productionBatchEntryTitle(String chamber, String date) {
    return '$chamber · batch of $date';
  }

  @override
  String productionMakingTitle(String chamber, String bricks) {
    return '$chamber · $bricks green';
  }

  @override
  String productionDryingTitle(String chamber) {
    return '$chamber · drying done';
  }

  @override
  String productionFiringTitle(String chamber, String bricks) {
    return '$chamber · $bricks fired';
  }

  @override
  String productionSortingTitle(String chamber, String bricks) {
    return '$chamber · $bricks good';
  }

  @override
  String productionGoodTotal(String bricks) {
    return 'Good: $bricks';
  }

  @override
  String get attendanceTitle => 'Attendance';

  @override
  String get attendanceTake => 'Take attendance';

  @override
  String get attendanceNoEntries => 'No attendance taken on this phone yet.';

  @override
  String get attendanceGang => 'Gang';

  @override
  String get attendanceNoGangs =>
      'No gangs for this kiln on this phone yet. Sync where there is signal, or ask the owner to set them up.';

  @override
  String get attendanceAllPresent => 'Mark all present';

  @override
  String get attendancePresent => 'Present';

  @override
  String get attendanceHalfDay => 'Half day';

  @override
  String get attendanceAbsent => 'Absent';

  @override
  String get attendanceOvertime => 'Overtime hours';

  @override
  String get attendanceOvertimeShort => 'OT';

  @override
  String get attendanceOvertimeInvalid => 'Up to 2 digits, like 2 or 1.5';

  @override
  String get attendanceWholeGang => 'This gang has no workers listed. Mark the gang as a whole.';

  @override
  String get attendanceAlreadyTaken =>
      'Attendance for this gang on this date is already on this phone. Save another?';

  @override
  String get attendanceSaveAnyway => 'Save anyway';

  @override
  String attendanceEntryTitle(String gang, String present, int total) {
    return '$gang · $present present of $total';
  }

  @override
  String get grnTitle => 'Goods receipt';

  @override
  String get grnNew => 'New receipt';

  @override
  String get grnNoEntries => 'No goods received on this phone yet.';

  @override
  String get grnSupplier => 'Supplier';

  @override
  String get grnNoSuppliers => 'No suppliers on this phone yet. Sync where there is signal.';

  @override
  String get grnReceiptDate => 'Received on';

  @override
  String get grnChallanNo => 'Supplier\'s challan no.';

  @override
  String get grnLines => 'What arrived';

  @override
  String get grnLinesHint => 'Quantity only — the bill brings the price.';

  @override
  String get grnAddLine => 'Add item';

  @override
  String get grnIntoStore => 'Into store';

  @override
  String get grnAtLeastOneLine => 'Add at least one item.';

  @override
  String get grnDuplicateLine =>
      'That item is already listed for the same store — change the quantity instead.';

  @override
  String grnEntryTitle(String supplier, int lines) {
    String _temp0 = intl.Intl.pluralLogic(
      lines,
      locale: localeName,
      other: '$lines items',
      one: '1 item',
    );
    return '$supplier · $_temp0';
  }

  @override
  String get dispatchTitle => 'Dispatch';

  @override
  String get dispatchTabChallans => 'Open challans';

  @override
  String get dispatchTabEntries => 'My entries';

  @override
  String get dispatchNew => 'New challan';

  @override
  String get dispatchNoChallans => 'No open challans at this kiln.';

  @override
  String get dispatchNoEntries => 'No dispatch entries from this phone yet.';

  @override
  String get dispatchCustomer => 'Customer';

  @override
  String get dispatchNoCustomers => 'No customers on this phone yet. Sync where there is signal.';

  @override
  String get dispatchDate => 'Dispatch date';

  @override
  String get dispatchVehicle => 'Vehicle';

  @override
  String get dispatchNoVehicle => 'Not named';

  @override
  String get dispatchDriver => 'Driver';

  @override
  String get dispatchNoDriver => 'Not named';

  @override
  String get dispatchDeliveryLocation => 'Deliver to';

  @override
  String get dispatchLines => 'Bricks loaded';

  @override
  String get dispatchLinesHint => 'Each grade from the yard it leaves.';

  @override
  String get dispatchAddLine => 'Add grade';

  @override
  String get dispatchFromYard => 'From yard';

  @override
  String get dispatchAtLeastOneLine => 'Add at least one line.';

  @override
  String get dispatchDuplicateLine =>
      'That item already appears from the same yard — merge the lines.';

  @override
  String get dispatchStatusDraft => 'Raised';

  @override
  String get dispatchStatusConfirmed => 'Left the gate';

  @override
  String get dispatchStatusDelivered => 'Delivered';

  @override
  String get dispatchStatusCancelled => 'Cancelled';

  @override
  String get dispatchChallanUnsent => 'Challan not sent yet';

  @override
  String get dispatchGateOut => 'Gate out';

  @override
  String get dispatchGateOutHint =>
      'The truck is leaving the yard. Stock comes off when the server records this.';

  @override
  String get dispatchGateOutOn => 'Left on';

  @override
  String get dispatchDeliver => 'Record delivery';

  @override
  String get dispatchReceivedBy => 'Received by';

  @override
  String get dispatchDeliveredOn => 'Delivered on';

  @override
  String get dispatchRemarks => 'Remarks';

  @override
  String get dispatchLinesLoaded => 'Loaded';

  @override
  String get dispatchCustomerUnknown => 'Customer';

  @override
  String dispatchEntryTitle(String customer, String quantity) {
    return '$customer · $quantity';
  }

  @override
  String dispatchConfirmTitle(String challan) {
    return '$challan · gate out';
  }

  @override
  String dispatchDeliverTitle(String challan, String person) {
    return '$challan · received by $person';
  }

  @override
  String dispatchPendingAction(String action) {
    return '$action waiting to be sent';
  }

  @override
  String get loginNoServer =>
      'This copy of the app was built without a server address. Ask for a correctly built app.';

  @override
  String get loginWelcome => 'Welcome back';

  @override
  String get loginWelcomeHint => 'Sign in to record today\'s work at the kiln.';

  @override
  String get loginTagline => 'Kiln to customer, on one phone';

  @override
  String get homeGoodMorning => 'Good morning';

  @override
  String get homeGoodAfternoon => 'Good afternoon';

  @override
  String get homeGoodEvening => 'Good evening';

  @override
  String get homeOnThisPhone => 'On this phone';

  @override
  String get homeStatWaiting => 'Waiting';

  @override
  String get homeStatSent => 'Sent';

  @override
  String get homeStatAttention => 'Need attention';

  @override
  String get homeYourWork => 'Your work';

  @override
  String homeLastSynced(String time) {
    return 'Last synced $time';
  }

  @override
  String get homeNotSyncedYet => 'Not synced yet — entries are safe on this phone';

  @override
  String get kilnPickerSelected => 'Selected';

  @override
  String productionStagesDone(int done) {
    return '$done of 4 stages';
  }

  @override
  String productionGreenCount(String bricks) {
    return '$bricks green';
  }

  @override
  String productionFiredCount(String bricks) {
    return '$bricks fired';
  }

  @override
  String get productionMakingHint => 'Green bricks moulded by the gang';

  @override
  String get productionDryingHint => 'Bricks dried in the yard';

  @override
  String get productionFiringHint => 'Bricks fired in the chamber';

  @override
  String get productionSortingHint => 'Good bricks into the yard by grade';

  @override
  String get formWhen => 'When';

  @override
  String get formCount => 'How many';

  @override
  String get formMore => 'Anything else';

  @override
  String get productionWhere => 'Where the good bricks go';

  @override
  String get productionLosses => 'Broken and rejects';

  @override
  String get productionLossesHint => 'Counted, not stocked.';

  @override
  String get attendanceGangAndDate => 'Gang and day';

  @override
  String get attendanceWorkers => 'Workers';

  @override
  String attendanceWorkersCount(int count) {
    return '$count on the roll';
  }

  @override
  String get attendancePickGang => 'Pick a gang to see its workers.';

  @override
  String get grnFrom => 'From whom, and when';

  @override
  String get dispatchTo => 'To whom, and when';

  @override
  String get dispatchTruck => 'Truck';

  @override
  String get dispatchTotal => 'Total';

  @override
  String get dispatchOnThisChallan => 'On this challan';

  @override
  String syncSentOf(int sent, int total) {
    return '$sent of $total sent';
  }

  @override
  String get syncAllEntries => 'Everything on this phone';

  @override
  String get productionStageSkipped => 'Skipped';
}
