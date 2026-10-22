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

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'This screen arrives in the next update.'**
  String get comingSoon;

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
