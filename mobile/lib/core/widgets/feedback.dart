import 'package:flutter/material.dart';

/// A short confirmation at the bottom of the screen.
void showAppSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
