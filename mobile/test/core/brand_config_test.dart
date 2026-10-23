import 'dart:convert';

import 'package:brics_mobile/core/brand/brand_config.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

class _Bundle extends CachingAssetBundle {
  _Bundle(this.body);

  final String? body;

  @override
  Future<ByteData> load(String key) async {
    final b = body;
    if (b == null) throw FlutterError('missing $key');
    return ByteData.sublistView(Uint8List.fromList(utf8.encode(b)));
  }
}

void main() {
  tearDown(() => BrandConfig.load(_Bundle(null)));

  test('brand.json drives the name, wordmark and colours', () async {
    await BrandConfig.load(
      _Bundle(
        jsonEncode({
          'productName': 'KILNPRO',
          'wordmarkLine1': 'SHRI BALAJI',
          'wordmarkLine2': {'show': false, 'text': 'SINCE', 'year': '1985'},
          'leafLetter': 'auto',
          'colors': {'primary': '#112233'},
        }),
      ),
    );
    final b = BrandConfig.instance;
    expect(b.productName, 'KILNPRO');
    expect(b.wordmarkLine1, 'SHRI BALAJI');
    expect(b.line2Show, isFalse);
    expect(b.line2Year, '1985');
    expect(b.primary, const Color(0xFF112233));
    expect(b.dark, BrandConfig.fallback.dark, reason: 'missing keys keep defaults');
  });

  test('a missing or broken file falls back to BRICK KILN, ESTD 1999', () async {
    await BrandConfig.load(_Bundle('{not json'));
    expect(BrandConfig.instance.wordmarkLine1, 'BRICK KILN');
    expect(BrandConfig.instance.line2Year, '1999');
    await BrandConfig.load(_Bundle(null));
    expect(BrandConfig.instance.productName, 'BRICS');
  });

  test('the leaf goes on the last I, or nowhere', () {
    const b = BrandConfig.fallback;
    expect(b.leafIndex('BRICK KILN'), 7);
    expect(b.leafIndex('BRAND'), -1);
  });
}
