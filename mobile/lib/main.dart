import 'package:brics_mobile/app.dart';
import 'package:brics_mobile/core/brand/brand_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // The wordmark is live text from brand.json: read it once, before the first frame.
  await BrandConfig.load();
  runApp(const ProviderScope(child: BricsApp()));
}
