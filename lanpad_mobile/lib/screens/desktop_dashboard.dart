// desktop_dashboard.dart — barrel file.
// The monolithic implementation has been refactored into:
//
//   lib/screens/desktop/
//   ├── desktop_shell.dart     ← main scaffold + all state
//   ├── desktop_state.dart     ← shared state object
//   ├── desktop_theme.dart     ← design tokens
//   ├── widgets/
//   │   ├── sidebar.dart
//   │   └── top_bar.dart
//   └── views/
//       ├── home_view.dart
//       ├── files_view.dart
//       ├── resources_view.dart
//       ├── history_view.dart
//       ├── settings_view.dart
//       ├── input_view.dart
//       └── terms_view.dart

export 'desktop/desktop_shell.dart';
export 'desktop/desktop_theme.dart';
export 'desktop/widgets/sidebar.dart' show DesktopView;
