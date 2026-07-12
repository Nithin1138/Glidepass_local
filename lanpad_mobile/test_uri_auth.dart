void main() {
  final uri1 = Uri.parse('https://abc.trycloudflare.com?sid=123');
  print('1: \${uri1.scheme}://\${uri1.authority}');
  
  final uri2 = Uri.parse('http://192.168.0.106:8000?sid=123');
  print('2: \${uri2.scheme}://\${uri2.authority}');
}
