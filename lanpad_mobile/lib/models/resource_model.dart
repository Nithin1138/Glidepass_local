class Hub {
  final String id;
  final String title;
  final String visibility;
  final List<Category> categories;

  Hub({
    required this.id,
    required this.title,
    required this.visibility,
    required this.categories,
  });

  factory Hub.fromJson(Map<String, dynamic> json) {
    var catList = json['categories'] as List? ?? [];
    return Hub(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      visibility: json['visibility'] ?? 'public',
      categories: catList.map((c) => Category.fromJson(c)).toList(),
    );
  }
}

class Category {
  final String name;
  final List<Topic> topics;

  Category({
    required this.name,
    required this.topics,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    var topicList = json['topics'] as List? ?? [];
    return Category(
      name: json['name'] ?? '',
      topics: topicList.map((t) => Topic.fromJson(t)).toList(),
    );
  }
}

class Topic {
  final String name;
  final String? title;

  Topic({
    required this.name,
    this.title,
  });

  factory Topic.fromJson(Map<String, dynamic> json) {
    return Topic(
      name: json['name'] ?? '',
      title: json['title'],
    );
  }
}

class ResourceSnippet {
  final String id;
  final String title;
  final String content;
  final String? language;
  final String type;
  final String? category;
  final String? subCategory;
  final String? topic;
  final List<String> tags;

  ResourceSnippet({
    required this.id,
    required this.title,
    required this.content,
    this.language,
    required this.type,
    this.category,
    this.subCategory,
    this.topic,
    required this.tags,
  });

  factory ResourceSnippet.fromJson(Map<String, dynamic> json) {
    var tagsList = json['tags'] as List? ?? [];
    return ResourceSnippet(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      language: json['language'],
      type: json['type'] ?? 'TXT',
      category: json['category'],
      subCategory: json['subCategory'],
      topic: json['topic'],
      tags: tagsList.map((t) => t.toString()).toList(),
    );
  }
}
