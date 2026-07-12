import 'package:http/http.dart' as http;
void main() async {
  try {
    final res = await http.get(Uri.parse('https://harvest-watches-cons-lucy.trycloudflare.com:443/api/connection/info'));
    print("Status: " + res.statusCode.toString());
    print("Body: " + res.body);
  } catch (e) {
    print("Error: " + e.toString());
  }
}
