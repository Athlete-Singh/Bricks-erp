import 'package:brics_mobile/core/utils/formatters.dart';
import 'package:brics_mobile/core/utils/validators.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_app.dart';

void main() {
  group('Formatters', () {
    test('wire dates are YYYY-MM-DD in local time', () {
      expect(Formatters.isoDate(DateTime(2026, 3, 7, 23, 59)), '2026-03-07');
    });

    test('counts use Indian grouping without passing through a double', () {
      expect(Formatters.quantity('1234567'), '12,34,567');
      expect(Formatters.quantity('12500.500'), '12,500.5');
      expect(Formatters.quantity('10.000'), '10');
    });
  });

  group('Validators mirror the backend rules', () {
    late Validators v;
    setUpAll(() async => v = Validators(await loadL10n()));

    test('brick counts are whole and positive', () {
      expect(v.brickCount('10000'), isNull);
      expect(v.brickCount('0'), isNotNull);
      expect(v.brickCount('100.5'), isNotNull);
      expect(v.brickCount(''), isNotNull);
      expect(v.brickCountOrZero('0'), isNull);
    });

    test('quantities allow three decimals and must be more than zero', () {
      expect(v.quantity('12.500'), isNull);
      expect(v.quantity('12.5005'), isNotNull);
      expect(v.quantity('0.000'), isNotNull);
      expect(v.quantity('0.001'), isNull);
    });

    test('blank optional text becomes null', () {
      expect(blankToNull('  '), isNull);
      expect(blankToNull(' CH-12 '), 'CH-12');
    });
  });
}
