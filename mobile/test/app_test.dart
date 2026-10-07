import 'package:brics_mobile/app.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows the app name', (tester) async {
    await tester.pumpWidget(const BricsApp());
    expect(find.text('BRICS Supervisor'), findsOneWidget);
  });
}
