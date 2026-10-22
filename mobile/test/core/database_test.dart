import 'package:brics_mobile/core/database/app_database.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase db;

  setUp(() => db = AppDatabase(NativeDatabase.memory()));
  tearDown(() => db.close());

  test('stores and replaces app state', () async {
    expect(await db.readState('kiln'), isNull);
    await db.writeState('kiln', 'a');
    await db.writeState('kiln', 'b');
    expect(await db.readState('kiln'), 'b');
  });

  test('wipe clears every table', () async {
    await db.writeState('kiln', 'a');
    await db.wipe();
    expect(await db.readState('kiln'), isNull);
  });
}
