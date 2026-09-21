import 'dart:io';

class NetworkUtils {
  // Virtual / VPN / VM adapter keywords in interface names (lowercase)
  static const List<String> _virtualInterfaceKeywords = [
    'vethernet',
    'wsl',
    'hyper-v',
    'virtualbox',
    'vmware',
    'docker',
    'tailscale',
    'zerotier',
    'nordlynx',
    'wireguard',
    'tap',
    'tun',
    'vpn',
    'loopback',
    'bluetooth',
    'teredo',
    'isatap',
    'pseudo',
    'host-only',
    'npcap',
  ];

  // Preferred physical interface keywords
  static const List<String> _physicalInterfaceKeywords = [
    'wi-fi',
    'wifi',
    'wireless',
    'wlan',
    'ethernet',
    'eth',
    'en0',
    'en1',
    'en2',
    'lan',
  ];

  /// Returns true if an IP belongs to a virtual switch, VM, CGNAT, link-local, or loopback.
  static bool isVirtualOrLocalOnlyIp(String ip) {
    if (ip.isEmpty || ip == '127.0.0.1' || ip.startsWith('127.')) return true;
    if (ip.startsWith('169.254.')) return true; // APIPA
    if (ip.startsWith('192.168.56.')) return true; // VirtualBox host-only
    if (ip.startsWith('192.168.122.')) return true; // KVM / libvirt

    // Docker and WSL2/Hyper-V subnets: 172.17.0.0/16 to 172.31.255.255/16
    final parts = ip.split('.');
    if (parts.length == 4) {
      final first = int.tryParse(parts[0]);
      final second = int.tryParse(parts[1]);
      if (first == 172 && second != null && second >= 17 && second <= 31) {
        return true;
      }
      // Tailscale / CGNAT: 100.64.0.0/10 (100.64.x.x - 100.127.x.x)
      if (first == 100 && second != null && second >= 64 && second <= 127) {
        return true;
      }
    }
    return false;
  }

  /// Checks if an interface name is a virtual or VPN adapter.
  static bool isVirtualInterfaceName(String name) {
    final lower = name.toLowerCase();
    return _virtualInterfaceKeywords.any((k) => lower.contains(k));
  }

  /// Calculates a heuristic score for an interface address.
  /// Higher score = preferred physical LAN IP (e.g. Wi-Fi).
  static int scoreAddress(NetworkInterface iface, InternetAddress addr) {
    final ip = addr.address;
    if (addr.isLoopback || ip.startsWith('127.')) return -100;
    if (ip.startsWith('169.254.')) return -100;

    final name = iface.name.toLowerCase();
    int score = 0;

    if (isVirtualInterfaceName(name)) {
      score -= 50;
    }

    if (isVirtualOrLocalOnlyIp(ip)) {
      score -= 50;
    }

    if (_physicalInterfaceKeywords.any((k) => name.contains(k))) {
      score += 40;
    }

    if (name.contains('wi-fi') || name.contains('wifi') || name.contains('wlan')) {
      score += 25;
    }

    if (ip.startsWith('192.168.')) {
      score += 30;
    } else if (ip.startsWith('10.')) {
      score += 25;
    } else if (ip.startsWith('172.16.')) {
      score += 20;
    }

    return score;
  }

  /// Returns the most reliable physical LAN IPv4 for QR code and peer connection.
  static Future<String> getBestLocalIp({String? backendSuggestedIp}) async {
    // If the Python backend provided an IP and it is not a virtual IP, trust it!
    if (backendSuggestedIp != null &&
        backendSuggestedIp.isNotEmpty &&
        backendSuggestedIp != '127.0.0.1' &&
        !isVirtualOrLocalOnlyIp(backendSuggestedIp)) {
      return backendSuggestedIp;
    }

    try {
      final interfaces = await NetworkInterface.list(
        includeLinkLocal: false,
        type: InternetAddressType.IPv4,
      );

      final List<MapEntry<int, String>> scored = [];

      for (final iface in interfaces) {
        for (final addr in iface.addresses) {
          if (!addr.isLoopback) {
            final s = scoreAddress(iface, addr);
            scored.add(MapEntry(s, addr.address));
          }
        }
      }

      if (scored.isNotEmpty) {
        scored.sort((a, b) => b.key.compareTo(a.key));
        return scored.first.value;
      }
    } catch (_) {}

    return (backendSuggestedIp != null && backendSuggestedIp.isNotEmpty)
        ? backendSuggestedIp
        : '127.0.0.1';
  }

  /// Returns all candidate physical LAN subnets (e.g. ['192.168.1', '10.0.0']).
  /// Excludes virtual interfaces and isolated VM subnets.
  static Future<List<String>> getCandidateSubnets() async {
    final subnets = <String>{};
    try {
      final interfaces = await NetworkInterface.list(
        includeLinkLocal: false,
        type: InternetAddressType.IPv4,
      );

      for (final iface in interfaces) {
        if (isVirtualInterfaceName(iface.name)) continue;

        for (final addr in iface.addresses) {
          final ip = addr.address;
          if (addr.isLoopback || isVirtualOrLocalOnlyIp(ip)) continue;

          final parts = ip.split('.');
          if (parts.length == 4) {
            subnets.add('${parts[0]}.${parts[1]}.${parts[2]}');
          }
        }
      }
    } catch (_) {}

    // If no physical subnets found, fallback to best local IP subnet
    if (subnets.isEmpty) {
      final bestIp = await getBestLocalIp();
      final parts = bestIp.split('.');
      if (parts.length == 4 && bestIp != '127.0.0.1') {
        subnets.add('${parts[0]}.${parts[1]}.${parts[2]}');
      }
    }

    return subnets.toList();
  }

  /// Returns all active, usable non-loopback IPv4 addresses.
  static Future<List<String>> getAllUsableIps() async {
    final ips = <String>[];
    try {
      final interfaces = await NetworkInterface.list(
        includeLinkLocal: false,
        type: InternetAddressType.IPv4,
      );

      final List<MapEntry<int, String>> scored = [];
      for (final iface in interfaces) {
        for (final addr in iface.addresses) {
          if (!addr.isLoopback && !addr.address.startsWith('127.')) {
            final s = scoreAddress(iface, addr);
            scored.add(MapEntry(s, addr.address));
          }
        }
      }

      scored.sort((a, b) => b.key.compareTo(a.key));
      for (final entry in scored) {
        if (!ips.contains(entry.value)) {
          ips.add(entry.value);
        }
      }
    } catch (_) {}
    return ips;
  }
}
