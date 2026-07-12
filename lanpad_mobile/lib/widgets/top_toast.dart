import 'dart:async';
import 'package:flutter/material.dart';

class TopToast {
  static OverlayEntry? _overlayEntry;

  static void show(BuildContext context, String message, {bool isError = false}) {
    // Remove previous overlay if active
    _overlayEntry?.remove();
    _overlayEntry = null;

    final overlay = Overlay.of(context);
    _overlayEntry = OverlayEntry(
      builder: (ctx) {
        return _TopNotification(
          message: message,
          isError: isError,
          onDismiss: () {
            if (_overlayEntry != null) {
              _overlayEntry?.remove();
              _overlayEntry = null;
            }
          },
        );
      },
    );

    overlay.insert(_overlayEntry!);
  }
}

class _TopNotification extends StatefulWidget {
  final String message;
  final bool isError;
  final VoidCallback onDismiss;

  const _TopNotification({
    required this.message,
    required this.isError,
    required this.onDismiss,
  });

  @override
  State<_TopNotification> createState() => _TopNotificationState();
}

class _TopNotificationState extends State<_TopNotification> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _offsetAnimation;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutBack));

    _controller.forward();

    _dismissTimer = Timer(const Duration(milliseconds: 2800), () {
      if (mounted) {
        _controller.reverse().then((_) {
          widget.onDismiss();
        });
      }
    });
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color bgColor = widget.isError 
        ? const Color(0xFFE53935) // High contrast vibrant crimson red
        : const Color(0xFF00E676); // High contrast vibrant glowing green
        
    final IconData icon = widget.isError ? Icons.warning_amber_rounded : Icons.check_circle_outline_rounded;

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: Padding(
          padding: const EdgeInsets.only(top: 12, left: 16, right: 16),
          child: SlideTransition(
            position: _offsetAnimation,
            child: Material(
              color: Colors.transparent,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.35),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
                  border: Border.all(
                    color: Colors.white.withOpacity(0.25),
                    width: 1.0,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, color: Colors.white, size: 18),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        widget.message,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
