import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// The handful of lucide-react glyphs the web app uses that Material's icon set
/// has no equivalent for. The paths are lucide's own, so the shapes match what
/// the Capacitor build draws rather than approximating them with a hanger.
class Lucide {
  Lucide._();

  static const _shirt =
      'M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z';

  static Widget shirt({double size = 24, Color color = const Color(0xFF000000)}) {
    return SvgPicture.string(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
      'stroke="#${color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}" '
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      '<path d="$_shirt"/></svg>',
      width: size,
      height: size,
    );
  }
}
