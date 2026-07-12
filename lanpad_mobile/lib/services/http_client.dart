import 'package:http/http.dart' as http;

class BypassTunnelClient extends http.BaseClient {
  final http.Client _inner = http.Client();

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    request.headers['bypass-tunnel-reminder'] = 'true';
    request.headers['ngrok-skip-browser-warning'] = 'true';
    return _inner.send(request);
  }
}

final httpClient = BypassTunnelClient();
