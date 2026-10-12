import 'package:flutter/material.dart';

/// Every picture that comes off the server goes through this.
///
/// `Image.network` draws nothing at all while it is downloading, and the
/// pictures in this app are not small -- the home banners run from 200 KB to
/// over 4 MB. The result was that the screens opened as blank panels and
/// filled in seconds later, which reads as a broken page rather than a loading
/// one. This shows a quiet shimmer in the meantime, fades the picture in when
/// it arrives, and puts something sensible there if it never does.
///
/// It also caps the decode size. A 4 MB screenshot decoded at full resolution
/// costs tens of megabytes of memory for a banner a few hundred pixels wide,
/// and on a mid-range phone that alone is enough to make scrolling stutter.
class RemoteImage extends StatelessWidget {
  const RemoteImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.borderRadius,
    this.fallback,
    this.decodeWidth,
  });

  final String? url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  /// Drawn when there is no url, or the download failed.
  final Widget? fallback;

  /// Logical width to decode to. Defaults to the widget's own width where it
  /// has one, so a banner never decodes larger than it is drawn.
  final double? decodeWidth;

  @override
  Widget build(BuildContext context) {
    final source = url?.trim() ?? '';
    Widget child;

    if (source.isEmpty) {
      child = fallback ?? const _Placeholder(animate: false);
    } else {
      final target = decodeWidth ?? width;
      final ratio = MediaQuery.maybeDevicePixelRatioOf(context) ?? 2.0;
      child = Image.network(
        source,
        fit: fit,
        width: width,
        height: height,
        cacheWidth: (target != null && target.isFinite)
            ? (target * ratio).round()
            : null,
        // Fade in rather than snapping, so a slow picture does not flash.
        frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
          if (wasSynchronouslyLoaded) return child;
          return AnimatedOpacity(
            opacity: frame == null ? 0 : 1,
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOut,
            child: child,
          );
        },
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return const _Placeholder(animate: true);
        },
        errorBuilder: (_, __, ___) =>
            fallback ?? const _Placeholder(animate: false),
      );
    }

    if (borderRadius == null) return child;
    return ClipRRect(borderRadius: borderRadius!, child: child);
  }
}

/// A pale band that drifts across the panel while the picture downloads. It is
/// deliberately low contrast -- it should read as "coming" rather than as a
/// thing in its own right.
class _Placeholder extends StatefulWidget {
  const _Placeholder({required this.animate});

  final bool animate;

  @override
  State<_Placeholder> createState() => _PlaceholderState();
}

class _PlaceholderState extends State<_Placeholder>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shimmer = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void initState() {
    super.initState();
    if (widget.animate) _shimmer.repeat();
  }

  @override
  void didUpdateWidget(covariant _Placeholder oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animate && !_shimmer.isAnimating) {
      _shimmer.repeat();
    } else if (!widget.animate && _shimmer.isAnimating) {
      _shimmer.stop();
    }
  }

  @override
  void dispose() {
    _shimmer.dispose();
    super.dispose();
  }

  static const _base = Color(0xFFEDF0F4);
  static const _highlight = Color(0xFFF7F9FC);

  @override
  Widget build(BuildContext context) {
    if (!widget.animate) return const ColoredBox(color: _base);

    return AnimatedBuilder(
      animation: _shimmer,
      builder: (context, _) {
        // -1 .. 2 so the band starts and ends fully off the panel.
        final t = _shimmer.value * 3 - 1;
        return DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(t - 1, -0.3),
              end: Alignment(t + 1, 0.3),
              colors: const [_base, _highlight, _base],
              stops: const [0.35, 0.5, 0.65],
            ),
          ),
          child: const SizedBox.expand(),
        );
      },
    );
  }
}
