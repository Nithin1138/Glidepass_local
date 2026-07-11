import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../models/resource_model.dart';
import '../widgets/nebula_background.dart';
import '../widgets/glassmorphic_card.dart';
import '../widgets/animated_button.dart';
import '../config/theme.dart';

class ResourcesScreen extends StatefulWidget {
  const ResourcesScreen({super.key});

  @override
  State<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends State<ResourcesScreen> {
  final ApiService _apiService = ApiService();

  List<Hub> _hubs = [];
  List<ResourceSnippet> _resources = [];
  List<ResourceSnippet> _filteredResources = [];

  Hub? _selectedHub;
  Category? _selectedCategory;
  Topic? _selectedTopic;

  final TextEditingController _searchController = TextEditingController();
  String _typeFilter = '';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadHubs();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadHubs() async {
    setState(() => _isLoading = true);
    final list = await _apiService.fetchHubs();
    setState(() {
      _hubs = list;
      _isLoading = false;
    });
  }

  Future<void> _selectHub(Hub hub) async {
    setState(() {
      _selectedHub = hub;
      _selectedCategory = null;
      _selectedTopic = null;
      _isLoading = true;
    });
    final list = await _apiService.fetchResources(hub.id);
    setState(() {
      _resources = list;
      _filteredResources = list;
      _isLoading = false;
    });
  }

  void _selectCategory(Category category) {
    setState(() {
      _selectedCategory = category;
      _selectedTopic = null;
      _filterResources();
    });
  }

  void _selectTopic(Topic topic) {
    setState(() {
      _selectedTopic = topic;
      _filterResources();
    });
  }

  void _filterResources() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredResources = _resources.where((r) {
        final matchCat = _selectedCategory == null ||
            r.category?.toLowerCase() == _selectedCategory!.name.toLowerCase() ||
            r.subCategory?.toLowerCase() == _selectedCategory!.name.toLowerCase();

        final matchTopic = _selectedTopic == null ||
            _selectedTopic!.name == 'All Topics' ||
            r.topic?.toLowerCase() == _selectedTopic!.name.toLowerCase();

        final matchSearch = query.isEmpty ||
            r.title.toLowerCase().contains(query) ||
            r.content.toLowerCase().contains(query) ||
            r.tags.any((t) => t.toLowerCase().contains(query));

        final matchType = _typeFilter.isEmpty || r.type == _typeFilter;

        return matchCat && matchTopic && matchSearch && matchType;
      }).toList();
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedHub = null;
      _selectedCategory = null;
      _selectedTopic = null;
      _resources = [];
      _filteredResources = [];
      _searchController.clear();
      _typeFilter = '';
    });
  }

  void _showSnippetDetail(ResourceSnippet snippet) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0D0D10),
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: AppTheme.borderColor),
          ),
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  snippet.title,
                  style: const TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: AppTheme.textMuted, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Tags Row
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.accentGlow.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.accentColor.withOpacity(0.2)),
                    ),
                    child: Text(
                      snippet.type.toUpperCase(),
                      style: const TextStyle(fontSize: 8, color: AppTheme.accentColor, fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (snippet.language != null)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.04),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Text(
                        snippet.language!.toUpperCase(),
                        style: const TextStyle(fontSize: 8, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              // Code Block
              Container(
                constraints: const BoxConstraints(maxHeight: 250),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    snippet.content,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: AppTheme.textMain,
                      height: 1.4,
                    ),
                  ),
                ),
              ),
            ],
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            AnimatedButton(
              onTap: () {
                Clipboard.setData(ClipboardData(text: snippet.content));
                _apiService.sendResource(snippet.id); // fire metric
                Navigator.of(context).pop();
                _showToast('Copied content to clipboard');
              },
              decoration: BoxDecoration(
                color: AppTheme.accentColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.copy, color: Colors.black, size: 16),
                  SizedBox(width: 6),
                  Text('COPY SNIPPET', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            AnimatedButton(
              onTap: () async {
                final success = await _apiService.receiveResource(snippet.content, snippet.title);
                if (context.mounted) {
                  Navigator.of(context).pop();
                  if (success) {
                    _showToast('Sent to Laptop Command Center');
                  } else {
                    _showToast('Failed to send snippet', isError: true);
                  }
                }
              },
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.06),
                border: Border.all(color: AppTheme.borderColor),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.zap, color: Colors.white, size: 16),
                  SizedBox(width: 6),
                  Text('SEND TO LAPTOP', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppTheme.redStatus : AppTheme.accentColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _buildBreadcrumbs() {
    if (_selectedHub == null) return const SizedBox.shrink();

    return Container(
      height: 38,
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      color: Colors.black.withOpacity(0.4),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          GestureDetector(
            onTap: _clearSelection,
            child: Container(
              alignment: Alignment.center,
              child: const Text('Catalog', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold)),
            ),
          ),
          _crumbSeparator(),
          GestureDetector(
            onTap: () {
              setState(() {
                _selectedCategory = null;
                _selectedTopic = null;
                _filterResources();
              });
            },
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 3, horizontal: 8),
              decoration: BoxDecoration(
                color: _selectedCategory == null ? Colors.white.withOpacity(0.1) : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _selectedHub!.title,
                style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          if (_selectedCategory != null) ...[
            _crumbSeparator(),
            GestureDetector(
              onTap: () {
                setState(() {
                  _selectedTopic = null;
                  _filterResources();
                });
              },
              child: Container(
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(vertical: 3, horizontal: 8),
                decoration: BoxDecoration(
                  color: _selectedTopic == null ? const Color(0x26A855F7) : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _selectedCategory!.name,
                  style: const TextStyle(fontSize: 10, color: Color(0xFFC084FC), fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
          if (_selectedTopic != null) ...[
            _crumbSeparator(),
            Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 3, horizontal: 8),
              decoration: BoxDecoration(
                color: const Color(0x2610B981),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _selectedTopic!.name,
                style: const TextStyle(fontSize: 10, color: Color(0xFF6EE7B7), fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _crumbSeparator() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 6.0),
      child: Center(
        child: Text('/', style: TextStyle(color: Colors.white24, fontSize: 12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NebulaBackground(),
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(LucideIcons.arrowLeft, color: Colors.white70),
                        onPressed: () {
                          if (_selectedTopic != null) {
                            setState(() {
                              _selectedTopic = null;
                              _filterResources();
                            });
                          } else if (_selectedCategory != null) {
                            setState(() {
                              _selectedCategory = null;
                              _filterResources();
                            });
                          } else if (_selectedHub != null) {
                            _clearSelection();
                          } else {
                            Navigator.of(context).pop();
                          }
                        },
                      ),
                      const Text(
                        'RESOURCE PORTAL',
                        style: TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.0,
                          color: AppTheme.accentColor,
                        ),
                      ),
                      const Spacer(),
                      // Portal Badge
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.accentGlow.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.accentColor.withOpacity(0.4)),
                        ),
                        child: const Text(
                          'PORTAL',
                          style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppTheme.accentColor),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Breadcrumbs pill bar
                _buildBreadcrumbs(),
                
                // Main Content View Switcher
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.accentColor))
                      : Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (_selectedHub == null)
                                // Layer 1: Hubs list
                                Expanded(child: _buildHubsView())
                              else if (_selectedCategory == null)
                                // Layer 2: Categories list
                                Expanded(child: _buildCategoriesView())
                              else if (_selectedTopic == null)
                                // Layer 3: Topics list
                                Expanded(child: _buildTopicsView())
                              else
                                // Layer 4: Resources list
                                Expanded(child: _buildSnippetsView()),
                            ],
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // LAYER 1: HUBS VIEW
  Widget _buildHubsView() {
    if (_hubs.isEmpty) {
      return const Center(child: Text('No resource hubs discovered', style: TextStyle(color: AppTheme.textMuted)));
    }
    return ListView.builder(
      itemCount: _hubs.length,
      itemBuilder: (context, index) {
        final hub = _hubs[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: GestureDetector(
            onTap: () => _selectHub(hub),
            child: GlassmorphicCard(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.accentGlow.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(LucideIcons.compass, color: AppTheme.accentColor, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hub.title,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID: ${hub.id}',
                          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const Icon(LucideIcons.chevronRight, color: AppTheme.textMuted, size: 20),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // LAYER 2: CATEGORIES VIEW
  Widget _buildCategoriesView() {
    final categories = _selectedHub?.categories ?? [];
    if (categories.isEmpty) {
      return const Center(child: Text('No categories found', style: TextStyle(color: AppTheme.textMuted)));
    }
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.3,
      ),
      itemCount: categories.length,
      itemBuilder: (context, index) {
        final cat = categories[index];
        final topicsCount = cat.topics.length;
        return GestureDetector(
          onTap: () => _selectCategory(cat),
          child: GlassmorphicCard(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Collection icon
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(LucideIcons.bookOpen, color: Color(0xFFC084FC), size: 16),
                ),
                const SizedBox(height: 8),
                Text(
                  cat.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  '$topicsCount ${topicsCount == 1 ? "Session" : "Sessions"}',
                  style: const TextStyle(fontSize: 9, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // LAYER 3: TOPICS VIEW
  Widget _buildTopicsView() {
    final topics = _selectedCategory?.topics ?? [];
    if (topics.isEmpty) {
      return const Center(child: Text('No topics found', style: TextStyle(color: AppTheme.textMuted)));
    }
    return ListView.builder(
      itemCount: topics.length,
      itemBuilder: (context, index) {
        final topic = topics[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: GestureDetector(
            onTap: () => _selectTopic(topic),
            child: GlassmorphicCard(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.calendar, color: Color(0xFF6EE7B7), size: 16),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      topic.title ?? topic.name,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const Icon(LucideIcons.chevronRight, color: AppTheme.textMuted, size: 18),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // LAYER 4: SNIPPETS VIEW
  Widget _buildSnippetsView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Search bar
        GlassmorphicCard(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          borderRadius: 12,
          child: TextField(
            controller: _searchController,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: const InputDecoration(
              hintText: 'Search snippets...',
              hintStyle: TextStyle(color: Colors.white24),
              prefixIcon: Icon(LucideIcons.search, size: 16, color: AppTheme.textMuted),
              border: InputBorder.none,
            ),
            onChanged: (val) => _filterResources(),
          ),
        ),
        const SizedBox(height: 16),
        // Filter pills / count
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${_filteredResources.length} Snippets found',
              style: const TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
            ),
            // Quick Type filters: All, Code, Text
            Row(
              children: [
                _buildTypeFilterBtn('All', ''),
                const SizedBox(width: 6),
                _buildTypeFilterBtn('Code', 'code'),
                const SizedBox(width: 6),
                _buildTypeFilterBtn('Text', 'txt'),
              ],
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Grid lists of snippets
        Expanded(
          child: _filteredResources.isEmpty
              ? const Center(child: Text('No snippets matching query', style: TextStyle(color: AppTheme.textMuted)))
              : ListView.builder(
                  itemCount: _filteredResources.length,
                  itemBuilder: (context, index) {
                    final snippet = _filteredResources[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: GestureDetector(
                        onTap: () => _showSnippetDetail(snippet),
                        child: GlassmorphicCard(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      'Snippet ${index + 1}: ${snippet.title}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                  ),
                                  const Icon(LucideIcons.bookOpen, size: 14, color: AppTheme.textMuted),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                snippet.content,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppTheme.textMuted),
                              ),
                              const SizedBox(height: 8),
                              // Snippet tags
                              Wrap(
                                spacing: 4,
                                runSpacing: 4,
                                children: snippet.tags
                                    .take(2)
                                    .map((t) => Container(
                                          padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 6),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withOpacity(0.04),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text('#$t', style: const TextStyle(fontSize: 8, color: AppTheme.textMuted)),
                                        ))
                                    .toList(),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildTypeFilterBtn(String title, String filter) {
    final active = _typeFilter == filter;
    return GestureDetector(
      onTap: () {
        setState(() {
          _typeFilter = filter;
          _filterResources();
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 3, horizontal: 8),
        decoration: BoxDecoration(
          color: active ? AppTheme.accentGlow.withOpacity(0.2) : Colors.transparent,
          border: Border.all(color: active ? AppTheme.accentColor : AppTheme.borderColor),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          title,
          style: TextStyle(fontSize: 9, color: active ? Colors.white : AppTheme.textMuted, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
