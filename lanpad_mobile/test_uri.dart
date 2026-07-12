void main() {
  final uri = Uri.tryParse("https://abc.trycloudflare.com?sid=xyz");
  if (uri != null) {
    print("hasPort: ${uri.hasPort}");
    print("port: ${uri.port}");
    print("baseUrl: ${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}");
    
    final baseUrl2 = '${uri.scheme}://${uri.host}:${uri.port}';
    print("baseUrl2: $baseUrl2");
  }
}
