void main() {
  final uri = Uri.tryParse("https://abc.trycloudflare.com?sid=xyz");
  if (uri != null) {
    print("1: ${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}");
  }
  
  final uri2 = Uri.tryParse("http://192.168.0.106:8000?sid=123");
  if (uri2 != null) {
    print("2: ${uri2.scheme}://${uri2.host}${uri2.hasPort ? ':${uri2.port}' : ''}");
  }
}
