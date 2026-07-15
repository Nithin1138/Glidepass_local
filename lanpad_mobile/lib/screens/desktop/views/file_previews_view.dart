import 'package:flutter/material.dart';
import '../desktop_theme.dart';
import '../desktop_state.dart';

import '../../../models/file_model.dart';
import 'package:intl/intl.dart';

class FilePreviewsView extends StatefulWidget {
  final DesktopState state;

  const FilePreviewsView({super.key, required this.state});

  @override
  State<FilePreviewsView> createState() => _FilePreviewsViewState();
}

class _FilePreviewsViewState extends State<FilePreviewsView> {
  SharedFile? _selectedFile;

  @override
  void initState() {
    super.initState();
    if (widget.state.files.isNotEmpty) {
      _selectedFile = widget.state.files.first;
    }
  }

  @override
  void didUpdateWidget(FilePreviewsView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.state.files.isNotEmpty && _selectedFile == null) {
      _selectedFile = widget.state.files.first;
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 900;

        final leftColumn = Column(
          children: [
            // Filter Row
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: kOutlineVariant)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: kSurfaceLow,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        _buildFilterButton('All', true),
                        _buildFilterButton('Sent', false),
                        _buildFilterButton('Received', false),
                        _buildFilterButton('Large Files', false),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(Icons.filter_list),
                        tooltip: 'Filter',
                      ),
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(Icons.delete_sweep),
                        tooltip: 'Clear',
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Transfer List
            Expanded(
              child: widget.state.loadingFiles
                  ? const Center(child: CircularProgressIndicator())
                  : widget.state.files.isEmpty
                      ? Center(child: Text('No files available', style: kBodyMd.copyWith(color: kOnSurfaceVariant)))
                      : ListView(
                          padding: const EdgeInsets.all(24),
                          children: [
                            _buildTableRowHeader(),
                            const SizedBox(height: 8),
                            ...widget.state.files.map((file) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: InkWell(
                                  onTap: () => setState(() => _selectedFile = file),
                                  borderRadius: BorderRadius.circular(8),
                                  child: _buildTableRow(file, _selectedFile?.name == file.name),
                                ),
                              );
                            }),
                          ],
                        ),
            ),
          ],
        );

        final rightColumn = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Preview Card
            if (_selectedFile != null)
              Container(
                decoration: BoxDecoration(
                  color: kSurfaceContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('File Preview', style: kHeadlineMd.copyWith(fontSize: 18)),
                          const Icon(Icons.close, size: 18),
                        ],
                      ),
                    ),
                    Divider(height: 1, color: kOutlineVariant),
                    Container(
                      height: 256,
                      color: kSurfaceVariant,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: kSurfaceLowest.withOpacity(0.9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: kOutlineVariant),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.insert_drive_file, size: 48, color: kPrimary),
                              const SizedBox(height: 8),
                              Text(_selectedFile!.name, style: kBodyMd.copyWith(fontFamily: 'Geist'), textAlign: TextAlign.center),
                              Text('Size: ${(_selectedFile!.size / 1024 / 1024).toStringAsFixed(2)} MB', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('FILE NAME', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: kSurfaceLowest,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: kOutlineVariant),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(_selectedFile!.name, style: kBodyMd.copyWith(fontFamily: 'Geist', color: kSecondary)),
                                ),
                                Icon(Icons.copy, size: 18, color: kOnSurfaceVariant),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: _buildDetailBox('MIME TYPE', 'application/octet-stream'),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: _buildDetailBox('UPLOADER', _selectedFile!.inbox ? 'Mobile Device' : 'Desktop'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    widget.state.onDownloadFile(_selectedFile!);
                                  },
                                  icon: const Icon(Icons.download),
                                  label: const Text('Download'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: kPrimary,
                                    foregroundColor: kSurfaceLowest,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              OutlinedButton(
                                onPressed: () {},
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.all(16),
                                ),
                                child: const Icon(Icons.share),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Text('Select a file to view details', style: kBodyMd.copyWith(color: kOnSurfaceVariant)),
                ),
              ),
            const SizedBox(height: 24),
            // Storage Health Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: kSurfaceContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.storage, color: kSecondary),
                          const SizedBox(width: 8),
                          Text('Storage Health', style: kHeadlineMd.copyWith(fontSize: 16)),
                        ],
                      ),
                      Text('92% Health', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildProgressBar('Local Drive (NVMe)', '742 GB / 1 TB', 0.742, kPrimary),
                  const SizedBox(height: 12),
                  _buildProgressBar('LANpad Cache', '4.2 GB / 10 GB', 0.42, kSecondary),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Icon(Icons.info, size: 14, color: kTertiary),
                      const SizedBox(width: 8),
                      Expanded(child: Text('Cache automatically clears files older than 48h.', style: kLabelMd.copyWith(color: kOnSurfaceVariant))),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {},
                      child: const Text('Clean Cache'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );

        if (isNarrow) {
          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  height: 380,
                  child: leftColumn,
                ),
                const Divider(),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: rightColumn,
                ),
              ],
            ),
          );
        } else {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left Column
              Expanded(child: leftColumn),
              // Right Column
              Container(
                width: 320,
                decoration: BoxDecoration(
                  border: Border(left: BorderSide(color: kOutlineVariant)),
                  color: kSurfaceLow,
                ),
                padding: const EdgeInsets.all(16),
                child: SingleChildScrollView(
                  child: rightColumn,
                ),
              ),
            ],
          );
        }
      },
    );
  }

  Widget _buildFilterButton(String text, bool active) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4.0),
      child: TextButton(
        onPressed: () {},
        style: TextButton.styleFrom(
          backgroundColor: active ? kSurfaceVariant : Colors.transparent,
          foregroundColor: active ? kPrimary : kOnSurfaceVariant,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        ),
        child: Text(text, style: kLabelMd),
      ),
    );
  }

  Widget _buildTableRowHeader() {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          SizedBox(width: 60, child: Text('TYPE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 2, child: Text('FILE NAME', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 2, child: Text('SOURCE / DEST', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 1, child: Text('SIZE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 1, child: Text('TIME', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          SizedBox(width: 100, child: Text('STATUS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          SizedBox(width: 40),
        ],
      ),
    );
  }

  Widget _buildTableRow(SharedFile file, bool isSelected) {
    final type = file.name.split('.').last.toUpperCase();
    Color typeColor = kPrimary;
    if (type == 'PNG' || type == 'JPG') typeColor = kSecondary;
    if (type == 'ZIP' || type == 'RAR') typeColor = kOnSurfaceVariant;
    if (type == 'PDF') typeColor = kError;

    final date = DateTime.fromMillisecondsSinceEpoch((file.modified * 1000).toInt());
    final timeStr = DateFormat.MMMd().add_Hm().format(date);
    final sizeStr = '${(file.size / 1024 / 1024).toStringAsFixed(1)} MB';
    return Container(
      decoration: BoxDecoration(
        color: isSelected ? kPrimary.withOpacity(0.05) : kSurfaceLow,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: isSelected ? kPrimary.withOpacity(0.3) : Colors.transparent),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 60,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: typeColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(type, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: typeColor)),
            ),
          ),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(file.name, style: kBodyMd, overflow: TextOverflow.ellipsis),
                Text('Size: $sizeStr', style: kLabelMd.copyWith(color: kOnSurfaceVariant.withOpacity(0.6))),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Row(
              children: [
                Expanded(
                  child: Text(file.inbox ? 'Mobile Device' : 'Desktop', style: kBodyMd, overflow: TextOverflow.ellipsis),
                ),
                const SizedBox(width: 8),
                Icon(Icons.arrow_forward, size: 16, color: kOutlineVariant),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Hub', style: kBodyMd, overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(sizeStr, style: kBodyMd.copyWith(fontFamily: 'Geist', color: kOnSurfaceVariant)),
          ),
          Expanded(
            flex: 1,
            child: Text(timeStr, style: kBodyMd.copyWith(fontFamily: 'Geist', color: kOnSurfaceVariant)),
          ),
          SizedBox(
            width: 100,
            child: Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(color: kSecondary, shape: BoxShape.circle),
                ),
                const SizedBox(width: 6),
                Text('SUCCESS', style: kLabelMd.copyWith(color: kSecondary)),
              ],
            ),
          ),
          SizedBox(width: 40, child: Icon(Icons.more_vert, color: kOnSurfaceVariant)),
        ],
      ),
    );
  }

  Widget _buildDetailBox(String title, String value) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kSurfaceLowest,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: kOutlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: kLabelMd.copyWith(color: kOnSurfaceVariant, fontSize: 10)),
          Text(value, style: kBodyMd.copyWith(fontFamily: 'Geist')),
        ],
      ),
    );
  }

  Widget _buildProgressBar(String title, String subtitle, double progress, Color color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: kLabelMd),
            Text(subtitle, style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: kSurfaceVariant,
          valueColor: AlwaysStoppedAnimation<Color>(color),
          minHeight: 6,
          borderRadius: BorderRadius.circular(3),
        ),
      ],
    );
  }
}
