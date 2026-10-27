import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../models/product.dart';
import '../../services/recommendation_service.dart';
import '../../services/shop_service.dart';
import '../../state/wishlist_provider.dart';
import '../../widgets/common.dart';
import '../../widgets/product_card.dart';
import '../../widgets/store_scaffold.dart';

/// Port of web app/wishlist/page.tsx.
class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  @override
  void initState() {
    super.initState();
    context.read<WishlistProvider>().fetchAll();
  }

  @override
  Widget build(BuildContext context) {
    final items = context.watch<WishlistProvider>().items;
    return StoreScaffold(
      background: const Color(0x80F8FAFC),
      body: RefreshIndicator(
        onRefresh: () => context.read<WishlistProvider>().fetchAll(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          children: [
            Text('MỤC YÊU THÍCH', style: headline(24)),
            const SizedBox(height: 20),
            if (items.isEmpty)
              EmptyPanel(
                icon: Icons.favorite_border,
                title: 'Chưa có sản phẩm nào',
                message: 'Bạn chưa lưu sản phẩm nào vào mục yêu thích. Hãy tiếp tục khám phá và lưu lại những món đồ bạn thích nhé.',
                action: PillButton('Tiếp tục mua sắm', onPressed: () => context.go('/products')),
              )
            else
              ProductGrid(products: items),
          ],
        ),
      ),
    );
  }
}

/// Port of web app/search (hybrid keyword + CLIP search, or search by photo).
class SearchScreen extends StatefulWidget {
  final String initialQuery;
  const SearchScreen({super.key, this.initialQuery = ''});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final _q = TextEditingController(text: widget.initialQuery);
  String _searched = '';
  List<Product>? _results;
  bool _byImage = false;
  XFile? _image;
  bool _loading = false;
  String? _error;

  static const _maxBytes = 5 * 1024 * 1024;

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery.trim().isNotEmpty) _search();
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _q.text.trim();
    if (q.isEmpty) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
      _byImage = false;
      _image = null;
    });
    final (_, products) = await SearchService.search(q, 24);
    if (!mounted) return;
    setState(() {
      _searched = q;
      _results = products;
      _loading = false;
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    final file = await ImagePicker().pickImage(source: source, maxWidth: 1600, imageQuality: 88);
    if (file == null) return;
    final name = file.name.toLowerCase();
    if (!(name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp'))) {
      setState(() => _error = 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    final bytes = await file.readAsBytes();
    if (bytes.length > _maxBytes) {
      setState(() => _error = 'Ảnh tối đa 5 MB.');
      return;
    }
    setState(() {
      _image = file;
      _loading = true;
      _error = null;
      _byImage = true;
    });
    try {
      final r = await SearchService.searchByImage(bytes, file.name, 24);
      if (mounted) setState(() => _results = r);
    } catch (e) {
      if (mounted) {
        setState(() {
          _results = null;
          _error = '$e';
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _chooseSource() {
    showModalBottomSheet(
      context: context,
      builder: (c) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(leading: const Icon(Icons.photo_camera_outlined), title: const Text('Chụp ảnh'), onTap: () {
            Navigator.pop(c);
            _pickImage(ImageSource.camera);
          }),
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Chọn từ thư viện'), onTap: () {
            Navigator.pop(c);
            _pickImage(ImageSource.gallery);
          }),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final results = _results;
    return StoreScaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          Text('TÌM KIẾM', style: headline(26)),
          const SizedBox(height: 6),
          const Text('Mô tả món bạn cần bằng lời (ví dụ: “váy đi tiệc cho phụ nữ”) hoặc tải lên một tấm ảnh.',
              style: TextStyle(fontSize: 13, color: AppColors.slate500, height: 1.5)),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _q,
                maxLength: 200,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _search(),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: 'Bạn đang tìm gì?',
                  prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.slate400),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: const BorderSide(color: AppColors.slate200)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: const BorderSide(color: AppColors.slate200)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: const BorderSide(color: AppColors.slate900)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              height: 46,
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: AppColors.slate900, shape: const StadiumBorder()),
                onPressed: _search,
                child: const Text('Tìm', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(width: 6),
            SizedBox(
              height: 46,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(shape: const StadiumBorder(), side: const BorderSide(color: AppColors.slate200), foregroundColor: AppColors.slate700),
                onPressed: _chooseSource,
                child: const Icon(Icons.photo_camera_outlined, size: 20),
              ),
            ),
          ]),
          const SizedBox(height: 14),
          if (_image != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(width: 64, height: 80, child: FutureBuilder(
                    future: _image!.readAsBytes(),
                    builder: (_, s) => s.hasData ? Image.memory(s.data!, fit: BoxFit.cover) : Container(color: AppColors.slate100),
                  )),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(_loading ? 'Đang tìm món giống ảnh…' : 'Sản phẩm giống ảnh của bạn', style: const TextStyle(color: AppColors.slate600, fontSize: 13))),
                IconButton(
                  onPressed: () => setState(() {
                    _image = null;
                    _results = null;
                    _byImage = false;
                    _error = null;
                  }),
                  icon: const Icon(Icons.close, size: 18, color: AppColors.slate400),
                ),
              ]),
            ),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(_error!, style: const TextStyle(color: AppColors.red600, fontSize: 13))),
          if (_loading)
            const LoadingView()
          else if (results != null)
            if (results.isEmpty)
              const Text('Không tìm thấy sản phẩm phù hợp.', style: TextStyle(color: AppColors.slate500))
            else ...[
              if (!_byImage && _searched.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Wrap(children: [
                    Text('${results.length} kết quả cho “$_searched” · ', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                    GestureDetector(
                      onTap: () => context.push('/products?q=${Uri.encodeComponent(_searched)}'),
                      child: const Text('lọc theo giá, size, màu',
                          style: TextStyle(fontSize: 12, color: AppColors.slate500, decoration: TextDecoration.underline)),
                    ),
                  ]),
                ),
              ProductGrid(products: results),
            ],
        ],
      ),
    );
  }
}

/// Port of web app/news (published marketing posts).
class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  List<Map<String, dynamic>>? _posts;

  @override
  void initState() {
    super.initState();
    CustomerMarketingService.posts().then((p) {
      if (mounted) setState(() => _posts = p.where((x) => (x['status'] ?? 'PUBLISHED') == 'PUBLISHED').toList());
    });
  }

  @override
  Widget build(BuildContext context) {
    final posts = _posts;
    return StoreScaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          Text('TIN TỨC & XU HƯỚNG', style: headline(24)),
          const SizedBox(height: 6),
          const Text('Cập nhật xu hướng thời trang, mẹo phối đồ và tin tức mới nhất từ ET.TEE.', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
          const SizedBox(height: 20),
          if (posts == null)
            const LoadingView()
          else if (posts.isEmpty)
            const EmptyPanel(icon: Icons.article_outlined, title: 'Chưa có bài viết nào')
          else
            for (final p in posts)
              GestureDetector(
                onTap: () => context.push('/news/${p['slug']}'),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: AspectRatio(aspectRatio: 16 / 9, child: NetImage(resolveImageUrl(p['coverImageUrl']))),
                    ),
                    const SizedBox(height: 10),
                    if (p['publishedAt'] != null)
                      Text(formatDate(p['publishedAt']), style: const TextStyle(fontSize: 11, color: AppColors.slate400, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('${p['title'] ?? ''}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, height: 1.3)),
                    if ((p['excerpt'] ?? '').toString().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text('${p['excerpt']}', maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: AppColors.slate600, height: 1.5)),
                    ],
                  ]),
                ),
              ),
        ],
      ),
    );
  }
}

class NewsDetailScreen extends StatefulWidget {
  final String slug;
  const NewsDetailScreen({super.key, required this.slug});

  @override
  State<NewsDetailScreen> createState() => _NewsDetailScreenState();
}

class _NewsDetailScreenState extends State<NewsDetailScreen> {
  Map<String, dynamic>? _post;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    CustomerMarketingService.post(widget.slug).then((p) {
      if (!mounted) return;
      setState(() {
        _post = p;
        _loading = false;
      });
      if (p != null) CustomerMarketingService.trackPostView(widget.slug);
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = _post;
    return StoreScaffold(
      body: _loading
          ? const LoadingView()
          : p == null
              ? const Padding(padding: EdgeInsets.all(24), child: EmptyPanel(icon: Icons.article_outlined, title: 'Không tìm thấy bài viết'))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
                  children: [
                    if ((p['tags'] is List) && (p['tags'] as List).isNotEmpty)
                      Wrap(spacing: 6, children: [
                        for (final t in p['tags'] as List) StatusPill('#$t', bg: AppColors.slate100, fg: AppColors.slate600, fontSize: 10),
                      ]),
                    const SizedBox(height: 10),
                    Text('${p['title'] ?? ''}', style: headline(24)),
                    const SizedBox(height: 8),
                    Text('${p['author'] ?? 'ET.TEE'} · ${formatDate(p['publishedAt'])}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                    const SizedBox(height: 16),
                    if (resolveImageUrl(p['coverImageUrl']) != null)
                      ClipRRect(borderRadius: BorderRadius.circular(16), child: AspectRatio(aspectRatio: 16 / 9, child: NetImage(resolveImageUrl(p['coverImageUrl'])))),
                    const SizedBox(height: 16),
                    if ((p['excerpt'] ?? '').toString().isNotEmpty)
                      Text('${p['excerpt']}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.slate700, height: 1.6)),
                    const SizedBox(height: 12),
                    Text(_stripHtml('${p['content'] ?? ''}'), style: const TextStyle(fontSize: 15, color: AppColors.slate700, height: 1.7)),
                  ],
                ),
    );
  }

  /// Posts may contain simple HTML; show readable text.
  static String _stripHtml(String s) => s
      .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
      .replaceAll(RegExp(r'<[^>]+>'), '')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .trim();
}
