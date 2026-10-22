import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en')];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'BRICS'**
  String get appTitle;

  /// No description provided for @appSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Supervisor'**
  String get appSubtitle;

  /// No description provided for @commonRetry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get commonRetry;

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get commonSave;

  /// No description provided for @commonDiscard.
  ///
  /// In en, this message translates to:
  /// **'Discard'**
  String get commonDiscard;

  /// No description provided for @commonClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get commonClose;

  /// No description provided for @commonEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get commonEdit;

  /// No description provided for @commonOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get commonOptional;

  /// No description provided for @commonNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get commonNotes;

  /// No description provided for @commonDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get commonDate;

  /// No description provided for @commonLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get commonLoading;

  /// No description provided for @commonSomethingWrong.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get commonSomethingWrong;

  /// No description provided for @commonNothingHere.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet'**
  String get commonNothingHere;

  /// No description provided for @commonRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get commonRequired;

  /// No description provided for @commonAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get commonAdd;

  /// No description provided for @commonRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get commonRemove;

  /// No description provided for @commonSelect.
  ///
  /// In en, this message translates to:
  /// **'Select…'**
  String get commonSelect;

  /// No description provided for @commonDecrease.
  ///
  /// In en, this message translates to:
  /// **'Decrease'**
  String get commonDecrease;

  /// No description provided for @commonIncrease.
  ///
  /// In en, this message translates to:
  /// **'Increase'**
  String get commonIncrease;

  /// No description provided for @errorNoConnection.
  ///
  /// In en, this message translates to:
  /// **'No connection. Your entry is saved on this phone and will be sent when the network is back.'**
  String get errorNoConnection;

  /// No description provided for @errorTimeout.
  ///
  /// In en, this message translates to:
  /// **'The server took too long to answer.'**
  String get errorTimeout;

  /// No description provided for @errorServer.
  ///
  /// In en, this message translates to:
  /// **'The server had a problem. It will be retried.'**
  String get errorServer;

  /// No description provided for @errorUnknown.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorUnknown;

  /// No description provided for @syncBadgeOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline'**
  String get syncBadgeOffline;

  /// No description provided for @syncBadgeSynced.
  ///
  /// In en, this message translates to:
  /// **'All sent'**
  String get syncBadgeSynced;

  /// No description provided for @syncBadgePending.
  ///
  /// In en, this message translates to:
  /// **'{count} waiting'**
  String syncBadgePending(int count);

  /// No description provided for @syncBadgeFailed.
  ///
  /// In en, this message translates to:
  /// **'{count} need attention'**
  String syncBadgeFailed(int count);

  /// No description provided for @syncBadgeSyncing.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get syncBadgeSyncing;

  /// No description provided for @statusPending.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get statusPending;

  /// No description provided for @statusSyncing.
  ///
  /// In en, this message translates to:
  /// **'Sending'**
  String get statusSyncing;

  /// No description provided for @statusSynced.
  ///
  /// In en, this message translates to:
  /// **'Sent'**
  String get statusSynced;

  /// No description provided for @statusFailed.
  ///
  /// In en, this message translates to:
  /// **'Needs attention'**
  String get statusFailed;

  /// No description provided for @statusBlocked.
  ///
  /// In en, this message translates to:
  /// **'Waiting on another entry'**
  String get statusBlocked;

  /// No description provided for @validationWholeNumber.
  ///
  /// In en, this message translates to:
  /// **'Enter a whole number, like 10000'**
  String get validationWholeNumber;

  /// No description provided for @validationQuantity.
  ///
  /// In en, this message translates to:
  /// **'Enter a quantity like 100 or 12.500'**
  String get validationQuantity;

  /// No description provided for @validationMoreThanZero.
  ///
  /// In en, this message translates to:
  /// **'Must be more than zero'**
  String get validationMoreThanZero;

  /// No description provided for @validationNotNegative.
  ///
  /// In en, this message translates to:
  /// **'Cannot be negative'**
  String get validationNotNegative;

  /// No description provided for @validationFutureDate.
  ///
  /// In en, this message translates to:
  /// **'The date cannot be in the future'**
  String get validationFutureDate;

  /// No description provided for @validationTooLong.
  ///
  /// In en, this message translates to:
  /// **'Keep it under {max} characters'**
  String validationTooLong(int max);

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginTitle;

  /// No description provided for @loginIdLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile number or email'**
  String get loginIdLabel;

  /// No description provided for @loginPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get loginPasswordLabel;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginButton;

  /// No description provided for @loginNeedsNetwork.
  ///
  /// In en, this message translates to:
  /// **'Signing in needs the network once. After that the app works without it.'**
  String get loginNeedsNetwork;

  /// No description provided for @loginNoConnection.
  ///
  /// In en, this message translates to:
  /// **'No connection. Signing in needs the network — try where there is signal.'**
  String get loginNoConnection;

  /// No description provided for @loginSuspendedTitle.
  ///
  /// In en, this message translates to:
  /// **'Company access is on hold'**
  String get loginSuspendedTitle;

  /// No description provided for @loginSessionExpired.
  ///
  /// In en, this message translates to:
  /// **'Your session has ended. Sign in again to send the entries still on this phone.'**
  String get loginSessionExpired;

  /// No description provided for @kilnPickerTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose your kiln'**
  String get kilnPickerTitle;

  /// No description provided for @kilnPickerHint.
  ///
  /// In en, this message translates to:
  /// **'Every entry you make is recorded against this kiln.'**
  String get kilnPickerHint;

  /// No description provided for @kilnPickerNone.
  ///
  /// In en, this message translates to:
  /// **'Your account has no kiln yet. Ask the owner to give you access to one.'**
  String get kilnPickerNone;

  /// No description provided for @homeGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String homeGreeting(String name);

  /// No description provided for @homeKiln.
  ///
  /// In en, this message translates to:
  /// **'Kiln'**
  String get homeKiln;

  /// No description provided for @homeSwitchKiln.
  ///
  /// In en, this message translates to:
  /// **'Switch kiln'**
  String get homeSwitchKiln;

  /// No description provided for @homeNoTasks.
  ///
  /// In en, this message translates to:
  /// **'Your role has nothing to enter from the app. Ask the owner if that is wrong.'**
  String get homeNoTasks;

  /// No description provided for @homeSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get homeSignOut;

  /// No description provided for @homeSignOutUnsentTitle.
  ///
  /// In en, this message translates to:
  /// **'Entries not sent yet'**
  String get homeSignOutUnsentTitle;

  /// No description provided for @homeSignOutUnsentBody.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 entry has} other{{count} entries have}} not reached the server. Signing out deletes {count, plural, =1{it} other{them}} from this phone.'**
  String homeSignOutUnsentBody(int count);

  /// No description provided for @homeSignOutAnyway.
  ///
  /// In en, this message translates to:
  /// **'Sign out anyway'**
  String get homeSignOutAnyway;

  /// No description provided for @homeSyncAndWait.
  ///
  /// In en, this message translates to:
  /// **'Keep them'**
  String get homeSyncAndWait;

  /// No description provided for @tileProduction.
  ///
  /// In en, this message translates to:
  /// **'Production'**
  String get tileProduction;

  /// No description provided for @tileProductionHint.
  ///
  /// In en, this message translates to:
  /// **'Batches, making, drying, firing, sorting'**
  String get tileProductionHint;

  /// No description provided for @tileAttendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get tileAttendance;

  /// No description provided for @tileAttendanceHint.
  ///
  /// In en, this message translates to:
  /// **'Daily muster roll by gang'**
  String get tileAttendanceHint;

  /// No description provided for @tileGrn.
  ///
  /// In en, this message translates to:
  /// **'Goods receipt'**
  String get tileGrn;

  /// No description provided for @tileGrnHint.
  ///
  /// In en, this message translates to:
  /// **'Coal, soil and material arriving'**
  String get tileGrnHint;

  /// No description provided for @tileDispatch.
  ///
  /// In en, this message translates to:
  /// **'Dispatch'**
  String get tileDispatch;

  /// No description provided for @tileDispatchHint.
  ///
  /// In en, this message translates to:
  /// **'Challans, gate out, delivery'**
  String get tileDispatchHint;

  /// No description provided for @tileSync.
  ///
  /// In en, this message translates to:
  /// **'Sync status'**
  String get tileSync;

  /// No description provided for @tileWaiting.
  ///
  /// In en, this message translates to:
  /// **'{count} waiting'**
  String tileWaiting(int count);

  /// No description provided for @syncTitle.
  ///
  /// In en, this message translates to:
  /// **'Sync'**
  String get syncTitle;

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get syncNow;

  /// No description provided for @syncLastSynced.
  ///
  /// In en, this message translates to:
  /// **'Last synced {time}'**
  String syncLastSynced(String time);

  /// No description provided for @syncNeverSynced.
  ///
  /// In en, this message translates to:
  /// **'Not synced yet'**
  String get syncNeverSynced;

  /// No description provided for @syncOfflineNote.
  ///
  /// In en, this message translates to:
  /// **'No network. Entries are saved on this phone and go out when signal returns.'**
  String get syncOfflineNote;

  /// No description provided for @syncEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing entered on this phone yet.'**
  String get syncEmpty;

  /// No description provided for @syncRetry.
  ///
  /// In en, this message translates to:
  /// **'Send again'**
  String get syncRetry;

  /// No description provided for @syncDiscardTitle.
  ///
  /// In en, this message translates to:
  /// **'Discard this entry?'**
  String get syncDiscardTitle;

  /// No description provided for @syncDiscardBody.
  ///
  /// In en, this message translates to:
  /// **'It has not reached the server. Discarding deletes it from this phone, with anything that depends on it.'**
  String get syncDiscardBody;

  /// No description provided for @syncServerNo.
  ///
  /// In en, this message translates to:
  /// **'No. {ref}'**
  String syncServerNo(String ref);

  /// No description provided for @syncAttempts.
  ///
  /// In en, this message translates to:
  /// **'Tried {count} times — will retry'**
  String syncAttempts(int count);

  /// No description provided for @entityProductionBatch.
  ///
  /// In en, this message translates to:
  /// **'New batch'**
  String get entityProductionBatch;

  /// No description provided for @entityProductionMaking.
  ///
  /// In en, this message translates to:
  /// **'Making'**
  String get entityProductionMaking;

  /// No description provided for @entityProductionDrying.
  ///
  /// In en, this message translates to:
  /// **'Drying'**
  String get entityProductionDrying;

  /// No description provided for @entityProductionFiring.
  ///
  /// In en, this message translates to:
  /// **'Firing'**
  String get entityProductionFiring;

  /// No description provided for @entityProductionSorting.
  ///
  /// In en, this message translates to:
  /// **'Sorting'**
  String get entityProductionSorting;

  /// No description provided for @entityAttendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get entityAttendance;

  /// No description provided for @entityGoodsReceipt.
  ///
  /// In en, this message translates to:
  /// **'Goods receipt'**
  String get entityGoodsReceipt;

  /// No description provided for @entityDispatch.
  ///
  /// In en, this message translates to:
  /// **'Challan'**
  String get entityDispatch;

  /// No description provided for @entityDispatchConfirm.
  ///
  /// In en, this message translates to:
  /// **'Gate out'**
  String get entityDispatchConfirm;

  /// No description provided for @entityDispatchAcknowledge.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get entityDispatchAcknowledge;

  /// No description provided for @savedOffline.
  ///
  /// In en, this message translates to:
  /// **'Saved on this phone. It goes to the server by itself.'**
  String get savedOffline;

  /// No description provided for @savedCorrected.
  ///
  /// In en, this message translates to:
  /// **'Corrected. It will be sent again.'**
  String get savedCorrected;

  /// No description provided for @formFixErrors.
  ///
  /// In en, this message translates to:
  /// **'Check the fields marked in red.'**
  String get formFixErrors;

  /// No description provided for @productionTitle.
  ///
  /// In en, this message translates to:
  /// **'Production'**
  String get productionTitle;

  /// No description provided for @productionTabBatches.
  ///
  /// In en, this message translates to:
  /// **'Open batches'**
  String get productionTabBatches;

  /// No description provided for @productionTabEntries.
  ///
  /// In en, this message translates to:
  /// **'My entries'**
  String get productionTabEntries;

  /// No description provided for @productionNewBatch.
  ///
  /// In en, this message translates to:
  /// **'New batch'**
  String get productionNewBatch;

  /// No description provided for @productionNoBatches.
  ///
  /// In en, this message translates to:
  /// **'No open batches at this kiln. Start one with New batch.'**
  String get productionNoBatches;

  /// No description provided for @productionNoEntries.
  ///
  /// In en, this message translates to:
  /// **'No production entries from this phone yet.'**
  String get productionNoEntries;

  /// No description provided for @productionChamber.
  ///
  /// In en, this message translates to:
  /// **'Chamber'**
  String get productionChamber;

  /// No description provided for @productionChamberHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Chamber 3'**
  String get productionChamberHint;

  /// No description provided for @productionBatchDate.
  ///
  /// In en, this message translates to:
  /// **'Batch date'**
  String get productionBatchDate;

  /// No description provided for @productionStatusOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get productionStatusOpen;

  /// No description provided for @productionStatusFiring.
  ///
  /// In en, this message translates to:
  /// **'Firing'**
  String get productionStatusFiring;

  /// No description provided for @productionStatusSorted.
  ///
  /// In en, this message translates to:
  /// **'Sorted'**
  String get productionStatusSorted;

  /// No description provided for @productionStatusClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get productionStatusClosed;

  /// No description provided for @productionStages.
  ///
  /// In en, this message translates to:
  /// **'Stages'**
  String get productionStages;

  /// No description provided for @productionStageRecorded.
  ///
  /// In en, this message translates to:
  /// **'Recorded'**
  String get productionStageRecorded;

  /// No description provided for @productionStageNotYet.
  ///
  /// In en, this message translates to:
  /// **'Not yet'**
  String get productionStageNotYet;

  /// No description provided for @productionDryingOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get productionDryingOptional;

  /// No description provided for @productionRecord.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get productionRecord;

  /// No description provided for @productionEntryDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get productionEntryDate;

  /// No description provided for @productionGreenBricks.
  ///
  /// In en, this message translates to:
  /// **'Green bricks'**
  String get productionGreenBricks;

  /// No description provided for @productionFiredBricks.
  ///
  /// In en, this message translates to:
  /// **'Fired bricks'**
  String get productionFiredBricks;

  /// No description provided for @productionSardar.
  ///
  /// In en, this message translates to:
  /// **'Sardar\'s gang'**
  String get productionSardar;

  /// No description provided for @productionNoSardar.
  ///
  /// In en, this message translates to:
  /// **'Not named'**
  String get productionNoSardar;

  /// No description provided for @productionConsumption.
  ///
  /// In en, this message translates to:
  /// **'Material used'**
  String get productionConsumption;

  /// No description provided for @productionConsumptionMaking.
  ///
  /// In en, this message translates to:
  /// **'Soil or other raw material taken from stock.'**
  String get productionConsumptionMaking;

  /// No description provided for @productionConsumptionFiring.
  ///
  /// In en, this message translates to:
  /// **'Coal or other fuel taken from stock.'**
  String get productionConsumptionFiring;

  /// No description provided for @productionAddMaterial.
  ///
  /// In en, this message translates to:
  /// **'Add material'**
  String get productionAddMaterial;

  /// No description provided for @productionItem.
  ///
  /// In en, this message translates to:
  /// **'Material'**
  String get productionItem;

  /// No description provided for @productionFromStore.
  ///
  /// In en, this message translates to:
  /// **'From store'**
  String get productionFromStore;

  /// No description provided for @productionQuantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get productionQuantity;

  /// No description provided for @productionQuantityUnit.
  ///
  /// In en, this message translates to:
  /// **'Quantity ({unit})'**
  String productionQuantityUnit(String unit);

  /// No description provided for @productionSortingWarehouse.
  ///
  /// In en, this message translates to:
  /// **'Good bricks go to'**
  String get productionSortingWarehouse;

  /// No description provided for @productionGrades.
  ///
  /// In en, this message translates to:
  /// **'Good bricks by grade'**
  String get productionGrades;

  /// No description provided for @productionBroken.
  ///
  /// In en, this message translates to:
  /// **'Broken'**
  String get productionBroken;

  /// No description provided for @productionRejects.
  ///
  /// In en, this message translates to:
  /// **'Rejects'**
  String get productionRejects;

  /// No description provided for @productionAtLeastOneGrade.
  ///
  /// In en, this message translates to:
  /// **'Enter good bricks for at least one grade.'**
  String get productionAtLeastOneGrade;

  /// No description provided for @productionNoGrades.
  ///
  /// In en, this message translates to:
  /// **'No brick grades on this phone yet. Sync where there is signal, or ask the owner to add them.'**
  String get productionNoGrades;

  /// No description provided for @productionNoStores.
  ///
  /// In en, this message translates to:
  /// **'No stores for this kiln on this phone yet. Sync where there is signal.'**
  String get productionNoStores;

  /// No description provided for @productionBatchEntryTitle.
  ///
  /// In en, this message translates to:
  /// **'{chamber} · batch of {date}'**
  String productionBatchEntryTitle(String chamber, String date);

  /// No description provided for @productionMakingTitle.
  ///
  /// In en, this message translates to:
  /// **'{chamber} · {bricks} green'**
  String productionMakingTitle(String chamber, String bricks);

  /// No description provided for @productionDryingTitle.
  ///
  /// In en, this message translates to:
  /// **'{chamber} · drying done'**
  String productionDryingTitle(String chamber);

  /// No description provided for @productionFiringTitle.
  ///
  /// In en, this message translates to:
  /// **'{chamber} · {bricks} fired'**
  String productionFiringTitle(String chamber, String bricks);

  /// No description provided for @productionSortingTitle.
  ///
  /// In en, this message translates to:
  /// **'{chamber} · {bricks} good'**
  String productionSortingTitle(String chamber, String bricks);

  /// No description provided for @productionGoodTotal.
  ///
  /// In en, this message translates to:
  /// **'Good: {bricks}'**
  String productionGoodTotal(String bricks);

  /// No description provided for @attendanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get attendanceTitle;

  /// No description provided for @attendanceTake.
  ///
  /// In en, this message translates to:
  /// **'Take attendance'**
  String get attendanceTake;

  /// No description provided for @attendanceNoEntries.
  ///
  /// In en, this message translates to:
  /// **'No attendance taken on this phone yet.'**
  String get attendanceNoEntries;

  /// No description provided for @attendanceGang.
  ///
  /// In en, this message translates to:
  /// **'Gang'**
  String get attendanceGang;

  /// No description provided for @attendanceNoGangs.
  ///
  /// In en, this message translates to:
  /// **'No gangs for this kiln on this phone yet. Sync where there is signal, or ask the owner to set them up.'**
  String get attendanceNoGangs;

  /// No description provided for @attendanceAllPresent.
  ///
  /// In en, this message translates to:
  /// **'Mark all present'**
  String get attendanceAllPresent;

  /// No description provided for @attendancePresent.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get attendancePresent;

  /// No description provided for @attendanceHalfDay.
  ///
  /// In en, this message translates to:
  /// **'Half day'**
  String get attendanceHalfDay;

  /// No description provided for @attendanceAbsent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get attendanceAbsent;

  /// No description provided for @attendanceOvertime.
  ///
  /// In en, this message translates to:
  /// **'Overtime hours'**
  String get attendanceOvertime;

  /// No description provided for @attendanceOvertimeInvalid.
  ///
  /// In en, this message translates to:
  /// **'Up to 2 digits, like 2 or 1.5'**
  String get attendanceOvertimeInvalid;

  /// No description provided for @attendanceWholeGang.
  ///
  /// In en, this message translates to:
  /// **'This gang has no workers listed. Mark the gang as a whole.'**
  String get attendanceWholeGang;

  /// No description provided for @attendanceAlreadyTaken.
  ///
  /// In en, this message translates to:
  /// **'Attendance for this gang on this date is already on this phone. Save another?'**
  String get attendanceAlreadyTaken;

  /// No description provided for @attendanceSaveAnyway.
  ///
  /// In en, this message translates to:
  /// **'Save anyway'**
  String get attendanceSaveAnyway;

  /// No description provided for @attendanceEntryTitle.
  ///
  /// In en, this message translates to:
  /// **'{gang} · {present} present of {total}'**
  String attendanceEntryTitle(String gang, String present, int total);

  /// No description provided for @grnTitle.
  ///
  /// In en, this message translates to:
  /// **'Goods receipt'**
  String get grnTitle;

  /// No description provided for @grnNew.
  ///
  /// In en, this message translates to:
  /// **'New receipt'**
  String get grnNew;

  /// No description provided for @grnNoEntries.
  ///
  /// In en, this message translates to:
  /// **'No goods received on this phone yet.'**
  String get grnNoEntries;

  /// No description provided for @grnSupplier.
  ///
  /// In en, this message translates to:
  /// **'Supplier'**
  String get grnSupplier;

  /// No description provided for @grnNoSuppliers.
  ///
  /// In en, this message translates to:
  /// **'No suppliers on this phone yet. Sync where there is signal.'**
  String get grnNoSuppliers;

  /// No description provided for @grnReceiptDate.
  ///
  /// In en, this message translates to:
  /// **'Received on'**
  String get grnReceiptDate;

  /// No description provided for @grnChallanNo.
  ///
  /// In en, this message translates to:
  /// **'Supplier\'s challan no.'**
  String get grnChallanNo;

  /// No description provided for @grnLines.
  ///
  /// In en, this message translates to:
  /// **'What arrived'**
  String get grnLines;

  /// No description provided for @grnLinesHint.
  ///
  /// In en, this message translates to:
  /// **'Quantity only — the bill brings the price.'**
  String get grnLinesHint;

  /// No description provided for @grnAddLine.
  ///
  /// In en, this message translates to:
  /// **'Add item'**
  String get grnAddLine;

  /// No description provided for @grnIntoStore.
  ///
  /// In en, this message translates to:
  /// **'Into store'**
  String get grnIntoStore;

  /// No description provided for @grnAtLeastOneLine.
  ///
  /// In en, this message translates to:
  /// **'Add at least one item.'**
  String get grnAtLeastOneLine;

  /// No description provided for @grnDuplicateLine.
  ///
  /// In en, this message translates to:
  /// **'That item is already listed for the same store — change the quantity instead.'**
  String get grnDuplicateLine;

  /// No description provided for @grnEntryTitle.
  ///
  /// In en, this message translates to:
  /// **'{supplier} · {lines} items'**
  String grnEntryTitle(String supplier, int lines);

  /// No description provided for @dispatchTitle.
  ///
  /// In en, this message translates to:
  /// **'Dispatch'**
  String get dispatchTitle;

  /// No description provided for @dispatchTabChallans.
  ///
  /// In en, this message translates to:
  /// **'Open challans'**
  String get dispatchTabChallans;

  /// No description provided for @dispatchTabEntries.
  ///
  /// In en, this message translates to:
  /// **'My entries'**
  String get dispatchTabEntries;

  /// No description provided for @dispatchNew.
  ///
  /// In en, this message translates to:
  /// **'New challan'**
  String get dispatchNew;

  /// No description provided for @dispatchNoChallans.
  ///
  /// In en, this message translates to:
  /// **'No open challans at this kiln.'**
  String get dispatchNoChallans;

  /// No description provided for @dispatchNoEntries.
  ///
  /// In en, this message translates to:
  /// **'No dispatch entries from this phone yet.'**
  String get dispatchNoEntries;

  /// No description provided for @dispatchCustomer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get dispatchCustomer;

  /// No description provided for @dispatchNoCustomers.
  ///
  /// In en, this message translates to:
  /// **'No customers on this phone yet. Sync where there is signal.'**
  String get dispatchNoCustomers;

  /// No description provided for @dispatchDate.
  ///
  /// In en, this message translates to:
  /// **'Dispatch date'**
  String get dispatchDate;

  /// No description provided for @dispatchVehicle.
  ///
  /// In en, this message translates to:
  /// **'Vehicle'**
  String get dispatchVehicle;

  /// No description provided for @dispatchNoVehicle.
  ///
  /// In en, this message translates to:
  /// **'Not named'**
  String get dispatchNoVehicle;

  /// No description provided for @dispatchDriver.
  ///
  /// In en, this message translates to:
  /// **'Driver'**
  String get dispatchDriver;

  /// No description provided for @dispatchNoDriver.
  ///
  /// In en, this message translates to:
  /// **'Not named'**
  String get dispatchNoDriver;

  /// No description provided for @dispatchDeliveryLocation.
  ///
  /// In en, this message translates to:
  /// **'Deliver to'**
  String get dispatchDeliveryLocation;

  /// No description provided for @dispatchLines.
  ///
  /// In en, this message translates to:
  /// **'Bricks loaded'**
  String get dispatchLines;

  /// No description provided for @dispatchLinesHint.
  ///
  /// In en, this message translates to:
  /// **'Each grade from the yard it leaves.'**
  String get dispatchLinesHint;

  /// No description provided for @dispatchAddLine.
  ///
  /// In en, this message translates to:
  /// **'Add grade'**
  String get dispatchAddLine;

  /// No description provided for @dispatchFromYard.
  ///
  /// In en, this message translates to:
  /// **'From yard'**
  String get dispatchFromYard;

  /// No description provided for @dispatchAtLeastOneLine.
  ///
  /// In en, this message translates to:
  /// **'Add at least one line.'**
  String get dispatchAtLeastOneLine;

  /// No description provided for @dispatchDuplicateLine.
  ///
  /// In en, this message translates to:
  /// **'That item already appears from the same yard — merge the lines.'**
  String get dispatchDuplicateLine;

  /// No description provided for @dispatchStatusDraft.
  ///
  /// In en, this message translates to:
  /// **'Raised'**
  String get dispatchStatusDraft;

  /// No description provided for @dispatchStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Left the gate'**
  String get dispatchStatusConfirmed;

  /// No description provided for @dispatchStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get dispatchStatusDelivered;

  /// No description provided for @dispatchStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get dispatchStatusCancelled;

  /// No description provided for @dispatchChallanUnsent.
  ///
  /// In en, this message translates to:
  /// **'Challan not sent yet'**
  String get dispatchChallanUnsent;

  /// No description provided for @dispatchGateOut.
  ///
  /// In en, this message translates to:
  /// **'Gate out'**
  String get dispatchGateOut;

  /// No description provided for @dispatchGateOutHint.
  ///
  /// In en, this message translates to:
  /// **'The truck is leaving the yard. Stock comes off when the server records this.'**
  String get dispatchGateOutHint;

  /// No description provided for @dispatchGateOutOn.
  ///
  /// In en, this message translates to:
  /// **'Left on'**
  String get dispatchGateOutOn;

  /// No description provided for @dispatchDeliver.
  ///
  /// In en, this message translates to:
  /// **'Record delivery'**
  String get dispatchDeliver;

  /// No description provided for @dispatchReceivedBy.
  ///
  /// In en, this message translates to:
  /// **'Received by'**
  String get dispatchReceivedBy;

  /// No description provided for @dispatchDeliveredOn.
  ///
  /// In en, this message translates to:
  /// **'Delivered on'**
  String get dispatchDeliveredOn;

  /// No description provided for @dispatchRemarks.
  ///
  /// In en, this message translates to:
  /// **'Remarks'**
  String get dispatchRemarks;

  /// No description provided for @dispatchLinesLoaded.
  ///
  /// In en, this message translates to:
  /// **'Loaded'**
  String get dispatchLinesLoaded;

  /// No description provided for @dispatchCustomerUnknown.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get dispatchCustomerUnknown;

  /// No description provided for @dispatchEntryTitle.
  ///
  /// In en, this message translates to:
  /// **'{customer} · {quantity}'**
  String dispatchEntryTitle(String customer, String quantity);

  /// No description provided for @dispatchConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'{challan} · gate out'**
  String dispatchConfirmTitle(String challan);

  /// No description provided for @dispatchDeliverTitle.
  ///
  /// In en, this message translates to:
  /// **'{challan} · received by {person}'**
  String dispatchDeliverTitle(String challan, String person);

  /// No description provided for @dispatchPendingAction.
  ///
  /// In en, this message translates to:
  /// **'{action} waiting to be sent'**
  String dispatchPendingAction(String action);
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
