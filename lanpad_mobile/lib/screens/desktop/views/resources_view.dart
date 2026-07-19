import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';
import '../widgets/sidebar.dart';
import '../../../models/resource_model.dart';
import '../../../config/theme.dart';

/// Hubs & Resources view — matches the web client's 4-step conduit flow.
/// Designed with premium fixed-size rectangular cards in Wrap layouts aligned strictly to top-left.
class ResourcesView extends StatefulWidget {
  final DesktopState state;
  final TextEditingController searchController;
  final Category? selectedCategory;
  final Topic? selectedTopic;
  final ValueChanged<Category?>? onCategoryChanged;
  final ValueChanged<Topic?>? onTopicChanged;
  final ValueChanged<DesktopView>? onNavigate;
  final ValueChanged<String>? onNavigateToInput;

  const ResourcesView({
    super.key,
    required this.state,
    required this.searchController,
    this.selectedCategory,
    this.selectedTopic,
    this.onCategoryChanged,
    this.onTopicChanged,
    this.onNavigate,
    this.onNavigateToInput,
  });

  @override
  State<ResourcesView> createState() => _ResourcesViewState();
}

class _ResourcesViewState extends State<ResourcesView> {
  Category? _selectedCategory;
  Topic? _selectedTopic;
  String? _copiedId;
  final Set<String> _expandedResIds = {};

  List<Hub> _localHubs = [];
  List<ResourceSnippet> _localResources = [];

  // Safe local mutation state to avoid mutating global final lists directly
  final Map<String, List<Category>> _customCategories = {};
  final Map<String, List<Topic>> _customTopics = {};

  bool _loadingLocal = true;

  @override
  void initState() {
    super.initState();
    _loadLocalData();
    _selectedCategory = widget.selectedCategory;
    _selectedTopic = widget.selectedTopic;
  }

  @override
  void didUpdateWidget(covariant ResourcesView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedCategory != oldWidget.selectedCategory) {
      setState(() => _selectedCategory = widget.selectedCategory);
    }
    if (widget.selectedTopic != oldWidget.selectedTopic) {
      setState(() => _selectedTopic = widget.selectedTopic);
    }
  }

  Future<void> _loadLocalData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final hubsJson = prefs.getString('lanpad_local_hubs');
      final resJson = prefs.getString('lanpad_local_resources');
      final customCatsJson = prefs.getString('lanpad_custom_categories');
      final customTopicsJson = prefs.getString('lanpad_custom_topics');

      setState(() {
        if (hubsJson != null) {
          final List decoded = jsonDecode(hubsJson);
          _localHubs = decoded.map((h) => Hub.fromJson(h)).toList();
        }
        if (resJson != null) {
          final List decoded = jsonDecode(resJson);
          _localResources = decoded.map((r) => ResourceSnippet.fromJson(r)).toList();
        }
        if (customCatsJson != null) {
          final Map<String, dynamic> decoded = jsonDecode(customCatsJson);
          decoded.forEach((key, val) {
            final List catsList = val;
            _customCategories[key] = catsList.map((c) => Category.fromJson(c)).toList();
          });
        }
        if (customTopicsJson != null) {
          final Map<String, dynamic> decoded = jsonDecode(customTopicsJson);
          decoded.forEach((key, val) {
            final List topicsList = val;
            _customTopics[key] = topicsList.map((t) => Topic.fromJson(t)).toList();
          });
        }
        _loadingLocal = false;
      });
    } catch (e) {
      debugPrint('Failed to load local hubs/resources: $e');
      setState(() => _loadingLocal = false);
    }
  }

  Future<void> _saveLocalData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final hubsSerialized = _localHubs.map((h) => {
        'id': h.id,
        'title': h.title,
        'visibility': h.visibility,
        'categories': h.categories.map((c) => {
          'name': c.name,
          'topics': c.topics.map((t) => {
            'name': t.name,
            'title': t.title,
          }).toList(),
        }).toList(),
      }).toList();

      final resSerialized = _localResources.map((r) => {
        'id': r.id,
        'title': r.title,
        'content': r.content,
        'language': r.language,
        'type': r.type,
        'category': r.category,
        'subCategory': r.subCategory,
        'topic': r.topic,
        'tags': r.tags,
      }).toList();

      final Map<String, dynamic> customCatsSerialized = {};
      _customCategories.forEach((key, value) {
        customCatsSerialized[key] = value.map((c) => {
          'name': c.name,
          'topics': c.topics.map((t) => {
            'name': t.name,
            'title': t.title,
          }).toList(),
        }).toList();
      });

      final Map<String, dynamic> customTopicsSerialized = {};
      _customTopics.forEach((key, value) {
        customTopicsSerialized[key] = value.map((t) => {
          'name': t.name,
          'title': t.title,
        }).toList();
      });

      await prefs.setString('lanpad_local_hubs', jsonEncode(hubsSerialized));
      await prefs.setString('lanpad_local_resources', jsonEncode(resSerialized));
      await prefs.setString('lanpad_custom_categories', jsonEncode(customCatsSerialized));
      await prefs.setString('lanpad_custom_topics', jsonEncode(customTopicsSerialized));
    } catch (e) {
      debugPrint('Failed to save local hubs/resources: $e');
    }
  }

  void _resetFlow() {
    setState(() {
      _selectedCategory = null;
      _selectedTopic = null;
      _expandedResIds.clear();
    });
    widget.onCategoryChanged?.call(null);
    widget.onTopicChanged?.call(null);
  }

  void _goBack() {
    setState(() {
      if (_selectedTopic != null) {
        _selectedTopic = null;
        widget.onTopicChanged?.call(null);
      } else if (_selectedCategory != null) {
        _selectedCategory = null;
        widget.onCategoryChanged?.call(null);
      } else {
        widget.state.onSelectHub(null);
      }
      _expandedResIds.clear();
    });
  }

  Future<void> _handleCopy(ResourceSnippet res) async {
    if (res.type == 'file') {
      if (Platform.isMacOS) {
        try {
          final result = await Process.run('osascript', [
            '-e',
            'set the clipboard to (POSIX file "${res.content}")',
          ]);
          if (result.exitCode == 0) {
            setState(() {
              _copiedId = res.id;
            });
            Future.delayed(const Duration(seconds: 2), () {
              if (mounted) {
                setState(() {
                  _copiedId = null;
                });
              }
            });
            widget.state.onShowToast('Copied file to clipboard!');
            return;
          }
        } catch (_) {}
      }
    }

    await Clipboard.setData(ClipboardData(text: res.content));
    setState(() {
      _copiedId = res.id;
    });
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _copiedId = null;
        });
      }
    });
    widget.state.onShowToast('Copied to clipboard!');
  }

  void _handleSend(ResourceSnippet res) {
    if (res.type == 'file') {
      widget.state.onUploadFileDirect?.call(res.content);
      widget.onNavigate?.call(DesktopView.files);
      return;
    }
    if (widget.onNavigateToInput != null) {
      widget.onNavigateToInput!(res.content);
    } else {
      // Fallback direct send
      widget.state.apiService.sendPaste(
        text: res.content,
        mode: 'flash',
        wpm: 240,
        isCoding: true,
        language: res.language ?? '',
      ).then((_) {
        widget.state.onShowToast('Sent resource content to target!');
      }).catchError((e) {
        widget.state.onShowToast('Failed to send: $e', isError: true);
      });
    }
  }

  void _showReadingModeDialog(ResourceSnippet res) {
    final isFile = res.type == 'file';
    final isImg = isFile && ['png', 'jpg', 'jpeg', 'gif', 'webp'].contains(res.language?.toLowerCase());
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog.fullscreen(
        backgroundColor: Colors.black, // pure black distraction-free background
        child: Stack(
          children: [
            // Preview content taking up the full screen space
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(48, 64, 48, 48),
                child: isImg
                    ? InteractiveViewer(
                        maxScale: 4.0,
                        child: Center(
                          child: Image.file(
                            File(res.content),
                            fit: BoxFit.contain,
                            errorBuilder: (context, err, stack) => Center(
                              child: Text(
                                'Image not found\n${res.content}',
                                style: GoogleFonts.inter(color: Colors.redAccent, fontSize: 14),
                              ),
                            ),
                          ),
                        ),
                      )
                    : (isFile
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  res.language?.toLowerCase() == 'psd'
                                      ? LucideIcons.layers
                                      : (['doc', 'docx'].contains(res.language?.toLowerCase())
                                          ? LucideIcons.file_text
                                          : LucideIcons.file),
                                  size: 80,
                                  color: kPrimary,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  res.content.replaceAll('\\', '/').split('/').last,
                                  style: GoogleFonts.inter(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  res.content,
                                  style: GoogleFonts.inter(fontSize: 12, color: Colors.white70),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 24),
                                ElevatedButton.icon(
                                  onPressed: () async {
                                    final file = File(res.content);
                                    if (await file.exists()) {
                                      await launchUrl(Uri.file(file.absolute.path));
                                    }
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: kPrimary,
                                    foregroundColor: kSurface,
                                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                  ),
                                  icon: const Icon(LucideIcons.external_link, size: 16),
                                  label: Text('Open Local File', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          )
                        : SingleChildScrollView(
                            child: Text(
                              res.content,
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 15,
                                color: const Color(0xFFa5d6ff),
                                height: 1.6,
                              ),
                            ),
                          )),
              ),
            ),
            
            // Minimalist Close Button in top right
            Positioned(
              top: 24,
              right: 24,
              child: IconButton(
                icon: const Icon(LucideIcons.x, size: 24, color: Colors.white70),
                hoverColor: Colors.white10,
                tooltip: 'Close Preview',
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchGlobalHub() async {
    final url = Uri.parse('https://lanpad.app/provider');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      widget.state.onShowToast('Could not launch website link.', isError: true);
    }
  }

  InputDecoration _inputDecoration(String hint, {bool isCode = false}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant.withValues(alpha: 0.5)),
      filled: true,
      fillColor: Colors.black.withValues(alpha: 0.2),
      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: isCode ? 14 : 10),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: kOutlineVariant.withValues(alpha: 0.5)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: kPrimary, width: 1.5),
      ),
    );
  }

  Widget _buildField({required String label, required Widget child}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: kOnSurfaceVariant.withValues(alpha: 0.7),
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }

  // ── Local CRUD dialogs ──────────────────────────────────────────────
  void _showCreateHubDialog() {
    final idController = TextEditingController();
    final titleController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: kSurfaceContainer,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: kOutlineVariant.withValues(alpha: 0.5)),
        ),
        title: Text('Create Local Hub', style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold, fontSize: 18)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildField(
              label: 'Hub ID',
              child: TextField(
                controller: idController,
                style: GoogleFonts.inter(color: kOnSurface, fontSize: 13),
                decoration: _inputDecoration('e.g. my-snippets'),
              ),
            ),
            const SizedBox(height: 16),
            _buildField(
              label: 'Hub Title',
              child: TextField(
                controller: titleController,
                style: GoogleFonts.inter(color: kOnSurface, fontSize: 13),
                decoration: _inputDecoration('e.g. My Snippets'),
              ),
            ),
          ],
        ),
        actions: [
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: kOutlineVariant),
              foregroundColor: kOnSurface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 4),
          ElevatedButton(
            onPressed: () {
              final id = idController.text.trim();
              final title = titleController.text.trim();
              if (id.isEmpty || title.isEmpty) return;

              setState(() {
                _localHubs.add(Hub(id: id, title: title, visibility: 'local', categories: []));
              });
              _saveLocalData();
              Navigator.pop(context);
              widget.state.onShowToast('Local Hub created!');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: kSurfaceLowest,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              elevation: 0,
            ),
            child: Text('Create Hub', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  void _showCreateCollectionDialog(Hub hub) {
    final nameController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: kSurfaceContainer,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: kOutlineVariant.withValues(alpha: 0.5)),
        ),
        title: Text('Create Collection', style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold, fontSize: 18)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildField(
              label: 'Collection Name',
              child: TextField(
                controller: nameController,
                style: GoogleFonts.inter(color: kOnSurface, fontSize: 13),
                decoration: _inputDecoration('e.g. Python Helpers'),
              ),
            ),
          ],
        ),
        actions: [
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: kOutlineVariant),
              foregroundColor: kOnSurface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 4),
          ElevatedButton(
            onPressed: () {
              final name = nameController.text.trim();
              if (name.isEmpty) return;

              setState(() {
                final list = _customCategories[hub.id] ?? [];
                list.add(Category(name: name, topics: []));
                _customCategories[hub.id] = list;
              });
              _saveLocalData();
              Navigator.pop(context);
              widget.state.onShowToast('Collection created!');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: kSurfaceLowest,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              elevation: 0,
            ),
            child: Text('Create Collection', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  void _showCreateTopicDialog(Category cat) {
    final nameController = TextEditingController();
    final hubId = widget.state.selectedHub?.id ?? '';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: kSurfaceContainer,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: kOutlineVariant.withValues(alpha: 0.5)),
        ),
        title: Text('Create Topic', style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold, fontSize: 18)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildField(
              label: 'Topic Title / Date',
              child: TextField(
                controller: nameController,
                style: GoogleFonts.inter(color: kOnSurface, fontSize: 13),
                decoration: _inputDecoration('e.g. 2026-07-18'),
              ),
            ),
          ],
        ),
        actions: [
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: kOutlineVariant),
              foregroundColor: kOnSurface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 4),
          ElevatedButton(
            onPressed: () {
              final name = nameController.text.trim();
              if (name.isEmpty) return;

              setState(() {
                final key = '$hubId-${cat.name}';
                final list = _customTopics[key] ?? [];
                list.add(Topic(name: name, title: name));
                _customTopics[key] = list;
              });
              _saveLocalData();
              Navigator.pop(context);
              widget.state.onShowToast('Topic created!');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: kSurfaceLowest,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              elevation: 0,
            ),
            child: Text('Create Topic', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  void _showCreateResourceDialog() {
    final selectedHub = widget.state.selectedHub;
    if (selectedHub == null) return;

    final titleController = TextEditingController();
    final contentController = TextEditingController();

    // Determine current Collection/Topic context or fallback
    final localCats = _customCategories[selectedHub.id] ?? [];
    final allCats = [...selectedHub.categories, ...localCats];
    String? selectedCategoryName = _selectedCategory?.name ?? (allCats.isNotEmpty ? allCats.first.name : null);

    // Get topics list for the preselected or first category
    List<Topic> getTopicsForCat(String? catName) {
      if (catName == null) return [];
      final matchedCat = allCats.firstWhere((c) => c.name == catName, orElse: () => Category(name: catName, topics: []));
      final localTopics = _customTopics['${selectedHub.id}-$catName'] ?? [];
      return [...matchedCat.topics, ...localTopics];
    }

    List<Topic> currentTopics = getTopicsForCat(selectedCategoryName);
    String? selectedTopicName = _selectedTopic?.name ?? (currentTopics.isNotEmpty ? currentTopics.first.name : null);

    final languages = [
      'None (Plain Text)',
      'python',
      'javascript',
      'typescript',
      'dart',
      'go',
      'rust',
      'java',
      'cpp',
      'c',
      'csharp',
      'ruby',
      'swift',
      'kotlin',
      'html',
      'css',
      'sql',
      'shell',
      'json',
      'yaml',
      'xml',
      'markdown',
    ];
    String selectedLanguage = 'None (Plain Text)';
    String? uploadedFilePath;
    String? uploadedFileExtension;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: kSurfaceContainer,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: kOutlineVariant.withValues(alpha: 0.5)),
          ),
          title: Text('Create Resource Snippet', style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold, fontSize: 18)),
          content: SizedBox(
            width: 480,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildField(
                    label: 'Snippet Title',
                    child: TextField(
                      controller: titleController,
                      style: GoogleFonts.inter(color: kOnSurface, fontSize: 13),
                      decoration: _inputDecoration('e.g. Regex Matcher'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // File attachment field
                  _buildField(
                    label: 'Attach Local File (Optional)',
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: kOutlineVariant.withValues(alpha: 0.5)),
                            ),
                            child: Text(
                              uploadedFilePath != null
                                  ? uploadedFilePath!.replaceAll('\\', '/').split('/').last
                                  : 'No file attached',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: uploadedFilePath != null ? kOnSurface : kOnSurfaceVariant.withValues(alpha: 0.5),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          onPressed: () async {
                            final result = await FilePicker.platform.pickFiles(
                              type: FileType.custom,
                              allowedExtensions: ['psd', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'],
                            );
                            if (result != null && result.files.single.path != null) {
                              final path = result.files.single.path!;
                              final name = result.files.single.name;
                              final ext = name.split('.').last.toLowerCase();
                              setDialogState(() {
                                uploadedFilePath = path;
                                uploadedFileExtension = ext;
                                if (titleController.text.isEmpty) {
                                  titleController.text = name;
                                }
                                contentController.text = path;
                              });
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kPrimary.withValues(alpha: 0.12),
                            foregroundColor: kPrimary,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(LucideIcons.paperclip, size: 14),
                          label: Text('Browse', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Collection selector (if not preselected)
                  if (_selectedCategory == null) ...[
                    _buildField(
                      label: 'Collection',
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: kOutlineVariant.withValues(alpha: 0.5)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedCategoryName,
                            isExpanded: true,
                            dropdownColor: kSurfaceContainer,
                            items: allCats.map((c) {
                              return DropdownMenuItem<String>(
                                value: c.name,
                                child: Text(c.name, style: GoogleFonts.inter(fontSize: 13, color: kOnSurface)),
                              );
                            }).toList(),
                            onChanged: (val) {
                              setDialogState(() {
                                selectedCategoryName = val;
                                currentTopics = getTopicsForCat(val);
                                selectedTopicName = currentTopics.isNotEmpty ? currentTopics.first.name : null;
                              });
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Topic selector (if not preselected)
                  if (_selectedTopic == null || _selectedTopic!.name == 'All Topics') ...[
                    _buildField(
                      label: 'Topic',
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: kOutlineVariant.withValues(alpha: 0.5)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedTopicName,
                            isExpanded: true,
                            dropdownColor: kSurfaceContainer,
                            items: currentTopics.map((t) {
                              return DropdownMenuItem<String>(
                                value: t.name,
                                child: Text(t.title ?? t.name, style: GoogleFonts.inter(fontSize: 13, color: kOnSurface)),
                              );
                            }).toList(),
                            onChanged: (val) {
                              setDialogState(() {
                                selectedTopicName = val;
                              });
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Only show language selection if no file is attached
                  if (uploadedFilePath == null) ...[
                    _buildField(
                      label: 'Language Tag',
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: kOutlineVariant.withValues(alpha: 0.5)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedLanguage,
                            isExpanded: true,
                            dropdownColor: kSurfaceContainer,
                            items: languages.map((lang) {
                              return DropdownMenuItem<String>(
                                value: lang,
                                child: Text(
                                  lang == 'None (Plain Text)' ? lang : lang.toUpperCase(),
                                  style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setDialogState(() {
                                  selectedLanguage = val;
                                });
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  _buildField(
                    label: uploadedFilePath != null ? 'Attached File Path' : 'Snippet Content',
                    child: TextField(
                      controller: contentController,
                      style: GoogleFonts.jetBrainsMono(color: kOnSurface, fontSize: 13),
                      maxLines: uploadedFilePath != null ? 2 : 8,
                      enabled: uploadedFilePath == null, // Lock it if a file is attached
                      decoration: _inputDecoration(
                        uploadedFilePath != null ? 'File path loaded' : 'Paste code snippet here...',
                        isCode: true,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: kOutlineVariant),
                foregroundColor: kOnSurface,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(width: 4),
            ElevatedButton(
              onPressed: () {
                final title = titleController.text.trim();
                final lang = uploadedFilePath != null
                    ? uploadedFileExtension
                    : (selectedLanguage == 'None (Plain Text)' ? '' : selectedLanguage);
                final content = contentController.text.trim();
                if (title.isEmpty || content.isEmpty) return;

                final snippet = ResourceSnippet(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  title: title,
                  content: content,
                  language: lang!.isEmpty ? null : lang,
                  type: uploadedFilePath != null ? 'file' : 'code',
                  category: selectedCategoryName,
                  subCategory: selectedCategoryName,
                  topic: selectedTopicName,
                  tags: lang.isEmpty ? [] : [lang],
                );

                setState(() {
                  _localResources.add(snippet);
                });
                _saveLocalData();
                Navigator.pop(context);
                widget.state.onShowToast(uploadedFilePath != null ? 'File resource linked!' : 'Resource snippet created!');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
                foregroundColor: kSurfaceLowest,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                elevation: 0,
              ),
              child: Text(uploadedFilePath != null ? 'Add File' : 'Create Snippet', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  // Delete methods
  void _deleteLocalHub(Hub hub) {
    setState(() {
      _localHubs.removeWhere((h) => h.id == hub.id);
      _customCategories.remove(hub.id);
      _localResources.removeWhere((r) => r.category == hub.id || r.subCategory == hub.id);
    });
    _saveLocalData();
    widget.state.onShowToast('Local Hub deleted.');
  }

  void _deleteCollection(Hub hub, Category cat) {
    setState(() {
      final list = _customCategories[hub.id] ?? [];
      list.removeWhere((c) => c.name == cat.name);
      _customCategories[hub.id] = list;
      _localResources.removeWhere((r) => r.category == cat.name || r.subCategory == cat.name);
    });
    _saveLocalData();
    widget.state.onShowToast('Collection deleted.');
  }

  void _deleteTopic(Hub hub, Category cat, Topic topic) {
    setState(() {
      final key = '${hub.id}-${cat.name}';
      final list = _customTopics[key] ?? [];
      list.removeWhere((t) => t.name == topic.name);
      _customTopics[key] = list;
      _localResources.removeWhere((r) => r.topic == topic.name);
    });
    _saveLocalData();
    widget.state.onShowToast('Topic deleted.');
  }

  void _deleteResource(ResourceSnippet res) {
    setState(() {
      _localResources.removeWhere((r) => r.id == res.id);
    });
    _saveLocalData();
    widget.state.onShowToast('Resource deleted.');
  }

  bool _isHubLocal(Hub hub) {
    return hub.visibility == 'local' || _localHubs.any((lh) => lh.id == hub.id);
  }

  @override
  Widget build(BuildContext context) {
    final isRunning = widget.state.serverService.isRunning;
    final selectedHub = widget.state.selectedHub;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Top Bar with Breadcrumbs ─────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
          ),
          child: Row(
            children: [
              if (selectedHub == null) ...[
                Text(
                  'Hubs & Resources',
                  style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface),
                ),
                const SizedBox(width: 16),
                // Create local hub button
                TextButton.icon(
                  onPressed: _showCreateHubDialog,
                  style: TextButton.styleFrom(foregroundColor: kPrimary),
                  icon: const Icon(LucideIcons.folder_plus, size: 14),
                  label: Text('Create Local Hub', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 8),
                // Global hub redirect button
                TextButton.icon(
                  onPressed: _launchGlobalHub,
                  style: TextButton.styleFrom(foregroundColor: kOnSurfaceVariant),
                  icon: const Icon(LucideIcons.globe, size: 14),
                  label: Text('Global Hub', style: GoogleFonts.inter(fontSize: 12)),
                ),
              ] else ...[
                // Back Button
                IconButton(
                  onPressed: _goBack,
                  icon: const Icon(LucideIcons.arrow_left, size: 16),
                  splashRadius: 20,
                  tooltip: 'Back',
                ),
                const SizedBox(width: 8),
                // Breadcrumbs trail
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _breadcrumbPill(
                          label: 'Hubs',
                          onTap: () {
                            widget.state.onSelectHub(null);
                            _resetFlow();
                          },
                        ),
                        _breadcrumbSeparator(),
                        _breadcrumbPill(
                          label: selectedHub.title,
                          active: _selectedCategory == null,
                          onTap: _resetFlow,
                        ),
                        if (_selectedCategory != null) ...[
                          _breadcrumbSeparator(),
                          _breadcrumbPill(
                            label: _selectedCategory!.name,
                            active: _selectedTopic == null,
                            onTap: () => setState(() {
                              _selectedTopic = null;
                              _expandedResIds.clear();
                            }),
                          ),
                        ],
                        if (_selectedTopic != null) ...[
                          _breadcrumbSeparator(),
                          _breadcrumbPill(
                            label: _selectedTopic!.name,
                            active: true,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                // Add resource & collection/topic buttons visible at appropriate stages once selectedHub is local
                if (_isHubLocal(selectedHub)) ...[
                  if (_selectedCategory == null) ...[
                    // Listing Collections -> show Add Collection
                    OutlinedButton.icon(
                      onPressed: () => _showCreateCollectionDialog(selectedHub),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: kOutlineVariant),
                        foregroundColor: kOnSurface,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      icon: const Icon(LucideIcons.folder_plus, size: 14),
                      label: Text('Add Collection', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 8),
                  ] else if (_selectedTopic == null) ...[
                    // Listing Topics -> show Add Topic
                    OutlinedButton.icon(
                      onPressed: () => _showCreateTopicDialog(_selectedCategory!),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: kOutlineVariant),
                        foregroundColor: kOnSurface,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      icon: const Icon(LucideIcons.plus, size: 14),
                      label: Text('Add Topic', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 8),
                  ],
                  ElevatedButton.icon(
                    onPressed: _showCreateResourceDialog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: kPrimary,
                      foregroundColor: kSurface,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    icon: const Icon(LucideIcons.plus, size: 14),
                    label: Text('Add Resource', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 12),
                ],
                if (_selectedCategory != null && _selectedTopic != null)
                  SizedBox(
                    width: 200,
                    height: 36,
                    child: TextField(
                      controller: widget.searchController,
                      onChanged: widget.state.onFilterHubResources,
                      style: GoogleFonts.inter(fontSize: 12, color: kOnSurface),
                      decoration: kSearchDecoration('Search...'),
                    ),
                  ),
              ],
            ],
          ),
        ),

        // ── Content area ─────────────────────────────────────────────
        Expanded(
          child: isRunning
              ? _buildFlowContent()
              : _OfflinePrompt(onStart: widget.state.onToggleServer),
        ),
      ],
    );
  }

  Widget _breadcrumbPill({required String label, bool active = false, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? kPrimary.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? kPrimary.withValues(alpha: 0.25) : Colors.transparent,
            width: 1,
          ),
        ),
        child: Text(
          label.length > 20 ? '${label.substring(0, 20)}…' : label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: active ? kPrimary : kOnSurfaceVariant,
          ),
        ),
      ),
    );
  }

  Widget _breadcrumbSeparator() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      child: Icon(
        LucideIcons.chevron_right,
        size: 12,
        color: kOutlineVariant,
      ),
    );
  }

  Widget _buildFlowContent() {
    final selectedHub = widget.state.selectedHub;

    if (selectedHub == null) {
      // ── Step 1: Catalog view
      return _buildHubsCatalog();
    }

    if (_selectedCategory == null) {
      // ── Step 2: Category selection
      return _buildCategoriesSelector(selectedHub);
    }

    if (_selectedTopic == null) {
      // ── Step 3: Topic selection
      return _buildTopicsSelector(_selectedCategory!, selectedHub);
    }

    // ── Step 4: Collapsible resource list
    return _buildResourcesList(selectedHub);
  }

  Widget _buildHubsCatalog() {
    final allHubs = [...widget.state.hubs, ..._localHubs];

    if (widget.state.loadingHubs || _loadingLocal) {
      return Center(child: CircularProgressIndicator(color: kPrimary));
    }
    if (allHubs.isEmpty) {
      return const _Empty(icon: LucideIcons.book, message: 'No hubs available');
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Align(
        alignment: Alignment.topLeft,
        child: Wrap(
          spacing: 16,
          runSpacing: 16,
          alignment: WrapAlignment.start,
          crossAxisAlignment: WrapCrossAlignment.start,
          children: allHubs.map((hub) {
            final isLocal = _isHubLocal(hub);
            return SizedBox(
              width: 260,
              height: 130,
              child: Stack(
                children: [
                  GestureDetector(
                    onTap: () {
                      widget.state.onSelectHub(hub);
                      _resetFlow();
                    },
                    child: Container(
                      width: double.infinity,
                      height: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: kGlassCard,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                isLocal ? LucideIcons.folder : LucideIcons.layers,
                                size: 18,
                                color: isLocal ? const Color(0xFF10B981) : kPrimary,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  hub.title,
                                  style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            isLocal ? 'Local Storage Hub' : 'ID: ${hub.id}',
                            style: GoogleFonts.robotoMono(
                              fontSize: 10,
                              color: isLocal ? const Color(0xFF10B981) : kOnSurfaceVariant,
                            ),
                          ),
                          const Spacer(),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(
                                'Explore',
                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: kPrimary),
                              ),
                              const SizedBox(width: 4),
                              Icon(LucideIcons.arrow_right, size: 12, color: kPrimary),
                            ],
                          )
                        ],
                      ),
                    ),
                  ),
                  if (isLocal)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: IconButton(
                        icon: const Icon(LucideIcons.trash_2, size: 14, color: Colors.redAccent),
                        splashRadius: 16,
                        onPressed: () => _deleteLocalHub(hub),
                      ),
                    ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCategoriesSelector(Hub hub) {
    final isLocal = _isHubLocal(hub);
    final localCats = _customCategories[hub.id] ?? [];
    final allCats = [...hub.categories, ...localCats];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Align(
        alignment: Alignment.topLeft,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            allCats.isEmpty
                ? const _Empty(icon: LucideIcons.folder, message: 'No collections in this hub yet.')
                : Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    alignment: WrapAlignment.start,
                    crossAxisAlignment: WrapCrossAlignment.start,
                    children: allCats.map((cat) {
                      final localTopics = _customTopics['${hub.id}-${cat.name}'] ?? [];
                      final totalTopicsCount = cat.topics.length + localTopics.length;
                      return SizedBox(
                        width: 240,
                        height: 120,
                        child: Stack(
                          children: [
                            GestureDetector(
                              onTap: () {
                                setState(() => _selectedCategory = cat);
                                widget.onCategoryChanged?.call(cat);
                              },
                              child: Container(
                                width: double.infinity,
                                height: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: kGlassCard,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(LucideIcons.folder, size: 18, color: kPrimary),
                                    const SizedBox(height: 10),
                                    Text(
                                      cat.name,
                                      style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const Spacer(),
                                    Text(
                                      '$totalTopicsCount topics available',
                                      style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (isLocal)
                              Positioned(
                                top: 8,
                                right: 8,
                                child: IconButton(
                                  icon: const Icon(LucideIcons.trash_2, size: 14, color: Colors.redAccent),
                                  splashRadius: 16,
                                  onPressed: () => _deleteCollection(hub, cat),
                                ),
                              ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopicsSelector(Category cat, Hub hub) {
    final isLocal = _isHubLocal(hub);
    final localTopics = _customTopics['${hub.id}-${cat.name}'] ?? [];
    final allTopics = [...cat.topics, ...localTopics];
    // Add "All Topics" virtual option
    final topicsList = [Topic(name: 'All Topics'), ...allTopics];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Align(
        alignment: Alignment.topLeft,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 14,
              runSpacing: 14,
              alignment: WrapAlignment.start,
              crossAxisAlignment: WrapCrossAlignment.start,
              children: topicsList.map((t) {
                final isAll = t.name == 'All Topics';
                return SizedBox(
                  width: 220,
                  height: 100,
                  child: Stack(
                    children: [
                      GestureDetector(
                        onTap: () {
                          setState(() => _selectedTopic = t);
                          widget.onTopicChanged?.call(t);
                        },
                        child: Container(
                          width: double.infinity,
                          height: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: isAll
                              ? BoxDecoration(
                                  color: kPrimary.withValues(alpha: 0.04),
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(color: kPrimary.withValues(alpha: 0.3), width: 1.5, style: BorderStyle.solid),
                                )
                              : kGlassCard,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(isAll ? LucideIcons.check : LucideIcons.book_open, size: 16, color: kPrimary),
                              const SizedBox(height: 8),
                              Text(
                                isAll ? 'All Topics' : (t.title ?? t.name),
                                style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: kOnSurface),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (isLocal && !isAll)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: IconButton(
                            icon: const Icon(LucideIcons.trash_2, size: 14, color: Colors.redAccent),
                            splashRadius: 16,
                            onPressed: () => _deleteTopic(hub, cat, t),
                          ),
                        ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResourcesList(Hub hub) {
    final isLocal = _isHubLocal(hub);
    final unfiltered = isLocal ? _localResources : widget.state.filteredResources;
    final catName = _selectedCategory!.name.toLowerCase();
    final topicName = _selectedTopic!.name.toLowerCase();

    final filtered = unfiltered.where((r) {
      final matchesCategory = r.category?.toLowerCase() == catName || r.subCategory?.toLowerCase() == catName;
      final matchesTopic = topicName == 'all topics' ? true : r.topic?.toLowerCase() == topicName;
      return matchesCategory && matchesTopic;
    }).toList();

    if (filtered.isEmpty) {
      return const _Empty(icon: LucideIcons.folder_open, message: 'No resources matching filters');
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final double spacing = 16.0;
        final double sidePadding = 24.0;
        final double availableWidth = constraints.maxWidth - (sidePadding * 2);
        final double expandedWidth = (availableWidth - spacing) / 2;
        final double finalExpandedWidth = expandedWidth < 480 ? availableWidth : expandedWidth;

        return SingleChildScrollView(
          padding: EdgeInsets.all(sidePadding),
          child: Align(
            alignment: Alignment.topLeft,
            child: Wrap(
              spacing: spacing,
              runSpacing: spacing,
              alignment: WrapAlignment.start,
              crossAxisAlignment: WrapCrossAlignment.start,
              children: filtered.map((res) {
                final isExpanded = _expandedResIds.contains(res.id);
                final isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].contains(res.language?.toLowerCase());
                final double cardWidth = isExpanded ? finalExpandedWidth : 320.0;

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      if (isExpanded) {
                        _expandedResIds.remove(res.id);
                      } else {
                        _expandedResIds.add(res.id);
                      }
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: cardWidth,
                    height: isExpanded ? 390 : 190,
                    decoration: kGlassCard,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header Row
                      Row(
                        children: [
                          Icon(
                            res.type == 'file'
                                ? (isImg ? LucideIcons.file_image : LucideIcons.file)
                                : LucideIcons.file_code,
                            size: 16,
                            color: kPrimary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              res.title,
                              style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: kOnSurface),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Actions row inside card
                          if (res.type == 'file') ...[
                            if (isExpanded) ...[
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                icon: Icon(LucideIcons.external_link, size: 14, color: kPrimary),
                                tooltip: 'Open Local File',
                                onPressed: () async {
                                  final file = File(res.content);
                                  if (await file.exists()) {
                                    try {
                                      await launchUrl(Uri.file(file.absolute.path));
                                    } catch (e) {
                                      widget.state.onShowToast('Could not open file: $e', isError: true);
                                    }
                                  } else {
                                    widget.state.onShowToast('File does not exist: ${res.content}', isError: true);
                                  }
                                },
                              ),
                              const SizedBox(width: 8),
                              // Copy button
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                icon: Icon(
                                  _copiedId == res.id ? LucideIcons.check : LucideIcons.copy,
                                  size: 14,
                                  color: _copiedId == res.id ? Colors.green : kOnSurfaceVariant,
                                ),
                                tooltip: 'Copy',
                                onPressed: () => _handleCopy(res),
                              ),
                              const SizedBox(width: 10),
                            ],
                          ] else ...[
                            // Reading Mode (Full Screen) Button for code
                            IconButton(
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              icon: Icon(
                                LucideIcons.book_open,
                                size: 14,
                                color: kOnSurfaceVariant,
                              ),
                              tooltip: 'Full Screen Reading Mode',
                              onPressed: () => _showReadingModeDialog(res),
                            ),
                            const SizedBox(width: 8),
                            // Copy button
                            IconButton(
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              icon: Icon(
                                _copiedId == res.id ? LucideIcons.check : LucideIcons.copy,
                                size: 14,
                                color: _copiedId == res.id ? Colors.green : kOnSurfaceVariant,
                              ),
                              tooltip: 'Copy',
                              onPressed: () => _handleCopy(res),
                            ),
                            const SizedBox(width: 10),
                          ],
                          // Language/Extension badge
                          if (res.language != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: kPrimary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                res.language!.toUpperCase(),
                                style: GoogleFonts.robotoMono(
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                  color: kPrimary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),
                      
                      // Content Block (Code or File Preview)
                      Expanded(
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: res.type == 'file'
                              ? (!isExpanded
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            isImg ? LucideIcons.file_image : LucideIcons.file_text,
                                            size: 32,
                                            color: kPrimary,
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            res.content.replaceAll('\\', '/').split('/').last,
                                            style: GoogleFonts.inter(fontSize: 12, color: kOnSurface, fontWeight: FontWeight.w600),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'TAP TO PREVIEW / OPTIONS',
                                            style: GoogleFonts.inter(fontSize: 9, color: kOnSurfaceVariant, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                          ),
                                        ],
                                      ),
                                    )
                                  : GestureDetector(
                                      onTap: () => _showReadingModeDialog(res),
                                      behavior: HitTestBehavior.opaque,
                                      child: isImg
                                          ? ClipRRect(
                                              borderRadius: BorderRadius.circular(6),
                                              child: Image.file(
                                                File(res.content),
                                                fit: BoxFit.cover,
                                                errorBuilder: (context, err, stack) => Center(
                                                  child: Text(
                                                    'Image not found\n${res.content}',
                                                    textAlign: TextAlign.center,
                                                    style: GoogleFonts.inter(fontSize: 10, color: Colors.redAccent),
                                                  ),
                                                ),
                                              ),
                                            )
                                          : Center(
                                              child: Column(
                                                mainAxisAlignment: MainAxisAlignment.center,
                                                children: [
                                                  Icon(
                                                    res.language?.toLowerCase() == 'psd'
                                                        ? LucideIcons.layers
                                                        : (['doc', 'docx'].contains(res.language?.toLowerCase())
                                                            ? LucideIcons.file_text
                                                            : LucideIcons.file),
                                                    size: 32,
                                                    color: kOnSurfaceVariant,
                                                  ),
                                                  const SizedBox(height: 8),
                                                  Text(
                                                    res.content.replaceAll('\\', '/').split('/').last,
                                                    style: GoogleFonts.inter(fontSize: 12, color: kOnSurface, fontWeight: FontWeight.w600),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                  const SizedBox(height: 8),
                                                  Text(
                                                    'TAP PREVIEW TO ENLARGE',
                                                    style: GoogleFonts.inter(fontSize: 9, color: kPrimary, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                                  ),
                                                ],
                                              ),
                                            ),
                                    ))
                              : (isExpanded
                                  ? SingleChildScrollView(
                                      child: Text(
                                        res.content,
                                        style: GoogleFonts.jetBrainsMono(
                                          fontSize: 10,
                                          color: const Color(0xFFa5d6ff),
                                          height: 1.4,
                                        ),
                                      ),
                                    )
                                  : Text(
                                      res.content,
                                      style: GoogleFonts.jetBrainsMono(
                                        fontSize: 9,
                                        color: const Color(0xFFa5d6ff).withValues(alpha: 0.8),
                                      ),
                                      maxLines: 4,
                                      overflow: TextOverflow.ellipsis,
                                    )),
                        ),
                      ),
                      const SizedBox(height: 12),
  
                      // Bottom Row (Always visible)
                      Row(
                        children: [
                          Text(
                            'Contributed by ${isLocal ? 'Local' : 'GlidePass'}',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              color: kOnSurfaceVariant,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const Spacer(),
                          if (isLocal) ...[
                            IconButton(
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              icon: const Icon(LucideIcons.trash_2, size: 14, color: Colors.redAccent),
                              tooltip: 'Delete Resource',
                              onPressed: () => _deleteResource(res),
                            ),
                            const SizedBox(width: 12),
                          ],
                          ElevatedButton.icon(
                            onPressed: () => _handleSend(res),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: kPrimary,
                              foregroundColor: kSurface,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              minimumSize: Size.zero,
                            ),
                            icon: const Icon(LucideIcons.send, size: 12),
                            label: Text(
                              'Send',
                              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
      },
    );
  }
}

class _OfflinePrompt extends StatelessWidget {
  final VoidCallback onStart;
  const _OfflinePrompt({required this.onStart});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.book_open, color: kOnSurfaceVariant.withValues(alpha: 0.4), size: 48),
            const SizedBox(height: 16),
            Text(
              'Knowledge Hub Offline',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: kOnSurface),
            ),
            const SizedBox(height: 8),
            Text(
              'Start the local sharing backend to load resources.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onStart,
              style: FilledButton.styleFrom(
                backgroundColor: kPrimary,
                foregroundColor: kSurface,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(LucideIcons.play, size: 14),
              label: Text(
                'Start Backend',
                style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  final IconData icon;
  final String message;
  const _Empty({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: kOnSurfaceVariant.withValues(alpha: 0.4), size: 32),
          const SizedBox(height: 10),
          Text(
            message,
            style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
