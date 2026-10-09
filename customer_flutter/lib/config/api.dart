/// Same base URL the Capacitor build was compiled with
/// (customer/.env.production -> VITE_API_URL).
///
/// Override for local work:  flutter run --dart-define=API_URL=http://10.0.2.2:3000
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://acsgroup.cloud',
);
