class HistoryItem {
  final String title;
  final String content;
  final String timestamp;
  final String mode;

  HistoryItem({
    required this.title,
    required this.content,
    required this.timestamp,
    required this.mode,
  });

  factory HistoryItem.fromJson(Map<String, dynamic> json) {
    return HistoryItem(
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      timestamp: json['timestamp'] ?? '',
      mode: json['mode'] ?? '',
    );
  }
}
