// This is a basic Flutter widget test.
import 'package:flutter_test/flutter_test.dart';
import 'package:lanpad/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const LanpadApp());
    expect(find.byType(LanpadApp), findsOneWidget);
  });
}
