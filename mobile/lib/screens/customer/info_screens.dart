import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/toast.dart';
import '../../services/recommendation_service.dart';
import '../../state/auth_provider.dart';
import '../../widgets/common.dart';
import '../../widgets/store_scaffold.dart';

/// Ports of the web's information pages: size guide, style quiz, stores, about, FAQ, contact,
/// careers, policies, privacy, terms and the e-mail unsubscribe link target.

// ─── Shared building blocks ─────────────────────────────────────────────────

/// White hero card at the top of an information page (web "Hero Header").
class _Hero extends StatelessWidget {
  final String? eyebrow;
  final String title;
  final String text;
  final bool dark;
  const _Hero({this.eyebrow, required this.title, required this.text, this.dark = false});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: dark ? AppColors.slate900 : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: dark ? null : Border.all(color: const Color(0xCCE2E8F0)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (eyebrow != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: dark ? AppColors.primary : AppColors.primary50,
                borderRadius: BorderRadius.circular(999),
                border: dark ? null : Border.all(color: AppColors.primary200),
              ),
              child: Text(eyebrow!.toUpperCase(), style: labelCaps(size: 10, color: dark ? Colors.white : AppColors.primary900)),
            ),
            const SizedBox(height: 14),
          ],
          Text(title.toUpperCase(), style: headline(26, color: dark ? Colors.white : AppColors.slate900)),
          const SizedBox(height: 10),
          Text(text, style: TextStyle(fontSize: 13, height: 1.6, color: dark ? AppColors.slate300 : AppColors.slate600)),
        ]),
      );
}

/// Section title with an icon inside an article ("1. ĐIỀU KIỆN ĐỔI HÀNG").
class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String text;
  const _SectionTitle(this.icon, this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 20, bottom: 10),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 20, color: AppColors.slate700),
          const SizedBox(width: 8),
          Expanded(child: Text(text.toUpperCase(), style: headline(14))),
        ]),
      );
}

class _Para extends StatelessWidget {
  final String text;
  final Color color;
  const _Para(this.text, {this.color = AppColors.slate700});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: TextStyle(fontSize: 13, height: 1.6, color: color)),
      );
}

class _Bullets extends StatelessWidget {
  final List<String> items;
  const _Bullets(this.items);

  @override
  Widget build(BuildContext context) => Column(children: [
        for (final t in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Padding(padding: EdgeInsets.only(top: 7, right: 10), child: CircleAvatar(radius: 2.5, backgroundColor: AppColors.slate400)),
              Expanded(child: Text(t, style: const TextStyle(fontSize: 13, height: 1.6, color: AppColors.slate600))),
            ]),
          ),
      ]);
}

/// Tinted call-out box (web "Highlight Banner").
class _Callout extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;
  const _Callout(this.icon, this.title, this.text);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.primary50,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primary200),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.slate900)),
              const SizedBox(height: 4),
              Text(text, style: const TextStyle(fontSize: 13, height: 1.5, color: AppColors.slate700)),
            ]),
          ),
        ]),
      );
}

/// A long-form page: hero + white article card, inside the storefront scaffold.
class _ArticlePage extends StatelessWidget {
  final String eyebrow;
  final String title;
  final List<Widget> children;
  const _ArticlePage({required this.eyebrow, required this.title, required this.children});

  @override
  Widget build(BuildContext context) => StoreScaffold(
        background: AppColors.slate50,
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          children: [
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(999)),
                  child: Text(eyebrow.toUpperCase(), style: labelCaps(size: 10, color: Colors.white)),
                ),
                const SizedBox(height: 12),
                Text(title.toUpperCase(), style: headline(22)),
                const Divider(height: 28, color: AppColors.slate100),
                ...children,
              ]),
            ),
          ],
        ),
      );
}

Future<void> _open(String url) async {
  final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  if (!ok) Toast.error('Không mở được ứng dụng trên thiết bị này');
}

Widget _input(TextEditingController c, String hint, {TextInputType? type, int lines = 1}) => TextField(
      controller: c,
      keyboardType: type,
      maxLines: lines,
      decoration: InputDecoration(
        hintText: hint,
        isDense: true,
        filled: true,
        fillColor: AppColors.slate50,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary)),
      ),
    );

// ─── Size guide ─────────────────────────────────────────────────────────────

/// Port of web app/size-guide: chart-based size calculator (backend SizeAdvisorService, same as the
/// product page) and the published size tables.
class SizeGuideScreen extends StatefulWidget {
  const SizeGuideScreen({super.key});

  @override
  State<SizeGuideScreen> createState() => _SizeGuideScreenState();
}

class _SizeGuideScreenState extends State<SizeGuideScreen> {
  String _tab = 'nam';
  String _sub = 'ao';
  final _height = TextEditingController(text: '170');
  final _weight = TextEditingController(text: '65');
  String _fit = 'regular';
  bool _busy = false;
  String? _size;
  List<String> _details = [];

  @override
  void initState() {
    super.initState();
    final saved = SizeAdvisorService.loadBody();
    if (saved != null) {
      if (saved['height'] is num) _height.text = '${(saved['height'] as num).round()}';
      if (saved['weight'] is num) _weight.text = '${(saved['weight'] as num).round()}';
      if (saved['fit'] is String) _fit = (saved['fit'] as String).toLowerCase();
    }
  }

  @override
  void dispose() {
    _height.dispose();
    _weight.dispose();
    super.dispose();
  }

  Future<void> _calculate() async {
    final h = num.tryParse(_height.text.trim());
    final w = num.tryParse(_weight.text.trim());
    if (h == null || w == null || h < 50 || h > 230 || w < 5 || w > 250) {
      Toast.error('Nhập chiều cao (50–230 cm) và cân nặng (5–250 kg) hợp lệ');
      return;
    }
    final chart = _tab == 'nu' ? 'WOMEN' : _tab == 'tre-em' ? 'KIDS' : _sub == 'quan' ? 'MEN_BOTTOM' : 'MEN_TOP';
    final body = <String, dynamic>{'height': h, 'weight': w, 'fit': _fit.toUpperCase()};
    setState(() => _busy = true);
    await SizeAdvisorService.saveBody(body);
    final advice = await SizeAdvisorService.forChart(chart, body);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _size = advice?.size;
      _details = advice?.size == null
          ? []
          : [if (advice!.confidence != null) confidenceLabel[advice.confidence] ?? '', ...advice.reasons].where((s) => s.isNotEmpty).toList();
    });
    if (advice?.size == null) Toast.error('Chưa tính được size cho số đo này, vui lòng xem bảng size bên dưới');
  }

  static const _tables = {
    'nam-ao': (
      ['Kích thước', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
      [
        ['Chiều cao (cm)', '160–165', '160–165', '166–172', '172–177', '177–184', '184–192', '184–192', '184–192'],
        ['Cân nặng (kg)', '50–54', '55–61', '62–68', '69–75', '76–84', '85–90', '90–98', '99–105'],
        ['Rộng vai (cm)', '41', '42', '43.5', '45', '46.5', '48', '49', '50'],
        ['Vòng ngực (cm)', '82–86', '86–90', '90–94', '94–98', '98–103', '103–108', '108–113', '114–120'],
      ],
    ),
    'nam-quan': (
      ['Size quần', '29 (S)', '30 (M)', '31 (L)', '32 (XL)', '33 (2XL)', '34 (3XL)'],
      [
        ['Chiều cao (cm)', '160–165', '163–168', '166–172', '170–176', '175–182', '178–186'],
        ['Cân nặng (kg)', '52–56', '57–63', '64–70', '71–77', '78–84', '85–92'],
        ['Vòng bụng (cm)', '73–75', '76–78', '79–81', '82–84', '85–88', '89–92'],
      ],
    ),
    'nu': (
      ['Kích thước', 'S', 'M', 'L', 'XL', '2XL'],
      [
        ['Chiều cao (cm)', '150–156', '156–162', '162–166', '165–170', '168–174'],
        ['Cân nặng (kg)', '40–47', '48–53', '54–59', '60–65', '66–72'],
        ['Vòng ngực (cm)', '80–84', '84–88', '88–92', '92–96', '96–100'],
        ['Vòng eo (cm)', '62–66', '66–70', '70–74', '74–78', '78–82'],
      ],
    ),
    'tre-em': (
      ['Size bé', '100', '110', '120', '130', '140', '150'],
      [
        ['Ước tính tuổi', '2–3 tuổi', '4–5 tuổi', '6–7 tuổi', '8–9 tuổi', '10–11 tuổi', '12–13 tuổi'],
        ['Chiều cao (cm)', '90–100', '100–110', '110–120', '120–130', '130–140', '140–150'],
        ['Cân nặng (kg)', '12–15', '15–18', '18–23', '23–28', '28–34', '34–40'],
      ],
    ),
  };

  Widget _table(List<String> head, List<List<String>> rows) => ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingRowColor: const WidgetStatePropertyAll(AppColors.slate900),
            headingTextStyle: labelCaps(size: 11, color: Colors.white),
            dataTextStyle: const TextStyle(fontSize: 12, color: AppColors.slate800, fontWeight: FontWeight.w500),
            columnSpacing: 18,
            horizontalMargin: 12,
            border: TableBorder.all(color: AppColors.slate200),
            columns: [for (final h in head) DataColumn(label: Text(h))],
            rows: [
              for (final r in rows)
                DataRow(cells: [
                  DataCell(Text(r.first, style: const TextStyle(fontWeight: FontWeight.w700))),
                  for (final c in r.skip(1)) DataCell(Text(c)),
                ]),
            ],
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final key = _tab == 'nam' ? 'nam-$_sub' : _tab;
    final table = _tables[key];
    return StoreScaffold(
      background: AppColors.slate50,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          const _Hero(
            dark: true,
            eyebrow: 'Bảng size ET.TEE 2026',
            title: 'Hướng dẫn chọn kích cỡ',
            text: 'Bảng quy đổi kích thước ET.TEE theo chiều cao, cân nặng và số đo. Nhập số đo để được gợi ý size theo bảng; đổi size miễn phí trong 30 ngày.',
          ),
          const SizedBox(height: 20),
          AppCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const CircleAvatar(radius: 18, backgroundColor: AppColors.primary, child: Icon(Icons.calculate_outlined, color: Colors.white, size: 18)),
                const SizedBox(width: 12),
                Expanded(child: Text('GỢI Ý SIZE THEO BẢNG SỐ ĐO', style: headline(15))),
              ]),
              const SizedBox(height: 6),
              const Text('Nhập chiều cao & cân nặng để đối chiếu với bảng size của danh mục đang chọn bên dưới.',
                  style: TextStyle(fontSize: 12, color: AppColors.slate500)),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const FieldLabel('Chiều cao (cm)'), _input(_height, '170', type: TextInputType.number)])),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const FieldLabel('Cân nặng (kg)'), _input(_weight, '65', type: TextInputType.number)])),
              ]),
              const SizedBox(height: 12),
              const FieldLabel('Gu phom dáng'),
              FilterTabs(
                tabs: const [('slim', 'Ôm vừa'), ('regular', 'Thoải mái'), ('loose', 'Rộng rãi')],
                value: _fit,
                activeColor: AppColors.slate900,
                onChanged: (v) => setState(() => _fit = v),
              ),
              const SizedBox(height: 16),
              PillButton('Tính size', style: PillStyle.dark, expand: true, loading: _busy, icon: Icons.straighten, onPressed: _calculate),
              if (_size != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(16)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('KÍCH THƯỚC KHUYÊN DÙNG', style: labelCaps(size: 10, color: Colors.white70)),
                    const SizedBox(height: 4),
                    Text('SIZE $_size', style: headline(28, color: Colors.white)),
                    for (final d in _details)
                      Padding(padding: const EdgeInsets.only(top: 4), child: Text(d, style: const TextStyle(fontSize: 12, color: Colors.white))),
                    const SizedBox(height: 12),
                    PillButton('Mua sắm với size $_size', style: PillStyle.dark, height: 40, onPressed: () => context.push('/products')),
                  ]),
                ),
              ],
            ]),
          ),
          const SizedBox(height: 20),
          AppCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('BẢNG SỐ ĐO CHI TIẾT', style: headline(15)),
              const SizedBox(height: 12),
              FilterTabs(
                tabs: const [('nam', 'Nam'), ('nu', 'Nữ'), ('tre-em', 'Trẻ em'), ('phu-kien', 'Phụ kiện')],
                value: _tab,
                onChanged: (v) => setState(() {
                  _tab = v;
                  _size = null;
                }),
              ),
              if (_tab == 'nam') ...[
                const SizedBox(height: 10),
                FilterTabs(
                  tabs: const [('ao', 'Áo sơ mi, polo, thun'), ('quan', 'Quần tây, jeans, short')],
                  value: _sub,
                  activeColor: AppColors.slate900,
                  onChanged: (v) => setState(() {
                    _sub = v;
                    _size = null;
                  }),
                ),
              ],
              const SizedBox(height: 16),
              if (table != null)
                _table(table.$1, table.$2)
              else
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
                  child: const Column(children: [
                    Text('Phụ kiện ET.TEE freesize', style: TextStyle(fontWeight: FontWeight.w700)),
                    SizedBox(height: 6),
                    Text('Mũ nón, tất vớ, khăn quàng, thắt lưng của ET.TEE thiết kế freesize co giãn, dễ điều chỉnh vừa với mọi vóc dáng.',
                        textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.slate600, height: 1.5)),
                  ]),
                ),
            ]),
          ),
          const SizedBox(height: 20),
          const AppCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _SectionTitle(Icons.help_outline, 'Câu hỏi thường gặp về size'),
              Text('Số đo ở giữa 2 size thì chọn size nào?', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              SizedBox(height: 4),
              _Para('Nên chọn size lớn hơn để thoải mái khi vận động và sau khi giặt.', color: AppColors.slate600),
              SizedBox(height: 8),
              Text('Mặc không vừa có được đổi không?', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              SizedBox(height: 4),
              _Para('Được. ET.TEE đổi size miễn phí trong 30 ngày tại cửa hàng hoặc qua shipper tận nhà.', color: AppColors.slate600),
            ]),
          ),
        ],
      ),
    );
  }
}

// ─── Style quiz ─────────────────────────────────────────────────────────────

/// Port of web app/style-quiz. Saves height / weight / fit to the shopper's measurements (the same
/// record as Tài khoản > Số đo); the suggested size is a simple rule on height and weight.
class StyleQuizScreen extends StatefulWidget {
  const StyleQuizScreen({super.key});

  @override
  State<StyleQuizScreen> createState() => _StyleQuizScreenState();
}

class _StyleQuizScreenState extends State<StyleQuizScreen> {
  int _step = 1;
  final _height = TextEditingController(text: '170');
  final _weight = TextEditingController(text: '65');
  String _body = 'balanced';
  String _style = 'minimalist';
  String _palette = 'neutral';
  bool _saving = false;
  bool _done = false;

  static const _bodies = [('slim', 'Thon gọn', 'Nhẹ nhàng'), ('balanced', 'Cân đối', 'Chuẩn phom'), ('athletic', 'Thể thao', 'Săn chắc'), ('plus', 'Mũm mĩm', 'Thoải mái')];
  static const _styles = [
    ('minimalist', 'Minimalist Clean', 'Tối giản, tinh tế, ưu tiên chất liệu cotton'),
    ('streetwear', 'Oversize Streetwear', 'Cá tính, năng động, phom dáng rộng'),
    ('office', 'Elegant Everyday', 'Lịch sự, phù hợp đi làm & gặp đối tác'),
    ('casual', 'Basic Casual', 'Thoải mái, dễ phối đồ hằng ngày'),
  ];
  static const _palettes = [
    ('neutral', 'Neutral Basic', 'Đen, trắng, ghi, be', [Color(0xFFFFFFFF), Color(0xFF1E293B), Color(0xFF94A3B8)]),
    ('vibrant', 'Vibrant Accent', 'Đỏ, xanh dương, cam', [Color(0xFFE50027), Color(0xFF0284C7), Color(0xFFD97706)]),
    ('dark', 'Monochrome Dark', 'Tone tối thanh lịch', [Color(0xFF0F172A), Color(0xFF334155), Color(0xFF475569)]),
  ];

  @override
  void dispose() {
    _height.dispose();
    _weight.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    if (_step < 3) {
      setState(() => _step++);
      return;
    }
    final loggedIn = context.read<AuthProvider>().user != null;
    setState(() => _saving = true);
    if (loggedIn) {
      try {
        await Api.instance.put('/api/account/measurements', {
          'measurementProfileType': 'SELF_ADULT',
          'heightCm': num.tryParse(_height.text.trim()),
          'weightKg': num.tryParse(_weight.text.trim()),
          'fitPreference': _body,
          'note': 'Style quiz: phong cách=$_style, gam màu=$_palette',
        });
      } catch (_) {
        // the suggestion below is still shown
      }
    }
    if (!mounted) return;
    setState(() {
      _saving = false;
      _done = true;
    });
    Toast.success(loggedIn ? 'Đã lưu số đo của bạn vào hồ sơ tài khoản.' : 'Đã ghi nhận câu trả lời. Đăng nhập để lưu số đo vào hồ sơ của bạn.');
  }

  String get _size {
    final h = int.tryParse(_height.text.trim()) ?? 170;
    final w = int.tryParse(_weight.text.trim()) ?? 65;
    var s = w < 53 || h < 162 ? 'S' : w < 63 || h < 170 ? 'M' : w < 73 || h < 178 ? 'L' : w < 83 || h < 185 ? 'XL' : 'XXL';
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    if (_body == 'plus' && s != 'XXL') s = sizes[sizes.indexOf(s) + 1];
    return s;
  }

  Widget _choice({required bool selected, required VoidCallback onTap, required Widget child}) => GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? AppColors.slate900 : AppColors.slate50,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: selected ? AppColors.slate900 : AppColors.slate200),
          ),
          child: DefaultTextStyle(style: TextStyle(color: selected ? Colors.white : AppColors.slate800), child: child),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final size = _size;
    final fitLabel = switch (_style) {
      'streetwear' => 'Oversize Fit ($size)',
      'office' => 'Slim Fit ($size)',
      'minimalist' => 'Regular Fit ($size)',
      _ => 'Casual Fit ($size)',
    };
    final keyword = _style == 'office' ? 'polo' : _style == 'streetwear' ? 'oversize' : '';
    final target = '/products?adultSize=$size${keyword.isNotEmpty ? '&q=$keyword' : ''}';

    return StoreScaffold(
      background: AppColors.slate50,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          const _Hero(
            eyebrow: 'Trắc nghiệm phong cách',
            title: 'Tìm phom dáng hợp với bạn',
            text: '3 bước ngắn về số đo, phong cách và gam màu. Số đo được lưu vào hồ sơ của bạn để gợi ý size ở trang sản phẩm.',
          ),
          const SizedBox(height: 20),
          if (_saving)
            const AppCard(child: LoadingView(message: 'Đang lưu thông tin của bạn...'))
          else if (_done)
            AppCard(
              child: Column(children: [
                const Icon(Icons.check_circle_outline, size: 48, color: AppColors.emerald600),
                const SizedBox(height: 12),
                Text('Phom dáng gợi ý', style: labelCaps(size: 11, color: AppColors.primary)),
                const SizedBox(height: 6),
                Text(fitLabel.toUpperCase(), textAlign: TextAlign.center, style: headline(22)),
                const SizedBox(height: 10),
                Text(
                  'Chiều cao ${_height.text}cm, cân nặng ${_weight.text}kg, phong cách ${_style.toUpperCase()}: cỡ $size phù hợp với áo thun & polo có độ co giãn tốt.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: AppColors.slate600, height: 1.5),
                ),
                const SizedBox(height: 18),
                PillButton('Xem sản phẩm cỡ $size', expand: true, icon: Icons.shopping_bag_outlined, onPressed: () => context.push(target)),
                const SizedBox(height: 10),
                PillButton('Làm lại', style: PillStyle.light, expand: true, icon: Icons.refresh, onPressed: () => setState(() {
                  _step = 1;
                  _done = false;
                })),
              ]),
            )
          else
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text('BƯỚC $_step / 3', style: labelCaps(size: 11, color: AppColors.slate500)),
                  const Spacer(),
                  Text(_step == 1 ? 'Vóc dáng & số đo' : _step == 2 ? 'Phong cách' : 'Gam màu', style: labelCaps(size: 11, color: AppColors.slate500)),
                ]),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(value: _step / 3, minHeight: 6, color: AppColors.primary, backgroundColor: AppColors.slate100),
                ),
                const SizedBox(height: 18),
                if (_step == 1) ...[
                  Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const FieldLabel('Chiều cao (cm)'), _input(_height, '170', type: TextInputType.number)])),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const FieldLabel('Cân nặng (kg)'), _input(_weight, '65', type: TextInputType.number)])),
                  ]),
                  const SizedBox(height: 14),
                  const FieldLabel('Dáng người của bạn'),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 2.3,
                    children: [
                      for (final (id, label, desc) in _bodies)
                        _choice(
                          selected: _body == id,
                          onTap: () => setState(() => _body = id),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                            Text(label.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                            Text(desc, style: const TextStyle(fontSize: 11)),
                          ]),
                        ),
                    ],
                  ),
                ],
                if (_step == 2)
                  for (final (id, title, desc) in _styles)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _choice(
                        selected: _style == id,
                        onTap: () => setState(() => _style = id),
                        child: Row(children: [
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(title.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(desc, style: const TextStyle(fontSize: 12)),
                            ]),
                          ),
                          if (_style == id) const Icon(Icons.check, color: AppColors.primary, size: 18),
                        ]),
                      ),
                    ),
                if (_step == 3)
                  for (final (id, title, desc, colors) in _palettes)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _choice(
                        selected: _palette == id,
                        onTap: () => setState(() => _palette = id),
                        child: Row(children: [
                          for (final c in colors)
                            Container(
                              margin: const EdgeInsets.only(right: 6),
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(color: c, shape: BoxShape.circle, border: Border.all(color: AppColors.slate300)),
                            ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(title.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                              Text(desc, style: const TextStyle(fontSize: 12)),
                            ]),
                          ),
                        ]),
                      ),
                    ),
                const Divider(height: 28, color: AppColors.slate100),
                Row(children: [
                  if (_step > 1) PillButton('Quay lại', style: PillStyle.outline, height: 44, onPressed: () => setState(() => _step--)),
                  const Spacer(),
                  PillButton(_step == 3 ? 'Hoàn thành' : 'Tiếp theo', height: 44, trailingIcon: Icons.arrow_forward, onPressed: _next),
                ]),
              ]),
            ),
        ],
      ),
    );
  }
}

// ─── Stores ─────────────────────────────────────────────────────────────────

/// Port of web app/stores: active branches from /api/shops/active.
class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});

  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  List<Map<String, dynamic>>? _shops;
  String? _error;
  String _q = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await Api.instance.get('/api/shops/active');
      if (mounted) setState(() => _shops = asList(d).whereType<Map<String, dynamic>>().toList());
    } catch (_) {
      if (mounted) setState(() => _error = 'Không thể tải danh sách cửa hàng. Vui lòng thử lại sau.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _q.toLowerCase();
    final shops = (_shops ?? []).where((s) => '${s['name'] ?? ''}'.toLowerCase().contains(q) || '${s['address'] ?? ''}'.toLowerCase().contains(q)).toList();
    return StoreScaffold(
      background: AppColors.slate50,
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          children: [
            const _Hero(
              title: 'Hệ thống showroom ET.TEE',
              text: 'Thử đồ trực tiếp và nhận tư vấn từ đội ngũ ET.TEE tại cửa hàng gần nhất.',
            ),
            const SizedBox(height: 16),
            TextField(
              onChanged: (v) => setState(() => _q = v),
              decoration: InputDecoration(
                hintText: 'Tên đường, quận huyện hoặc tên cửa hàng...',
                prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.slate400),
                filled: true,
                fillColor: Colors.white,
                isDense: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.slate200)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.slate200)),
              ),
            ),
            const SizedBox(height: 16),
            if (_error != null)
              NoticeBox(_error!)
            else if (_shops == null)
              const LoadingView(message: 'Đang tải danh sách cửa hàng...')
            else if (shops.isEmpty)
              EmptyPanel(
                icon: Icons.storefront_outlined,
                title: _shops!.isEmpty ? 'Hiện chưa có cửa hàng nào được công bố.' : 'Không tìm thấy cửa hàng phù hợp.',
              )
            else
              for (final s in shops)
                AppCard(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      const Icon(Icons.storefront_outlined, color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Expanded(child: Text('${s['name'] ?? ''}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900))),
                    ]),
                    const SizedBox(height: 8),
                    Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Icon(Icons.place_outlined, size: 16, color: AppColors.slate400),
                      const SizedBox(width: 6),
                      Expanded(child: Text('${s['address'] ?? ''}', style: const TextStyle(fontSize: 13, color: AppColors.slate600, height: 1.5))),
                    ]),
                    const Divider(height: 24, color: AppColors.slate100),
                    Row(children: [
                      if ('${s['phone'] ?? ''}'.isNotEmpty)
                        TextButton.icon(
                          onPressed: () => _open('tel:${'${s['phone']}'.replaceAll(' ', '')}'),
                          icon: const Icon(Icons.phone_outlined, size: 16, color: AppColors.slate500),
                          label: Text('${s['phone']}', style: const TextStyle(color: AppColors.slate600, fontSize: 12)),
                        ),
                      const Spacer(),
                      PillButton('Chỉ đường', height: 38, icon: Icons.navigation_outlined, radius: BorderRadius.circular(12),
                          onPressed: () => _open('https://maps.google.com/?q=${Uri.encodeComponent('${s['address'] ?? ''}')}')),
                    ]),
                  ]),
                ),
          ],
        ),
      ),
    );
  }
}

// ─── About ──────────────────────────────────────────────────────────────────

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  static const _values = [
    ('Khách hàng là trung tâm', 'Sự hài lòng của khách hàng là thước đo cao nhất cho mọi quyết định.'),
    ('Đam mê phục vụ', 'Chủ động lắng nghe, chu đáo và phục vụ bằng sự chân thành.'),
    ('Cầu tiến & sáng tạo', 'Không ngừng cải tiến chất liệu, quy trình sản xuất và trải nghiệm mua sắm.'),
    ('Trung thực & minh bạch', 'Minh bạch về chất liệu, nguồn gốc sản phẩm và chính sách bán hàng.'),
    ('Yêu thương & đồng đội', 'Môi trường làm việc hạnh phúc, cùng hỗ trợ để phát triển.'),
    ('Thời trang bền vững', 'Ưu tiên sợi hữu cơ, sợi bamboo và sợi tái chế để bảo vệ môi trường.'),
  ];

  @override
  Widget build(BuildContext context) => StoreScaffold(
        background: AppColors.slate50,
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          children: [
            _Hero(
              eyebrow: 'Câu chuyện thương hiệu ET.TEE',
              title: 'Định hình phong cách thời trang gia đình Việt',
              text: 'ET.TEE ra đời từ khát vọng mang lại sản phẩm thời trang chất lượng, thiết kế tinh tế, tối giản và thoải mái cho từng thành viên trong gia đình.',
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: PillButton('Khám phá sản phẩm', height: 44, onPressed: () => context.push('/products'))),
              const SizedBox(width: 10),
              Expanded(child: PillButton('Cửa hàng', style: PillStyle.outline, height: 44, onPressed: () => context.push('/stores'))),
            ]),
            const SizedBox(height: 20),
            const AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _SectionTitle(Icons.track_changes, 'Tầm nhìn 2030'),
                _Para('Trở thành thương hiệu thời trang gia đình hàng đầu Việt Nam, mang thiết kế hiện đại, chất liệu bền vững và dịch vụ chuẩn mực đến hàng triệu gia đình.'),
                _SectionTitle(Icons.explore_outlined, 'Sứ mệnh'),
                _Para('Mang đến sự tự tin và thoải mái trong từng trang phục hằng ngày, chú trọng từng đường kim mũi chỉ và thiết kế đồng điệu gắn kết gia đình.'),
              ]),
            ),
            const SizedBox(height: 20),
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('6 GIÁ TRỊ CỐT LÕI', style: headline(18)),
                const SizedBox(height: 12),
                for (var i = 0; i < _values.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      CircleAvatar(
                        radius: 15,
                        backgroundColor: i == 0 ? AppColors.primary : AppColors.slate900,
                        child: Text('${i + 1}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(_values[i].$1, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          const SizedBox(height: 2),
                          Text(_values[i].$2, style: const TextStyle(fontSize: 12, color: AppColors.slate600, height: 1.5)),
                        ]),
                      ),
                    ]),
                  ),
              ]),
            ),
          ],
        ),
      );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────

class FaqScreen extends StatefulWidget {
  const FaqScreen({super.key});

  @override
  State<FaqScreen> createState() => _FaqScreenState();
}

class _FaqScreenState extends State<FaqScreen> {
  String _cat = 'all';
  String _q = '';

  static const _data = [
    ('order', 'Đặt hàng & thanh toán', Icons.shopping_bag_outlined, [
      ('Làm thế nào để đặt hàng tại ET.TEE?', 'Chọn sản phẩm, màu sắc & kích cỡ, bấm "Thêm vào giỏ" hoặc "Mua ngay", rồi điền thông tin người nhận và chọn phương thức thanh toán (COD hoặc chuyển khoản).'),
      ('ET.TEE hỗ trợ những hình thức thanh toán nào?', 'Thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng qua mã QR (VietQR), thẻ ATM/Visa/Mastercard và ví MoMo/ZaloPay.'),
      ('Tôi có thể hủy hoặc sửa đơn hàng đã đặt không?', 'Nếu đơn chưa chuyển sang "Đang giao", bạn có thể liên hệ Hotline 1900 1234 để được hỗ trợ điều chỉnh miễn phí.'),
    ]),
    ('shipping', 'Giao hàng & phí ship', Icons.local_shipping_outlined, [
      ('Phí giao hàng tính như thế nào?', 'ET.TEE miễn phí vận chuyển cho mọi đơn hàng trên toàn quốc, không yêu cầu giá trị tối thiểu.'),
      ('Bao lâu thì tôi nhận được hàng?', 'Hà Nội & TP.HCM: 1–2 ngày. Các tỉnh thành khác: 2–4 ngày làm việc.'),
      ('Tôi có được kiểm tra hàng trước khi thanh toán không?', 'Có. ET.TEE hỗ trợ đồng kiểm (mở hộp xem sản phẩm) trước khi thanh toán cho nhân viên giao hàng.'),
    ]),
    ('return', 'Đổi trả 30 ngày', Icons.autorenew, [
      ('Chính sách đổi trả 30 ngày áp dụng ra sao?', 'Trong 30 ngày kể từ khi nhận hàng, sản phẩm chưa sử dụng, còn tem mác được đổi size, màu hoặc mẫu khác miễn phí.'),
      ('Tôi có thể đổi hàng tại cửa hàng không?', 'Có. Mang sản phẩm tới bất kỳ cửa hàng ET.TEE nào (xem trang Hệ thống cửa hàng) để đổi trực tiếp.'),
      ('Đổi trả qua bưu điện thì ai trả phí ship?', 'ET.TEE hỗ trợ phí ship 2 chiều nếu chật size hoặc giao sai mẫu. Đổi mẫu theo sở thích thì khách hỗ trợ phí gửi hàng.'),
    ]),
    ('size', 'Hướng dẫn chọn size', Icons.straighten, [
      ('Làm sao để biết mình mặc vừa size nào?', 'Dùng công cụ gợi ý size ở trang Hướng dẫn chọn size, hoặc mục chọn size ngay trên trang sản phẩm, theo chiều cao & cân nặng.'),
      ('Áo sơ mi ET.TEE là phom slim fit hay regular?', 'Phần lớn sơ mi nam là slim fit ôm nhẹ. Nếu thích mặc thoải mái, bạn nên tăng 1 size.'),
    ]),
  ];

  @override
  Widget build(BuildContext context) {
    final q = _q.toLowerCase();
    return StoreScaffold(
      background: AppColors.slate50,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          const _Hero(
            eyebrow: 'Trung tâm trợ giúp ET.TEE',
            title: 'Câu hỏi thường gặp',
            text: 'Giải đáp nhanh về đơn hàng, giao hàng, đổi trả 30 ngày và chọn kích cỡ.',
          ),
          const SizedBox(height: 16),
          TextField(
            onChanged: (v) => setState(() => _q = v),
            decoration: InputDecoration(
              hintText: 'Tìm câu hỏi (đổi trả, phí ship, chọn size...)',
              prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.slate400),
              isDense: true,
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.slate200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.slate200)),
            ),
          ),
          const SizedBox(height: 12),
          FilterTabs(
            tabs: [('all', 'Tất cả chủ đề'), for (final c in _data) (c.$1, c.$2)],
            value: _cat,
            onChanged: (v) => setState(() => _cat = v),
          ),
          const SizedBox(height: 16),
          for (final (cat, name, icon, items) in _data)
            if (_cat == 'all' || _cat == cat)
              Builder(builder: (_) {
                final shown = items.where((it) => it.$1.toLowerCase().contains(q) || it.$2.toLowerCase().contains(q)).toList();
                if (shown.isEmpty) return const SizedBox.shrink();
                return AppCard(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      CircleAvatar(radius: 15, backgroundColor: AppColors.primary100, child: Icon(icon, size: 16, color: AppColors.primary700)),
                      const SizedBox(width: 10),
                      Expanded(child: Text(name.toUpperCase(), style: headline(14))),
                    ]),
                    const SizedBox(height: 6),
                    for (final (question, answer) in shown)
                      Theme(
                        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                          tilePadding: EdgeInsets.zero,
                          childrenPadding: const EdgeInsets.only(bottom: 12),
                          title: Text('Q. $question', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          children: [
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.primary50,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.primary100),
                              ),
                              child: Text(answer, style: const TextStyle(fontSize: 13, height: 1.5, color: AppColors.slate700)),
                            ),
                          ],
                        ),
                      ),
                  ]),
                );
              }),
        ],
      ),
    );
  }
}

// ─── Contact ────────────────────────────────────────────────────────────────

/// No backend endpoint receives this form (customer tickets need an account), so — like the web —
/// it opens the shopper's mail app prefilled instead of pretending to send.
class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _message = TextEditingController();
  String _topic = 'size';

  static const _topics = [('size', 'Tư vấn size'), ('order', 'Tình trạng đơn hàng'), ('return', 'Đổi trả 30 ngày'), ('partner', 'Hợp tác kinh doanh')];

  @override
  void dispose() {
    for (final c in [_name, _phone, _email, _message]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _send() async {
    if ([_name, _phone, _email, _message].any((c) => c.text.trim().isEmpty)) {
      Toast.error('Vui lòng điền đủ họ tên, số điện thoại, email và nội dung');
      return;
    }
    final body = ['Họ tên: ${_name.text}', 'Số điện thoại: ${_phone.text}', 'Email: ${_email.text}', 'Chủ đề: $_topic', '', _message.text].join('\n');
    await _open('mailto:cskh@ettee.vn?subject=${Uri.encodeComponent('[Liên hệ ứng dụng] $_topic')}&body=${Uri.encodeComponent(body)}');
    Toast.success('Đã mở ứng dụng email với nội dung liên hệ. Bấm Gửi để hoàn tất.');
  }

  @override
  Widget build(BuildContext context) => StoreScaffold(
        background: AppColors.slate50,
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          children: [
            const _Hero(
              eyebrow: 'Chăm sóc khách hàng',
              title: 'Liên hệ với chúng tôi',
              text: 'Thắc mắc về đơn hàng, đổi trả hay tư vấn size — ET.TEE luôn sẵn sàng lắng nghe.',
            ),
            const SizedBox(height: 16),
            for (final (icon, title, value, sub, url) in const [
              (Icons.phone_outlined, 'Tổng đài tư vấn & đặt hàng', '1900 1234', '8:00 - 22:00, tất cả các ngày', 'tel:19001234'),
              (Icons.mail_outline, 'Email chăm sóc khách hàng', 'cskh@ettee.vn', 'Phản hồi trong 2-4 giờ làm việc', 'mailto:cskh@ettee.vn'),
              (Icons.place_outlined, 'Trụ sở chính', 'Tầng 3, Lotte Center, 54 Liễu Giai, Ba Đình, Hà Nội', 'Thứ 2 - Thứ 7 (8:00 - 17:30)', null),
            ])
              AppCard(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                child: InkWell(
                  onTap: url == null ? null : () => _open(url),
                  child: Row(children: [
                    CircleAvatar(radius: 20, backgroundColor: AppColors.slate100, child: Icon(icon, color: AppColors.slate700, size: 20)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(title, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                        Text(sub, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
                      ]),
                    ),
                  ]),
                ),
              ),
            const SizedBox(height: 10),
            AppCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('GỬI THẮC MẮC', style: headline(16)),
                const SizedBox(height: 14),
                const FieldLabel('Họ và tên', required: true),
                _input(_name, 'Nguyễn Văn A'),
                const SizedBox(height: 10),
                const FieldLabel('Số điện thoại', required: true),
                _input(_phone, '0987 654 321', type: TextInputType.phone),
                const SizedBox(height: 10),
                const FieldLabel('Email liên hệ', required: true),
                _input(_email, 'email@example.com', type: TextInputType.emailAddress),
                const SizedBox(height: 10),
                const FieldLabel('Chủ đề hỗ trợ'),
                FilterTabs(tabs: _topics, value: _topic, activeColor: AppColors.slate900, onChanged: (v) => setState(() => _topic = v)),
                const SizedBox(height: 10),
                const FieldLabel('Nội dung', required: true),
                _input(_message, 'Nội dung bạn cần ET.TEE hỗ trợ...', lines: 4),
                const SizedBox(height: 16),
                PillButton('Gửi qua email', expand: true, icon: Icons.send_outlined, onPressed: _send),
              ]),
            ),
          ],
        ),
      );
}

// ─── Careers ────────────────────────────────────────────────────────────────

class CareersScreen extends StatefulWidget {
  const CareersScreen({super.key});

  @override
  State<CareersScreen> createState() => _CareersScreenState();
}

class _CareersScreenState extends State<CareersScreen> {
  String _dept = 'all';

  static const _jobs = [
    ('Cửa hàng trưởng showroom', 'store', 'Hà Nội / TP.HCM', '15 - 25 triệu', 'Toàn thời gian'),
    ('Chuyên viên tư vấn bán hàng', 'store', 'Hà Nội / TP.HCM', '8 - 14 triệu', 'Toàn thời gian / xoay ca'),
    ('Senior Fullstack Developer (Next.js & Python)', 'tech', 'Hà Nội / Remote', '30 - 45 triệu', 'Toàn thời gian'),
    ('Chuyên viên AI & Recommendation System', 'tech', 'Hà Nội', '35 - 50 triệu', 'Toàn thời gian'),
    ('Thiết kế thời trang (Fashion Designer)', 'office', 'Hải Dương / Hà Nội', '20 - 30 triệu', 'Toàn thời gian'),
    ('Chuyên viên Marketing & Performance Ads', 'office', 'Hà Nội', '15 - 25 triệu', 'Toàn thời gian'),
  ];

  /// No backend receives applications: opens a prefilled e-mail to the recruiting inbox (as the web does).
  Future<void> _apply(String title) async {
    final name = TextEditingController(), phone = TextEditingController(), email = TextEditingController(), cv = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (c) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.of(c).viewInsets.bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('ỨNG TUYỂN VỊ TRÍ', style: headline(15)),
          Text(title, style: const TextStyle(color: AppColors.primary700, fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(height: 14),
          const FieldLabel('Họ và tên', required: true),
          _input(name, 'Nguyễn Văn A'),
          const SizedBox(height: 8),
          const FieldLabel('Số điện thoại', required: true),
          _input(phone, '0987654321', type: TextInputType.phone),
          const SizedBox(height: 8),
          const FieldLabel('Email', required: true),
          _input(email, 'email@example.com', type: TextInputType.emailAddress),
          const SizedBox(height: 8),
          const FieldLabel('Link CV / giới thiệu'),
          _input(cv, 'Đường dẫn CV (Google Drive, TopCV...)', lines: 2),
          const SizedBox(height: 16),
          PillButton('Gửi hồ sơ qua email', expand: true, onPressed: () {
            if ([name, phone, email].any((x) => x.text.trim().isEmpty)) {
              Toast.error('Vui lòng điền họ tên, số điện thoại và email');
              return;
            }
            Navigator.pop(c, true);
          }),
        ]),
      ),
    );
    if (ok == true) {
      final body = ['Vị trí ứng tuyển: $title', 'Họ tên: ${name.text}', 'Số điện thoại: ${phone.text}', 'Email: ${email.text}', 'Link CV: ${cv.text}'].join('\n');
      await _open('mailto:tuyendung@ettee.vn?subject=${Uri.encodeComponent('[Ứng tuyển] $title')}&body=${Uri.encodeComponent(body)}');
      Toast.success('Đã mở ứng dụng email với hồ sơ của bạn. Bấm Gửi để hoàn tất.');
    }
    for (final x in [name, phone, email, cv]) {
      x.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final jobs = _jobs.where((j) => _dept == 'all' || j.$2 == _dept).toList();
    return StoreScaffold(
      background: AppColors.slate50,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          const _Hero(
            eyebrow: 'Gia nhập ngôi nhà ET.TEE',
            title: 'Cùng phát triển sự nghiệp',
            text: 'Môi trường trẻ trung, năng động, nơi năng lực được công nhận và lộ trình thăng tiến rộng mở.',
          ),
          const SizedBox(height: 16),
          for (final (icon, t, d) in const [
            (Icons.payments_outlined, 'Thu nhập cạnh tranh', 'Lương thưởng theo năng lực, thưởng doanh số hằng tháng và lễ tết.'),
            (Icons.school_outlined, 'Đào tạo & phát triển', 'Khóa đào tạo kỹ năng, lãnh đạo và chuyên môn định kỳ miễn phí.'),
            (Icons.groups_outlined, 'Môi trường hạnh phúc', 'Teambuilding hằng năm, giảm 30% khi mua sắm cho nhân viên.'),
          ])
            AppCard(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                CircleAvatar(radius: 20, backgroundColor: AppColors.slate100, child: Icon(icon, color: AppColors.slate700, size: 20)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(t, style: const TextStyle(fontWeight: FontWeight.w800)),
                    Text(d, style: const TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.4)),
                  ]),
                ),
              ]),
            ),
          const SizedBox(height: 10),
          AppCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('VỊ TRÍ ĐANG TUYỂN', style: headline(16)),
              const SizedBox(height: 12),
              FilterTabs(
                tabs: const [('all', 'Tất cả'), ('store', 'Khối cửa hàng'), ('tech', 'Công nghệ'), ('office', 'Văn phòng & thiết kế')],
                value: _dept,
                onChanged: (v) => setState(() => _dept = v),
              ),
              const SizedBox(height: 14),
              for (final (title, _, location, salary, type) in jobs)
                Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(type, style: const TextStyle(fontSize: 11, color: AppColors.slate400, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                    const SizedBox(height: 6),
                    Row(children: [
                      const Icon(Icons.place_outlined, size: 14, color: AppColors.slate400),
                      const SizedBox(width: 4),
                      Expanded(child: Text(location, style: const TextStyle(fontSize: 12, color: AppColors.slate500))),
                      Text(salary, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.slate800)),
                    ]),
                    const SizedBox(height: 10),
                    PillButton('Ứng tuyển', style: PillStyle.dark, height: 38, expand: true, trailingIcon: Icons.arrow_forward, onPressed: () => _apply(title)),
                  ]),
                ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ─── Policies ───────────────────────────────────────────────────────────────

class PolicyScreen extends StatelessWidget {
  const PolicyScreen({super.key});

  static const _items = [
    (Icons.local_shipping_outlined, 'Chính sách vận chuyển', '/policy/shipping', 'Freeship toàn quốc cho mọi đơn hàng, nhận hàng trong 1 - 4 ngày.', 'Freeship mọi đơn'),
    (Icons.autorenew, 'Chính sách đổi trả 30 ngày', '/policy/return', 'Đổi trả miễn phí trong 30 ngày tại cửa hàng hoặc shipper tới lấy tận nhà.', 'Cam kết 30 ngày'),
    (Icons.verified_user_outlined, 'Chính sách bảo hành', '/policy/warranty', 'Sửa khóa kéo, đường may miễn phí 6 tháng; đổi mới khi lỗi nhà sản xuất.', 'Bảo hành 6 tháng'),
    (Icons.workspace_premium_outlined, 'ET.TEE Club & tích điểm', '/policy/membership', 'Tích điểm 1% - 5% mỗi đơn, quà sinh nhật và ưu đãi hội viên.', 'Hạng VIP Club'),
  ];

  @override
  Widget build(BuildContext context) => StoreScaffold(
        background: AppColors.slate50,
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
          children: [
            const _Hero(
              eyebrow: 'Quyền lợi khách hàng',
              title: 'Chính sách khách hàng ET.TEE',
              text: 'Chính sách minh bạch, đổi trả 30 ngày và dịch vụ hậu mãi chu đáo.',
            ),
            const SizedBox(height: 16),
            for (final (icon, title, href, desc, badge) in _items)
              AppCard(
                margin: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () => context.push(href),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      CircleAvatar(radius: 22, backgroundColor: AppColors.primary100, child: Icon(icon, color: AppColors.primary700)),
                      const Spacer(),
                      StatusPill(badge, bg: AppColors.primary50, fg: AppColors.primary900, border: AppColors.primary200),
                    ]),
                    const SizedBox(height: 12),
                    Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    Text(desc, style: const TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.5)),
                    const Divider(height: 22, color: AppColors.slate100),
                    const Row(children: [
                      Text('Xem chi tiết điều khoản', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward, size: 15),
                    ]),
                  ]),
                ),
              ),
          ],
        ),
      );
}

/// /policy/shipping | return | warranty | membership
class PolicyDetailScreen extends StatelessWidget {
  final String kind;
  const PolicyDetailScreen({super.key, required this.kind});

  static const _tiers = [
    ('Bronze', 'Khởi tạo', 'Tích điểm 1% trên mỗi hóa đơn'),
    ('Silver', 'Tích lũy 3.000.000₫', 'Tích điểm 2% • Giảm 5% tháng sinh nhật'),
    ('Gold', 'Tích lũy 8.000.000₫', 'Tích điểm 3% • Giảm 10% tháng sinh nhật • Freeship mọi đơn'),
    ('Diamond VIP', 'Tích lũy 15.000.000₫', 'Tích điểm 5% • Giảm 15% tháng sinh nhật • Quyền mua ưu tiên BST mới'),
  ];

  @override
  Widget build(BuildContext context) {
    switch (kind) {
      case 'shipping':
        return const _ArticlePage(eyebrow: 'Delivery Policy', title: 'Chính sách vận chuyển & giao hàng', children: [
          _SectionTitle(Icons.local_shipping_outlined, '1. Biểu phí vận chuyển toàn quốc'),
          _Callout(Icons.check_circle_outline, 'Miễn phí vận chuyển (freeship)', 'Áp dụng cho mọi đơn hàng, không yêu cầu giá trị tối thiểu.'),
          _SectionTitle(Icons.schedule, '2. Thời gian giao hàng dự kiến'),
          _Bullets([
            'Nội thành Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng: 1 - 2 ngày làm việc.',
            'Ngoại thành & các tỉnh khác: 2 - 4 ngày làm việc.',
          ]),
          _SectionTitle(Icons.fact_check_outlined, '3. Đồng kiểm khi nhận hàng'),
          _Para('Quý khách được mở gói hàng kiểm tra số lượng, màu sắc, size trước khi thanh toán cho nhân viên giao hàng (COD).'),
          _Para('Lưu ý: kiểm tra ngoại quan, chưa thử trực tiếp trước mặt shipper. Nếu sản phẩm không đúng mô tả, quý khách có quyền từ chối nhận hàng không mất phí.',
              color: AppColors.slate500),
        ]);
      case 'return':
        return const _ArticlePage(eyebrow: '30-Day Guarantee', title: 'Chính sách đổi trả 30 ngày', children: [
          _Callout(Icons.autorenew, 'Không hài lòng, đổi trả trong 30 ngày',
              'Mặc thử không vừa, không ưng màu hay phom dáng: ET.TEE đổi size, đổi mẫu miễn phí trong 30 ngày kể từ ngày nhận hàng.'),
          _SectionTitle(Icons.check_circle_outline, '1. Điều kiện đổi hàng'),
          _Bullets([
            'Sản phẩm còn nguyên tem, mác, niêm phong.',
            'Chưa qua sử dụng, giặt tẩy, không bẩn hay ám mùi.',
            'Trong 30 ngày kể từ ngày giao hàng thành công.',
          ]),
          _SectionTitle(Icons.verified_user_outlined, '2. Cách đổi hàng'),
          _Para('Cách 1 — tại showroom: mang sản phẩm kèm hóa đơn hoặc số điện thoại đến bất kỳ cửa hàng ET.TEE nào để thử và đổi ngay.'),
          _Para('Cách 2 — tận nhà: gọi Hotline 1900 1234, nhân viên giao sản phẩm mới và thu hồi sản phẩm cũ cùng lúc.'),
        ]);
      case 'warranty':
        return const _ArticlePage(eyebrow: 'Product Warranty', title: 'Chính sách bảo hành & sửa chữa', children: [
          _Callout(Icons.verified_user_outlined, 'Bảo hành đường may & phụ kiện 6 tháng',
              'Sửa miễn phí lỗi bung chỉ, hỏng khóa kéo, đứt cúc áo trong 6 tháng kể từ khi mua.'),
          _SectionTitle(Icons.build_outlined, '1. Sản phẩm được bảo hành'),
          _Bullets([
            'Áo sơ mi, polo, áo phông: đường chỉ may, cúc áo, bác tay, đường cuốn biên.',
            'Quần tây, jeans, kaki: đỉa quần, đường may đũng, khóa kéo.',
            'Áo khoác, áo phao, windbreaker: khóa kéo chính, cúc bấm, dây rút gấu áo.',
          ]),
          _SectionTitle(Icons.check_circle_outline, '2. Đổi mới khi lỗi nhà sản xuất'),
          _Para('Sản phẩm lỗi vải (lốm đốm màu, thủng lỗ, lệch phom dáng) được đổi mới 100% miễn phí.'),
        ]);
      case 'membership':
        return _ArticlePage(eyebrow: 'ET.TEE Club Loyalty', title: 'Chương trình khách hàng thân thiết', children: [
          const _Para('Mọi khách hàng có tài khoản ET.TEE đều là hội viên ET.TEE Club, được tích điểm ở cả online và showroom.'),
          const _SectionTitle(Icons.workspace_premium_outlined, 'Các hạng hội viên & đặc quyền'),
          for (var i = 0; i < _tiers.length; i++)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: i == 3 ? AppColors.slate900 : AppColors.slate50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: i == 3 ? AppColors.slate900 : AppColors.slate200),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(_tiers[i].$1.toUpperCase(), style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: i == 3 ? Colors.white : AppColors.slate900)),
                  const Spacer(),
                  Text(_tiers[i].$2, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: i == 3 ? AppColors.slate300 : AppColors.slate500)),
                ]),
                const SizedBox(height: 6),
                Text(_tiers[i].$3, style: TextStyle(fontSize: 12, color: i == 3 ? AppColors.slate200 : AppColors.slate600)),
              ]),
            ),
          const SizedBox(height: 6),
          const _Callout(Icons.card_giftcard, 'Quà tặng sinh nhật',
              'Trong tháng sinh nhật, ET.TEE gửi voucher giảm 5% - 15% kèm phần quà bất ngờ về địa chỉ của bạn.'),
        ]);
      default:
        return const PolicyScreen();
    }
  }
}

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) => const _ArticlePage(eyebrow: 'Data Privacy', title: 'Chính sách bảo mật thông tin', children: [
        _Para('ET.TEE cam kết bảo vệ thông tin cá nhân của khách hàng và chỉ sử dụng thông tin để mang tới dịch vụ mua sắm tốt nhất.'),
        _SectionTitle(Icons.lock_outline, '1. Thu thập thông tin cá nhân'),
        _Para('Họ tên, số điện thoại, email, địa chỉ giao hàng và lịch sử đơn hàng khi bạn tạo tài khoản hoặc đặt hàng.'),
        _SectionTitle(Icons.verified_user_outlined, '2. Mục đích sử dụng'),
        _Bullets([
          'Xử lý và giao đơn hàng.',
          'Thông báo tình trạng vận chuyển.',
          'Tư vấn size và gợi ý sản phẩm phù hợp.',
          'Gửi ưu đãi cho hội viên đã đồng ý nhận email.',
        ]),
        _SectionTitle(Icons.check_circle_outline, '3. Không chia sẻ cho bên thứ ba'),
        _Para('ET.TEE không bán hay trao đổi thông tin cá nhân vì mục đích thương mại. Thông tin chỉ được cung cấp cho đơn vị vận chuyển (GHN, GHTK, Viettel Post) để giao hàng.'),
      ]);
}

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) => const _ArticlePage(eyebrow: 'Terms of Service', title: 'Điều khoản sử dụng dịch vụ', children: [
        _Para('Khi sử dụng ứng dụng và website ET.TEE, quý khách đồng ý với các điều khoản mua bán dưới đây.'),
        _SectionTitle(Icons.description_outlined, '1. Tài khoản & nghĩa vụ khách hàng'),
        _Para('Cung cấp chính xác tên, số điện thoại và địa chỉ giao hàng; tự bảo mật mật khẩu tài khoản.'),
        _SectionTitle(Icons.verified_user_outlined, '2. Giá cả & xác nhận đơn hàng'),
        _Para('Giá niêm yết đã gồm VAT. ET.TEE có quyền điều chỉnh giá hoặc hủy đơn khi có sai sót kỹ thuật hiển thị giá bất thường.'),
        _SectionTitle(Icons.info_outline, '3. Quyền sở hữu trí tuệ'),
        _Para('Hình ảnh, thiết kế, logo và nội dung thuộc bản quyền ET.TEE Studio; nghiêm cấm sao chép vì mục đích thương mại khi chưa có đồng ý bằng văn bản.'),
      ]);
}

// ─── Unsubscribe ────────────────────────────────────────────────────────────

/// Target of the "Hủy đăng ký" link in marketing e-mails, when opened in the app.
class UnsubscribeScreen extends StatefulWidget {
  final String token;
  const UnsubscribeScreen({super.key, required this.token});

  @override
  State<UnsubscribeScreen> createState() => _UnsubscribeScreenState();
}

class _UnsubscribeScreenState extends State<UnsubscribeScreen> {
  String _state = 'working';

  @override
  void initState() {
    super.initState();
    if (widget.token.isEmpty) {
      _state = 'invalid';
      return;
    }
    Api.instance.send('POST', '/api/public/unsubscribe', body: {'token': widget.token}).then((res) {
      final ok = res.ok && res.data is Map && (res.data as Map)['unsubscribed'] == true;
      if (mounted) setState(() => _state = ok ? 'done' : 'invalid');
    }).catchError((_) {
      if (mounted) setState(() => _state = 'error');
    });
  }

  @override
  Widget build(BuildContext context) {
    final text = switch (_state) {
      'working' => 'Đang xử lý…',
      'done' => 'Bạn sẽ không nhận email khuyến mãi từ ET.TEE nữa. Email về đơn hàng vẫn được gửi bình thường. Muốn nhận lại, bật trong Voucher của tôi.',
      'invalid' => 'Liên kết hủy đăng ký không hợp lệ hoặc đã hết hiệu lực.',
      _ => 'Không kết nối được máy chủ, vui lòng thử lại sau.',
    };
    return StoreScaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 60, 24, 40),
        children: [
          Text('HỦY NHẬN EMAIL ƯU ĐÃI', textAlign: TextAlign.center, style: headline(22)),
          const SizedBox(height: 16),
          Text(text, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate600, height: 1.6)),
          if (_state == 'done') ...[
            const SizedBox(height: 20),
            Center(child: PillButton('Voucher của tôi', style: PillStyle.outline, onPressed: () => context.push('/account/vouchers'))),
          ],
        ],
      ),
    );
  }
}
