/// Where the backend lives.
///
/// `partner/src/config/api.ts` reads `NEXT_PUBLIC_API_URL` and falls back to
/// localhost, with `.env.production` setting the real host at build time. The
/// equivalent here is a dart-define, with production as the default so a plain
/// `flutter build apk` produces a shippable app rather than one pointing at a
/// developer's laptop.
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://acsgroup.cloud',
);

/// Turns a path the server hands back (`/uploads/...`) into something loadable.
/// Returns null for an empty value so callers can fall back to a placeholder.
String? absoluteUrl(Object? value) {
  final path = value?.toString().trim() ?? '';
  if (path.isEmpty) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('data:')) return path;
  return '$apiUrl${path.startsWith('/') ? '' : '/'}$path';
}
