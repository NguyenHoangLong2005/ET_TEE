import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../widgets/common.dart';
import 'marketing_shell.dart';
import 'staff_common.dart';

/// Owner product form (web store-owner/products/ProductFormModal) and import from file
/// (web store-owner/products/import).

final _api = Api.instance;

const _targetGroups = [('', 'Không chọn'), ('men', 'Nam'), ('women', 'Nữ'), ('kids', 'Trẻ em'), ('baby', 'Em bé'), ('family', 'Gia đình')];
const _genders = [('', 'Không chọn'), ('male', 'Nam'), ('female', 'Nữ'), ('unisex', 'Unisex')];

class _Variant {
  final sku = TextEditingController();
  final color = TextEditingController();
  final colorHex = TextEditingController();
  final size = TextEditingController();
  final stock = TextEditingController(text: '0');

  void dispose() {
    for (final c in [sku, color, colorHex, size, stock]) {
      c.dispose();
    }
  }
}

class OwnerProductFormScreen extends StatefulWidget {
  /// null = create.
  final int? productId;
  const OwnerProductFormScreen({super.key, this.productId});

  @override
  State<OwnerProductFormScreen> createState() => _OwnerProductFormScreenState();
}

class _OwnerProductFormScreenState extends State<OwnerProductFormScreen> {
  bool get _isEdit => widget.productId != null;
  bool _loading = true;
  bool _saving = false;
  bool _uploading = false;

  List<(String, String)> _categories = [];
  List<(String, String)> _manufacturers = [];
  List<(String, String)> _suppliers = [];

  final _name = TextEditingController();
  final _brand = TextEditingController();
  final _description = TextEditingController();
  final _productType = TextEditingController();
  final _material = TextEditingController();
  final _price = TextEditingController();
  final _sale = TextEditingController();
  String _categoryId = '';
  String _manufacturerId = '';
  String _supplierId = '';
  String _gender = '';
  String _targetGroup = '';
  bool _active = true;
  final List<String> _images = [];
  final List<_Variant> _variants = [];

  @override
  void initState() {
    super.initState();
    if (!_isEdit) _variants.add(_Variant());
    _load();
  }

  @override
  void dispose() {
    for (final c in [_name, _brand, _description, _productType, _material, _price, _sale]) {
      c.dispose();
    }
    for (final v in _variants) {
      v.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final r = await Future.wait([
        _api.get('/api/categories'),
        _api.get('/api/manufacturers?page=0&size=200').catchError((_) => const []),
        _api.get('/api/suppliers?page=0&size=200').catchError((_) => const []),
      ]);
      final cats = asList(r[0]).whereType<Map>().toList();
      // Indented tree: parent, then its children (web categoryOptions).
      final ids = {for (final c in cats) c['id']};
      final out = <(String, String)>[];
      void walk(dynamic parent, int depth) {
        for (final c in cats.where((c) => (ids.contains(c['parentId']) ? c['parentId'] : null) == parent)) {
          out.add(('${c['id']}', '${'— ' * depth}${c['name']}'));
          walk(c['id'], depth + 1);
        }
      }

      walk(null, 0);
      _categories = out;
      _manufacturers = [for (final m in asList(r[1]).whereType<Map>()) ('${m['id']}', '${m['name']}')];
      _suppliers = [for (final s in asList(r[2]).whereType<Map>()) ('${s['id']}', '${s['name']}')];

      if (_isEdit) {
        final p = await _api.get('/api/store-owner/products/${widget.productId}/form') as Map;
        _name.text = '${p['name'] ?? ''}';
        _brand.text = '${p['brand'] ?? ''}';
        _description.text = '${p['description'] ?? ''}';
        _productType.text = '${p['productType'] ?? ''}';
        _material.text = '${p['material'] ?? ''}';
        _price.text = p['price'] == null ? '' : '${toInt(p['price'])}';
        _sale.text = p['salePrice'] == null ? '' : '${toInt(p['salePrice'])}';
        _categoryId = '${p['categoryId'] ?? ''}';
        _manufacturerId = '${p['manufacturerId'] ?? ''}';
        _supplierId = '${p['supplierId'] ?? ''}';
        _gender = '${p['gender'] ?? ''}';
        _targetGroup = '${p['targetGroup'] ?? ''}';
        _active = p['status'] != 'INACTIVE';
        final imgs = asList(p['images']).whereType<Map>().toList()
          ..sort((a, b) => (b['isPrimary'] == true ? 1 : 0) - (a['isPrimary'] == true ? 1 : 0));
        _images.addAll(imgs.map((i) => '${i['imageUrl']}'));
      }
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không tải được dữ liệu sản phẩm');
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _pickImages() async {
    final files = await ImagePicker().pickMultiImage(maxWidth: 2000, imageQuality: 90);
    if (files.isEmpty) return;
    setState(() => _uploading = true);
    for (final f in files) {
      final bytes = await f.readAsBytes();
      if (bytes.length > 5 * 1024 * 1024) {
        Toast.error('"${f.name}" lớn hơn 5MB');
        continue;
      }
      try {
        final res = await _api.upload('/api/store-owner/uploads/product-image', 'file', bytes, f.name);
        if (!res.success) throw ApiException(res.errorMessage('Không thể tải ảnh lên'));
        final url = (res.data as Map?)?['url'];
        if (url != null) setState(() => _images.add('$url'));
      } catch (e) {
        Toast.error(e is ApiException ? e.message : 'Không thể tải ảnh lên');
      }
    }
    if (mounted) setState(() => _uploading = false);
  }

  Future<void> _addImageUrl() async {
    final r = await formSheet(
      context,
      title: 'Thêm ảnh bằng đường dẫn',
      fields: const [FormFieldSpec('url', 'Đường dẫn ảnh', required: true, type: TextInputType.url, hint: 'https://...')],
      confirm: 'Thêm',
      submit: (v) async {
        if (!RegExp(r'^https?://', caseSensitive: false).hasMatch(v['url']!)) {
          throw ApiException('Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://');
        }
      },
    );
    if (r != null) setState(() => _images.add(r['url']!));
  }

  String? _validate() {
    if (_name.text.trim().isEmpty) return 'Nhập tên sản phẩm.';
    if (_categoryId.isEmpty) return 'Chọn danh mục.';
    final price = int.tryParse(_price.text.trim());
    if (price == null || price <= 0) return 'Nhập giá niêm yết lớn hơn 0.';
    if (price % 1000 != 0) return 'Giá phải là bội số của 1.000đ.';
    if (_sale.text.trim().isNotEmpty) {
      final sale = int.tryParse(_sale.text.trim());
      if (sale == null || sale <= 0) return 'Giá khuyến mãi phải lớn hơn 0 (để trống nếu không có).';
      if (sale % 1000 != 0) return 'Giá khuyến mãi phải là bội số của 1.000đ.';
      if (sale >= price) return 'Giá khuyến mãi phải nhỏ hơn giá niêm yết.';
    }
    if (!_isEdit) {
      if (_variants.isEmpty) return 'Cần ít nhất một biến thể.';
      final skus = _variants.map((v) => v.sku.text.trim().toLowerCase()).toList();
      if (skus.any((s) => s.isEmpty)) return 'Mỗi biến thể cần có SKU.';
      if (skus.toSet().length != skus.length) return 'SKU bị trùng nhau.';
      if (_variants.any((v) => (int.tryParse(v.stock.text.trim()) ?? -1) < 0)) return 'Tồn kho phải là số nguyên từ 0 trở lên.';
    }
    return null;
  }

  Future<void> _save() async {
    final err = _validate();
    if (err != null) return Toast.error(err);
    String? t(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
    final body = <String, dynamic>{
      'name': _name.text.trim(),
      'categoryId': int.parse(_categoryId),
      'brand': t(_brand),
      'manufacturerId': _manufacturerId.isEmpty ? null : int.parse(_manufacturerId),
      'supplierId': _supplierId.isEmpty ? null : int.parse(_supplierId),
      'description': t(_description),
      'gender': _gender.isEmpty ? null : _gender,
      'targetGroup': _targetGroup.isEmpty ? null : _targetGroup,
      'productType': t(_productType),
      'material': t(_material),
      'price': int.parse(_price.text.trim()),
      'salePrice': _sale.text.trim().isEmpty ? null : int.parse(_sale.text.trim()),
      'status': _active ? 'ACTIVE' : 'INACTIVE',
      'images': [
        for (var i = 0; i < _images.length; i++) {'imageUrl': _images[i], 'alt': '', 'isPrimary': i == 0},
      ],
      if (!_isEdit)
        'variants': [
          for (final v in _variants)
            {'sku': v.sku.text.trim(), 'color': t(v.color), 'colorHex': t(v.colorHex), 'size': t(v.size), 'stock': int.parse(v.stock.text.trim())},
        ],
    };
    setState(() => _saving = true);
    final ok = await runAction(
      () => _isEdit ? _api.put('/api/store-owner/products/${widget.productId}', body) : _api.post('/api/store-owner/products', body),
      _isEdit ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm',
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) context.go('/owner/products');
  }

  Widget _text(String label, TextEditingController c, {bool required = false, int lines = 1, TextInputType? type, String? hint}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label, required: required),
        TextField(
          controller: c,
          maxLines: lines,
          keyboardType: type,
          decoration: InputDecoration(
            isDense: true,
            hintText: hint,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
      ],
    ),
  );

  Widget _dropdown(String label, String value, List<(String, String)> options, ValueChanged<String> onChanged, {bool required = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label, required: required),
        DropdownButtonFormField<String>(
          initialValue: options.any((o) => o.$1 == value) ? value : '',
          isExpanded: true,
          decoration: InputDecoration(isDense: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
          items: [
            if (!options.any((o) => o.$1 == '')) const DropdownMenuItem(value: '', child: Text('— Chọn —')),
            for (final (v, l) in options)
              DropdownMenuItem(
                value: v,
                child: Text(l, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: (v) => setState(() => onChanged(v ?? '')),
        ),
      ],
    ),
  );

  Widget _card(String title, List<Widget> children) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: AppCard(
      radius: 14,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => StaffShell(
    path: '/owner/products',
    title: _isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm',
    body: _loading
        ? const LoadingView()
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _card('Thông tin chung', [
                _text('Tên sản phẩm', _name, required: true),
                _dropdown('Danh mục', _categoryId, _categories, (v) => _categoryId = v, required: true),
                _text('Thương hiệu', _brand),
                _dropdown('Nhà sản xuất', _manufacturerId, _manufacturers, (v) => _manufacturerId = v),
                _dropdown('Nhà cung cấp', _supplierId, _suppliers, (v) => _supplierId = v),
                Row(
                  children: [
                    Expanded(child: _dropdown('Giới tính', _gender, _genders, (v) => _gender = v)),
                    const SizedBox(width: 10),
                    Expanded(child: _dropdown('Đối tượng', _targetGroup, _targetGroups, (v) => _targetGroup = v)),
                  ],
                ),
                Row(
                  children: [
                    Expanded(child: _text('Loại sản phẩm', _productType, hint: 'Áo thun')),
                    const SizedBox(width: 10),
                    Expanded(child: _text('Chất liệu', _material, hint: 'Cotton')),
                  ],
                ),
                _text('Mô tả', _description, lines: 4),
              ]),
              _card('Giá bán', [
                Row(
                  children: [
                    Expanded(child: _text('Giá niêm yết (₫)', _price, required: true, type: TextInputType.number)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _text('Giá khuyến mãi (₫)', _sale, type: TextInputType.number, hint: 'Để trống nếu không giảm'),
                    ),
                  ],
                ),
                const Text('Giá phải là bội số của 1.000₫.', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Đang bán', style: TextStyle(fontSize: 14)),
                  value: _active,
                  activeThumbColor: AppColors.slate900,
                  onChanged: (v) => setState(() => _active = v),
                ),
              ]),
              _card('Hình ảnh (ảnh đầu tiên là ảnh bìa)', [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (var i = 0; i < _images.length; i++)
                      Stack(
                        children: [
                          GestureDetector(
                            onTap: i == 0 ? null : () => setState(() => _images.insert(0, _images.removeAt(i))),
                            child: Container(
                              width: 84,
                              height: 104,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: i == 0 ? AppColors.slate900 : AppColors.slate200, width: i == 0 ? 2 : 1),
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: NetImage(resolveImageUrl(_images[i])),
                            ),
                          ),
                          Positioned(
                            right: 2,
                            top: 2,
                            child: InkWell(
                              onTap: () => setState(() => _images.removeAt(i)),
                              child: const CircleAvatar(radius: 11, backgroundColor: Colors.white, child: Icon(Icons.close, size: 14)),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                if (_images.length > 1)
                  const Padding(
                    padding: EdgeInsets.only(top: 6),
                    child: Text('Chạm vào một ảnh để đặt làm ảnh bìa.', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                  ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: StaffButton(
                        'Tải ảnh lên',
                        style: PillStyle.outline,
                        height: 40,
                        icon: Icons.upload,
                        loading: _uploading,
                        onPressed: _uploading ? null : _pickImages,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: StaffButton('Dán link ảnh', style: PillStyle.outline, height: 40, icon: Icons.link, onPressed: _addImageUrl),
                    ),
                  ],
                ),
              ]),
              if (!_isEdit)
                _card('Biến thể (màu / size)', [
                  for (var i = 0; i < _variants.length; i++)
                    Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.fromLTRB(12, 10, 4, 0),
                      decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(10)),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    Expanded(child: _text('SKU', _variants[i].sku, required: true)),
                                    const SizedBox(width: 8),
                                    SizedBox(width: 90, child: _text('Tồn kho', _variants[i].stock, type: TextInputType.number)),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Expanded(child: _text('Màu', _variants[i].color)),
                                    const SizedBox(width: 8),
                                    Expanded(child: _text('Mã màu', _variants[i].colorHex, hint: '#000000')),
                                    const SizedBox(width: 8),
                                    SizedBox(width: 70, child: _text('Size', _variants[i].size)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: _variants.length == 1 ? null : () => setState(() => _variants.removeAt(i).dispose()),
                            icon: const Icon(Icons.delete_outline, color: AppColors.slate400),
                          ),
                        ],
                      ),
                    ),
                  StaffButton(
                    'Thêm biến thể',
                    style: PillStyle.outline,
                    height: 40,
                    icon: Icons.add,
                    onPressed: () => setState(() => _variants.add(_Variant())),
                  ),
                ])
              else
                const Padding(
                  padding: EdgeInsets.only(bottom: 14),
                  child: NoticeBox('Biến thể và tồn kho của sản phẩm đã có được quản lý ở mục Tồn kho / Nhập hàng.'),
                ),
              StaffButton(_isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm', expand: true, height: 48, loading: _saving, onPressed: _saving ? null : _save),
              const SizedBox(height: 24),
            ],
          ),
  );
}

// ─── Import from file ───────────────────────────────────────────────────────

class OwnerProductImportScreen extends StatefulWidget {
  const OwnerProductImportScreen({super.key});

  @override
  State<OwnerProductImportScreen> createState() => _OwnerProductImportScreenState();
}

class _OwnerProductImportScreenState extends State<OwnerProductImportScreen> {
  ({String name, List<int> bytes})? _file;
  Map<String, dynamic>? _report;
  bool _busy = false;

  Future<void> _pick() async {
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['xlsx', 'csv']);
    final f = files.firstOrNull;
    if (f == null) return;
    List<int> bytes;
    try {
      bytes = await f.xFile.readAsBytes();
    } catch (_) {
      return Toast.error('Không đọc được file');
    }
    if (bytes.length > 10 * 1024 * 1024) return Toast.error('File lớn hơn 10MB');
    setState(() {
      _file = (name: f.name, bytes: bytes);
      _report = null;
    });
    await _run(dryRun: true);
  }

  Future<void> _run({required bool dryRun}) async {
    final f = _file;
    if (f == null) return;
    setState(() => _busy = true);
    try {
      final type = f.name.toLowerCase().endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      final res = await _api.upload('/api/store-owner/products/import', 'file', f.bytes, f.name, query: {'dryRun': '$dryRun'}, contentType: type);
      final data = res.data;
      if (data is Map<String, dynamic>) {
        setState(() => _report = data);
        if (!dryRun && res.success) Toast.success('Đã tạo ${data['createdProducts']}/${data['totalProducts']} sản phẩm');
      } else if (!res.success) {
        throw ApiException(res.errorMessage('Không nhập được file'));
      }
    } catch (e) {
      Toast.error(e is ApiException ? e.message : 'Không nhập được file');
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final r = _report;
    final fileErrors = asList(r?['fileErrors']).map((e) => '$e').toList();
    final products = asList(r?['products']).whereType<Map>().toList();
    final dry = r?['dryRun'] == true;
    final valid = toInt(r?['validProducts']);
    return StaffShell(
      path: '/owner/products',
      title: 'Nhập sản phẩm từ file',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const NoticeBox(
            'Chọn file Excel (.xlsx) hoặc CSV theo mẫu của bản web. Ứng dụng kiểm tra trước, chỉ tạo sản phẩm khi bạn xác nhận. '
            'Mỗi dòng là một biến thể; các dòng cùng "Mã nhóm" thuộc cùng một sản phẩm.',
          ),
          const SizedBox(height: 12),
          StaffButton(
            _file == null ? 'Chọn file' : 'Chọn file khác',
            expand: true,
            height: 46,
            icon: Icons.upload_file,
            loading: _busy && r == null,
            onPressed: _busy ? null : _pick,
          ),
          if (_file != null) Padding(padding: const EdgeInsets.only(top: 8), child: InfoLine(Icons.description_outlined, _file!.name)),
          if (r != null) ...[
            const SectionLabel('Kết quả kiểm tra'),
            if (fileErrors.isNotEmpty)
              for (final e in fileErrors) Padding(padding: const EdgeInsets.only(bottom: 6), child: NoticeBox(e))
            else
              StatGrid([
                StatTile(
                  label: 'Sản phẩm trong file',
                  value: '${toInt(r['totalProducts'])}',
                  icon: Icons.checkroom,
                  hint: '${toInt(r['totalRows'])} dòng',
                ),
                StatTile(label: dry ? 'Hợp lệ' : 'Đã tạo', value: '${dry ? valid : toInt(r['createdProducts'])}', icon: Icons.check_circle_outline),
                StatTile(label: 'Có lỗi', value: '${toInt(r['invalidProducts'])}', icon: Icons.error_outline, alert: toInt(r['invalidProducts']) > 0),
              ]),
            if (dry && fileErrors.isEmpty && valid > 0) ...[
              const SizedBox(height: 12),
              StaffButton(
                'Tạo $valid sản phẩm hợp lệ',
                expand: true,
                height: 46,
                loading: _busy,
                onPressed: _busy ? null : () => _run(dryRun: false),
              ),
            ],
            const SizedBox(height: 8),
            for (final p in products)
              RecordCard(
                accent: (p['status'] == 'INVALID' || p['status'] == 'FAILED') ? const Color(0xFFFECACA) : null,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text('${p['name'] ?? p['groupKey'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        ToneBadge(
                          const {'VALID': 'Hợp lệ', 'INVALID': 'Lỗi', 'CREATED': 'Đã tạo', 'FAILED': 'Thất bại'}[p['status']] ?? '${p['status']}',
                          tone: switch (p['status']) {
                            'CREATED' => 'green',
                            'INVALID' || 'FAILED' => 'red',
                            _ => 'gray',
                          },
                        ),
                      ],
                    ),
                    InfoLine(Icons.table_rows_outlined, 'Dòng ${asList(p['rows']).join(', ')} · ${p['categoryName'] ?? ''}'),
                    InfoLine(
                      Icons.sell_outlined,
                      '${vnd(toNum(p['price']))}${p['salePrice'] != null ? ' → ${vnd(toNum(p['salePrice']))}' : ''} · ${p['variantCount']} biến thể · tồn ${p['totalStock']} · ${p['imageCount']} ảnh',
                    ),
                    for (final e in asList(p['errors'])) InfoLine(Icons.error_outline, '$e'),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}
