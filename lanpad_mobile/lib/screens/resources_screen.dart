import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../services/api_service.dart';
import '../models/resource_model.dart';
import '../widgets/aurora_background.dart';
import '../widgets/liquid_glass_card.dart';
import '../widgets/animated_button.dart';
import '../config/theme.dart';

class ResourcesScreen extends StatefulWidget {
  const ResourcesScreen({super.key});

  @override
  State<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends State<ResourcesScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();

  List<Hub> _hubs = [];
  bool _isLoading = false;
  String? _loadError;

  // Selected state path
  Hub? _selectedHub;
  Category? _selectedCategory;
  Topic? _selectedTopic;

  List<ResourceSnippet> _resources = [];
  List<ResourceSnippet> _filteredResources = [];
  String _typeFilter = '';

  @override
  void initState() {
    super.initState();
    _loadHubs();
  }

  void _triggerHaptic() {
    final haptic = AppTheme.hapticLevelNotifier.value;
    if (haptic == 'light') {
      HapticFeedback.lightImpact();
    } else if (haptic == 'medium') {
      HapticFeedback.mediumImpact();
    }
  }

  Future<void> _loadHubs() async {
    if (!mounted) return;
    setState(() { _isLoading = true; _loadError = null; });
    try {
      final list = await _apiService.fetchHubs();
      if (mounted) {
        setState(() {
          _hubs = list;
          _isLoading = false;
          if (list.isEmpty) _loadError = 'No hubs returned from server';
        });
      }
    } catch (e) {
      if (mounted) setState(() { _isLoading = false; _loadError = e.toString(); });
    }
  }

  Future<void> _selectHub(Hub hub) async {
    _triggerHaptic();
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

  void _selectCategory(Category cat) {
    _triggerHaptic();
    setState(() {
      _selectedCategory = cat;
      _selectedTopic = null;
      _filterResources();
    });
  }

  void _selectTopic(Topic topic) {
    _triggerHaptic();
    setState(() {
      _selectedTopic = topic;
      _filterResources();
    });
  }

  void _filterResources() {
    final search = _searchController.text.toLowerCase().trim();
    setState(() {
      _filteredResources = _resources.where((r) {
        final matchCat = _selectedCategory == null || r.category == _selectedCategory!.name;
        final matchTopic = _selectedTopic == null || r.topic == _selectedTopic!.name;
        
        final matchSearch = search.isEmpty ||
            r.title.toLowerCase().contains(search) ||
            r.content.toLowerCase().contains(search);

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
    _triggerHaptic();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppTheme.bgColor,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(color: AppTheme.borderColor),
          ),
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  snippet.title,
                  style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain),
                ),
              ),
              IconButton(
                icon: Icon(Icons.close, color: AppTheme.textMuted, size: 20),
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
                      style: TextStyle(fontSize: 8, color: AppTheme.accentColor, fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (snippet.language != null)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Text(
                        snippet.language!.toUpperCase(),
                        style: TextStyle(fontSize: 8, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
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
                  color: Colors.black.withOpacity(AppTheme.isDark ? 0.6 : 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    snippet.content,
                    style: TextStyle(
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
                _triggerHaptic();
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
                  Icon(LucideIcons.copy, color: Colors.white, size: 16),
                  SizedBox(width: 6),
                  Text('COPY SNIPPET', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            AnimatedButton(
              onTap: () async {
                _triggerHaptic();
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
                color: AppTheme.cardBg,
                border: Border.all(color: AppTheme.borderColor),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.zap, color: AppTheme.accentColor, size: 16),
                  const SizedBox(width: 6),
                  Text('SEND TO LAPTOP', style: TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.bold)),
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
        content: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: isError ? AppTheme.redStatus : AppTheme.accentColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _buildBreadcrumbs() {
    if (_selectedHub == null) return const SizedBox.shrink();

    return Container(
      height: 38,
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      padding: const EdgeInsets.symmetric(horizontal: 12.0),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          GestureDetector(
            onTap: () {
              _triggerHaptic();
              _clearSelection();
            },
            child: Container(
              alignment: Alignment.center,
              child: Text('Catalog', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold)),
            ),
          ),
          _crumbSeparator(),
          GestureDetector(
            onTap: () {
              _triggerHaptic();
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
                color: _selectedCategory == null ? AppTheme.accentGlow.withOpacity(0.2) : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _selectedHub!.title,
                style: TextStyle(fontSize: 10, color: AppTheme.textMain, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          if (_selectedCategory != null) ...[
            _crumbSeparator(),
            GestureDetector(
              onTap: () {
                _triggerHaptic();
                setState(() {
                  _selectedTopic = null;
                  _filterResources();
                });
              },
              child: Container(
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(vertical: 3, horizontal: 8),
                decoration: BoxDecoration(
                  color: _selectedTopic == null ? AppTheme.accentGlow.withOpacity(0.2) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _selectedCategory!.name,
                  style: TextStyle(fontSize: 10, color: AppTheme.accentColor, fontWeight: FontWeight.bold),
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
                borderRadius: BorderRadius.circular(8),
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6.0),
      child: Center(
        child: Text('/', style: TextStyle(color: AppTheme.textMuted.withOpacity(0.3), fontSize: 12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final showBack = _selectedHub != null;

    return Scaffold(
      body: Stack(
        children: [
          const AuroraBackground(),
          
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    children: [
                      if (showBack)
                        IconButton(
                          icon: Icon(LucideIcons.arrow_left, color: AppTheme.accentColor),
                          onPressed: () {
                            _triggerHaptic();
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
                            }
                          },
                        ),
                      Text(
                        'RESOURCE HUB',
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          fontFamily: 'Outfit',
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
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
                        child: Text(
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
                      ? Center(child: CircularProgressIndicator(color: AppTheme.accentColor))
                      : Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (_selectedHub == null)
                                Expanded(child: _buildHubsView())
                              else if (_selectedCategory == null)
                                Expanded(child: _buildCategoriesView())
                              else if (_selectedTopic == null)
                                Expanded(child: _buildTopicsView())
                              else
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
    if (_loadError != null || _hubs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.cloud_off, size: 40, color: AppTheme.textMuted),
            const SizedBox(height: 12),
            Text(
              _loadError != null ? 'Could not load resources' : 'No hubs available',
              style: TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 6),
            Text(
              _loadError ?? 'Make sure the server is running and connected',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: _loadHubs,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 24),
                decoration: BoxDecoration(
                  color: AppTheme.accentColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.accentColor.withOpacity(0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.refresh_cw, size: 14, color: AppTheme.accentColor),
                    const SizedBox(width: 8),
                    Text('Retry', style: TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }
    return ListView.builder(
      itemCount: _hubs.length,
      itemBuilder: (context, index) {
        final hub = _hubs[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: GestureDetector(
            onTap: () => _selectHub(hub),
            child: LiquidGlassCard(
              isFlat: false,
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.accentGlow.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(LucideIcons.compass, color: AppTheme.accentColor, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hub.title,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID: ${hub.id}',
                          style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  Icon(LucideIcons.chevron_right, color: AppTheme.textMuted, size: 20),
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
      return Center(child: Text('No categories found', style: TextStyle(color: AppTheme.textMuted)));
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
          child: LiquidGlassCard(
            isFlat: false,
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.accentColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(LucideIcons.book_open, color: AppTheme.accentColor, size: 16),
                ),
                const SizedBox(height: 8),
                Text(
                  cat.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                ),
                const SizedBox(height: 4),
                Text(
                  '$topicsCount ${topicsCount == 1 ? "Session" : "Sessions"}',
                  style: TextStyle(fontSize: 9, color: AppTheme.textMuted),
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
      return Center(child: Text('No topics found', style: TextStyle(color: AppTheme.textMuted)));
    }
    return ListView.builder(
      itemCount: topics.length,
      itemBuilder: (context, index) {
        final topic = topics[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: GestureDetector(
            onTap: () => _selectTopic(topic),
            child: LiquidGlassCard(
              isFlat: false,
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.accentColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(LucideIcons.calendar, color: AppTheme.accentColor, size: 16),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      topic.title ?? topic.name,
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                    ),
                  ),
                  Icon(LucideIcons.chevron_right, color: AppTheme.textMuted, size: 18),
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
        LiquidGlassCard(
          isFlat: true,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          borderRadius: 12,
          child: TextField(
            controller: _searchController,
            style: TextStyle(color: AppTheme.textMain, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Search snippets...',
              hintStyle: TextStyle(color: AppTheme.textMuted.withOpacity(0.4)),
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
              style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
            ),
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
        // List of snippets
        Expanded(
          child: _filteredResources.isEmpty
              ? Center(child: Text('No snippets matching query', style: TextStyle(color: AppTheme.textMuted)))
              : ListView.builder(
                  padding: const EdgeInsets.only(bottom: 100), // padding to clear bottom navigation bar
                  itemCount: _filteredResources.length,
                  itemBuilder: (context, index) {
                    final snippet = _filteredResources[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: GestureDetector(
                        onTap: () => _showSnippetDetail(snippet),
                        child: LiquidGlassCard(
                          isFlat: false,
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
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                                    ),
                                  ),
                                  Icon(LucideIcons.book_open, size: 14, color: AppTheme.accentColor),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                snippet.content,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppTheme.textMuted),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 4,
                                runSpacing: 4,
                                children: snippet.tags
                                    .take(2)
                                    .map((t) => Container(
                                          padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 6),
                                          decoration: BoxDecoration(
                                            color: AppTheme.cardBg,
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text('#$t', style: TextStyle(fontSize: 8, color: AppTheme.textMuted)),
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
        _triggerHaptic();
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
          style: TextStyle(fontSize: 9, color: active ? AppTheme.textMain : AppTheme.textMuted, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
