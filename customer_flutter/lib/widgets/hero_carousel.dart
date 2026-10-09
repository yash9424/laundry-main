import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../models/catalogue.dart';
import '../theme/brand.dart';

/// The banner carousel at the top of the home screen: swipeable, auto-advancing
/// every four seconds, and pausing for six seconds after a touch so it does not
/// slide away mid-read. Admin can upload an image or a video for each slot.
class HeroCarousel extends StatefulWidget {
  const HeroCarousel({super.key, required this.items, this.onAction});

  final List<HeroItem> items;
  final void Function(String link)? onAction;

  @override
  State<HeroCarousel> createState() => _HeroCarouselState();
}

class _HeroCarouselState extends State<HeroCarousel> {
  final _controller = PageController();
  Timer? _autoScroll;
  Timer? _resume;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _startAutoScroll();
  }

  @override
  void didUpdateWidget(covariant HeroCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.items.length != widget.items.length) _startAutoScroll();
  }

  @override
  void dispose() {
    _autoScroll?.cancel();
    _resume?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _startAutoScroll() {
    _autoScroll?.cancel();
    if (widget.items.length <= 1) return;
    _autoScroll = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_controller.hasClients) return;
      final next = (_index + 1) % widget.items.length;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 700),
        curve: Curves.easeInOut,
      );
    });
  }

  void _pause() {
    _autoScroll?.cancel();
    _resume?.cancel();
    _resume = Timer(const Duration(seconds: 6), _startAutoScroll);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: SizedBox(
            height: 192,
            child: Listener(
              onPointerDown: (_) => _pause(),
              child: PageView.builder(
                controller: _controller,
                itemCount: widget.items.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (_, i) => _Slide(
                  item: widget.items[i],
                  onAction: widget.onAction,
                ),
              ),
            ),
          ),
        ),
        if (widget.items.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < widget.items.length; i++)
                  GestureDetector(
                    onTap: () {
                      _pause();
                      _controller.animateToPage(
                        i,
                        duration: const Duration(milliseconds: 400),
                        curve: Curves.easeInOut,
                      );
                    },
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      height: 8,
                      width: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i == _index
                            ? const Color(0xFF3B82F6)
                            : const Color(0xFFD1D5DB),
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Slide extends StatelessWidget {
  const _Slide({required this.item, this.onAction});

  final HeroItem item;
  final void Function(String link)? onAction;

  @override
  Widget build(BuildContext context) {
    final hasCaption = (item.title ?? '').isNotEmpty ||
        (item.description ?? '').isNotEmpty ||
        (item.buttonText ?? '').isNotEmpty;

    return Stack(
      fit: StackFit.expand,
      children: [
        if (item.isVideo)
          _HeroVideo(url: item.url)
        else
          Image.network(
            item.url,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => const ColoredBox(
              color: Color(0xFFE5E7EB),
              child: Center(
                child: Icon(Icons.image_not_supported_outlined,
                    color: Brand.mutedForeground),
              ),
            ),
          ),
        if (hasCaption)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [Color(0xB3000000), Colors.transparent],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if ((item.title ?? '').isNotEmpty)
                    Text(
                      item.title!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontFamily: 'Montserrat',
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  if ((item.description ?? '').isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        item.description!,
                        style: const TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                    ),
                  if ((item.buttonText ?? '').isNotEmpty &&
                      (item.buttonLink ?? '').isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: GestureDetector(
                        onTap: () => onAction?.call(item.buttonLink!),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 9),
                          decoration: BoxDecoration(
                            gradient: Brand.gradient,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            item.buttonText!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// A banner video: muted, looping and started as soon as it is ready, which is
/// how the web app's <video autoplay loop muted> behaved.
class _HeroVideo extends StatefulWidget {
  const _HeroVideo({required this.url});

  final String url;

  @override
  State<_HeroVideo> createState() => _HeroVideoState();
}

class _HeroVideoState extends State<_HeroVideo> {
  VideoPlayerController? _player;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _open();
  }

  Future<void> _open() async {
    try {
      final player = VideoPlayerController.networkUrl(Uri.parse(widget.url));
      await player.initialize();
      await player.setVolume(0);
      await player.setLooping(true);
      await player.play();
      if (!mounted) {
        await player.dispose();
        return;
      }
      setState(() => _player = player);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  void dispose() {
    _player?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final player = _player;
    if (_failed) {
      return const ColoredBox(
        color: Color(0xFFE5E7EB),
        child: Center(child: Icon(Icons.videocam_off_outlined, color: Brand.mutedForeground)),
      );
    }
    if (player == null) {
      return const ColoredBox(
        color: Color(0xFFE5E7EB),
        child: Center(
          child: SizedBox(
            height: 22,
            width: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }
    return FittedBox(
      fit: BoxFit.cover,
      clipBehavior: Clip.hardEdge,
      child: SizedBox(
        width: player.value.size.width,
        height: player.value.size.height,
        child: VideoPlayer(player),
      ),
    );
  }
}
