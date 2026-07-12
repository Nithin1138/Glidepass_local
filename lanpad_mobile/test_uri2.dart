void main() {
  final uri = Uri.tryParse("https://abc.trycloudflare.com?sid=xyz");
  if (uri != null) {
    print("original: $uri");
    print("baseUrl: ${uri.replace(query: '').toString()}");
    
    final uri2 = Uri.tryParse("http://192.168.0.106:8000?sid=123");
    if (uri2 != null) {
      print("original: $uri2");
      print("baseUrl: ${uri2.replace(query: '').toString()}");
    }
  }
}
