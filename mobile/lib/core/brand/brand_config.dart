import 'dart:convert';

import 'package:flutter/services.dart';

/// The shared brand (repo `assets/brand/brand.json`, copied into
/// `mobile/assets/brand/` by `pnpm brand:sync`). Loaded once before the app
/// starts; read synchronously through [BrandConfig.instance] afterwards.
///
/// Change the name or the wordmark in brand.json only — no code changes.
class BrandConfig {
  const BrandConfig({
    required this.productName,
    required this.wordmarkLine1,
    required this.line2Show,
    required this.line2Text,
    required this.line2Year,
    required this.line2BrickIcon,
    required this.leafLetter,
    required this.primary,
    required this.dark,
    required this.light,
  });

  factory BrandConfig.fromJson(Map<String, dynamic> json) {
    const d = fallback;
    final line2 = (json['wordmarkLine2'] as Map?)?.cast<String, dynamic>() ?? const {};
    final colors = (json['colors'] as Map?)?.cast<String, dynamic>() ?? const {};
    return BrandConfig(
      productName: _text(json['productName']) ?? d.productName,
      wordmarkLine1: _text(json['wordmarkLine1']) ?? d.wordmarkLine1,
      line2Show: line2['show'] as bool? ?? d.line2Show,
      line2Text: _text(line2['text']) ?? d.line2Text,
      line2Year: _text(line2['year']) ?? d.line2Year,
      line2BrickIcon: line2['showBrickIcon'] as bool? ?? d.line2BrickIcon,
      leafLetter: _text(json['leafLetter']) ?? d.leafLetter,
      primary: _colour(colors['primary']) ?? d.primary,
      dark: _colour(colors['dark']) ?? d.dark,
      light: _colour(colors['light']) ?? d.light,
    );
  }

  final String productName;
  final String wordmarkLine1;
  final bool line2Show;
  final String line2Text;
  final String line2Year;
  final bool line2BrickIcon;

  /// "auto" = the last I in line 1; "none" = no leaf; otherwise that letter's last occurrence.
  final String leafLetter;
  final Color primary;
  final Color dark;
  final Color light;

  /// Safe defaults when brand.json is missing or malformed.
  static const fallback = BrandConfig(
    productName: 'BRICS',
    wordmarkLine1: 'BRICK KILN',
    line2Show: true,
    line2Text: 'ESTD',
    line2Year: '1999',
    line2BrickIcon: true,
    leafLetter: 'auto',
    primary: Color(0xFF2D6A43),
    dark: Color(0xFF0B4A2A),
    light: Color(0xFF9BE59B),
  );

  static const asset = 'assets/brand/brand.json';
  static const iconAsset = 'assets/brand/logo-icon-256.webp';
  static const iconAssetLarge = 'assets/brand/logo-icon-512.webp';

  static BrandConfig _instance = fallback;
  static BrandConfig get instance => _instance;

  /// Reads brand.json once. Never throws: a bad file keeps the defaults.
  static Future<void> load([AssetBundle? bundle]) async {
    try {
      final raw = await (bundle ?? rootBundle).loadString(asset);
      _instance = BrandConfig.fromJson((jsonDecode(raw) as Map).cast<String, dynamic>());
    } on Object {
      _instance = fallback;
    }
  }

  /// Index in [text] of the letter that wears the leaf, or -1.
  int leafIndex(String text) {
    if (leafLetter == 'none') return -1;
    final letter = leafLetter == 'auto' ? 'i' : leafLetter.toLowerCase();
    return text.toLowerCase().lastIndexOf(letter);
  }

  static String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

  static Color? _colour(Object? v) {
    if (v is! String) return null;
    final hex = v.replaceFirst('#', '');
    if (hex.length != 6) return null;
    final n = int.tryParse(hex, radix: 16);
    return n == null ? null : Color(0xFF000000 | n);
  }
}
