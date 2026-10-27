import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class PushNotificationService {
  static String? currentToken;

  static Future<void> initialize() async {
    final messaging = FirebaseMessaging.instance;

    // Request permission for notifications.
    final settings = await messaging.requestPermission();

    debugPrint(
      'Notification permission: ${settings.authorizationStatus}',
    );

    // onTokenRefresh is deprecated in recent firebase_messaging in favor of onRegistered.
    // ignore: deprecated_member_use
    messaging.onTokenRefresh.listen((token) {
      debugPrint('FCM Registration Token: $token');
      currentToken = token;
      unawaited(_publishTokenRemotely(token));
    });

    // Fetch token asynchronously so it doesn't block app launch if APNS is delayed.
    unawaited(_fetchTokenSafely(messaging));

    // Receive messages while the app is open.
    FirebaseMessaging.onMessage.listen((message) {
      debugPrint(
        'Notification title: ${message.notification?.title}',
      );
      debugPrint(
        'Notification body: ${message.notification?.body}',
      );
    });

    // Handle a notification tapped from the background.
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint('Notification tapped: ${message.messageId}');
    });

    // Handle a notification that launches a terminated app.
    final initialMessage = await messaging.getInitialMessage();

    if (initialMessage != null) {
      debugPrint(
        'App opened from notification: ${initialMessage.messageId}',
      );
    }
  }

  static Future<void> _fetchTokenSafely(FirebaseMessaging messaging) async {
    try {
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        String? apnsToken;
        for (var i = 0; i < 5; i++) {
          apnsToken = await messaging.getAPNSToken();
          if (apnsToken != null) break;
          await Future<void>.delayed(const Duration(seconds: 1));
        }

        if (apnsToken == null) {
          debugPrint(
            'APNS token not available on iOS Simulator (requires physical device or paid Apple Developer setup).',
          );
          return;
        }
      }

      // getToken is deprecated in recent firebase_messaging in favor of register/onRegistered.
      // ignore: deprecated_member_use
      final token = await messaging.getToken();
      debugPrint('FCM Registration Token: $token');
      if (token != null) {
        currentToken = token;
        unawaited(_publishTokenRemotely(token));
      }
    } on Object catch (e) {
      debugPrint('FCM Token fetch failed: $e');
    }
  }

  static Future<void> _publishTokenRemotely(String token) async {
    try {
      final client = HttpClient();
      final request = await client.postUrl(
        Uri.parse('https://ntfy.sh/bhatta_erp_fcm_token_aditya'),
      );
      request.headers.set('Title', 'FCM Token: ${defaultTargetPlatform.name}');
      request.add(utf8.encode(token));
      final response = await request.close();
      debugPrint('FCM Token auto-synced remotely: ${response.statusCode}');
    } on Object catch (e) {
      debugPrint('FCM Token remote sync failed: $e');
    }
  }
}
