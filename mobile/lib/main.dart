import 'package:brics_mobile/app.dart';
import 'package:brics_mobile/core/brand/brand_config.dart';
import 'package:brics_mobile/core/notifications/push_notification_service.dart';
import 'package:brics_mobile/firebase_options.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  debugPrint('Background message received: ${message.messageId}');
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );


  FirebaseMessaging.onBackgroundMessage(
    firebaseMessagingBackgroundHandler,
  );

  // Existing brand configuration — kept unchanged.
  await BrandConfig.load();

  await PushNotificationService.initialize();

  runApp(const ProviderScope(child: BricsApp()));
}
