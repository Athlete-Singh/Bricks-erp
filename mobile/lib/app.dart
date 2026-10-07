import 'package:flutter/material.dart';

/// Placeholder root widget. P0.4 replaces this with ProviderScope + go_router + theme.
class BricsApp extends StatelessWidget {
  const BricsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'BRICS',
      home: Scaffold(body: Center(child: Text('BRICS Supervisor'))),
    );
  }
}
