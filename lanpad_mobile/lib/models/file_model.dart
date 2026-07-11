class SharedFile {
  final String name;
  final int size;
  final double modified;
  final double? duration;
  final bool inbox;

  SharedFile({
    required this.name,
    required this.size,
    required this.modified,
    this.duration,
    required this.inbox,
  });

  factory SharedFile.fromJson(Map<String, dynamic> json) {
    return SharedFile(
      name: json['name'] ?? '',
      size: json['size'] ?? 0,
      modified: (json['modified'] as num?)?.toDouble() ?? 0.0,
      duration: (json['duration'] as num?)?.toDouble(),
      inbox: json['inbox'] ?? false,
    );
  }
}
