package com.nguyenhoanglong.config;

import com.nguyenhoanglong.dto.CreateCodReconciliationDto;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.ImageStorageService;
import com.nguyenhoanglong.service.OrderService;
import com.nguyenhoanglong.service.SalesOrderService;
import com.nguyenhoanglong.service.ShippingService;
import com.nguyenhoanglong.service.WarehouseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Supplier;

/**
 * Du lieu DEMO cho cac man hinh nhan vien (ban hang, kho, van chuyen, COD, tra hang).
 *
 * <p>Moi don di qua DUNG cac service nghiep vu that (SalesOrderService, WarehouseService,
 * ShippingService, OrderService.requestReturn) nen trang thai don / kien / ton kho / lich su
 * luon khop nhau. Anh bang chung giao hang la anh minh hoa (resources/demo/proofs) duoc luu vao
 * thu muc upload that, nen "Xem anh bang chung" mo duoc.</p>
 *
 * <p>Chi chay khi {@code app.demo-seed.enabled=true} (mot lan, luc khoi dong) va chua co don demo
 * nao (ma don bat dau bang {@value #CODE_PREFIX}). Khach demo khong co email, nen khong gui email.</p>
 */
@Component
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    static final String CODE_PREFIX = "DHDM";

    /** Diem dung cua tung don trong luong nghiep vu. */
    enum Stage {
        PENDING, CONFIRMED, PICKING, PACKED, READY_TO_SHIP,
        SHIP_PENDING, HANDED_OVER, IN_TRANSIT, DELIVERED, RETURN_REQUESTED,
        EXCEPTION, RETURNED, CANCELLED
    }

    /** So don cho moi diem dung (tong 44 don). */
    static final Map<Stage, Integer> PLAN = new LinkedHashMap<>();
    static {
        PLAN.put(Stage.PENDING, 6);
        PLAN.put(Stage.CONFIRMED, 4);
        PLAN.put(Stage.PICKING, 3);
        PLAN.put(Stage.PACKED, 3);
        PLAN.put(Stage.READY_TO_SHIP, 3);
        PLAN.put(Stage.SHIP_PENDING, 2);
        PLAN.put(Stage.HANDED_OVER, 2);
        PLAN.put(Stage.IN_TRANSIT, 4);
        PLAN.put(Stage.DELIVERED, 10);
        PLAN.put(Stage.RETURN_REQUESTED, 2);
        PLAN.put(Stage.EXCEPTION, 1);
        PLAN.put(Stage.RETURNED, 1);
        PLAN.put(Stage.CANCELLED, 3);
    }

    private static final String[] NAMES = {
            "Nguyễn Thị Lan", "Trần Minh Quân", "Lê Hoàng Anh", "Phạm Thu Trang", "Hoàng Văn Nam",
            "Vũ Ngọc Hân", "Đặng Quốc Bảo", "Bùi Thanh Hương", "Đỗ Gia Huy", "Ngô Mỹ Linh",
            "Dương Khánh Vy", "Lý Tuấn Kiệt", "Phan Bảo Ngọc", "Trịnh Đức Thắng", "Mai Phương Thảo",
            "Hồ Nhật Minh", "Tô Hải Yến", "Võ Thành Đạt", "Châu Kim Ngân", "Lâm Gia Bảo",
            "Quách Thùy Dung", "Kiều Anh Thư", "Tạ Quang Vinh", "Cao Hồng Nhung"};
    private static final String[] ADDRESSES = {
            "12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
            "45 Lê Văn Sỹ, Phường 13, Quận 3, TP. Hồ Chí Minh",
            "210 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh",
            "88 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP. Hồ Chí Minh",
            "Chung cư Sunrise City, 23 Nguyễn Hữu Thọ, Quận 7, TP. Hồ Chí Minh",
            "156 Quang Trung, Phường 10, Quận Gò Vấp, TP. Hồ Chí Minh",
            "32 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh",
            "19 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội",
            "102 Kim Mã, Phường Kim Mã, Quận Ba Đình, Hà Nội",
            "7 Lý Thường Kiệt, Phường Hàng Bài, Quận Hoàn Kiếm, Hà Nội",
            "68 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Đà Nẵng",
            "25 Hùng Vương, Phường An Cựu, TP. Huế",
            "140 Trần Hưng Đạo, Phường Ninh Kiều, TP. Cần Thơ",
            "9 Lê Lợi, Phường 1, TP. Vũng Tàu"};
    private static final String[] NOTES = {
            null, null, null, "Giao giờ hành chính giúp em", "Gọi trước khi giao", null,
            "Để ở bảo vệ nếu không có nhà", null, "Gói quà giúp shop nhé", null};
    private static final String[] CARRIERS = {"GHN", "GHTK", "J&T", "GHN"};
    private static final String[] RECEIVERS_NOTE = {
            "Khách nhận trực tiếp", "Người nhà nhận hộ", "Gửi bảo vệ tòa nhà", "Đặt trước cửa theo yêu cầu khách"};

    private final boolean enabled;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final OrderRepository orders;
    private final ProductVariantRepository variants;
    private final OrderStatusHistoryRepository histories;
    private final ShipmentRepository shipments;
    private final UserRepository users;
    private final SalesOrderService sales;
    private final WarehouseService warehouse;
    private final ShippingService shipping;
    private final OrderService orderService;
    private final ImageStorageService images;

    public DemoDataSeeder(@Value("${app.demo-seed.enabled:false}") boolean enabled,
                          JdbcTemplate jdbc, TransactionTemplate tx, OrderRepository orders,
                          ProductVariantRepository variants, OrderStatusHistoryRepository histories,
                          ShipmentRepository shipments, UserRepository users, SalesOrderService sales,
                          WarehouseService warehouse, ShippingService shipping, OrderService orderService,
                          ImageStorageService images) {
        this.enabled = enabled;
        this.jdbc = jdbc;
        this.tx = tx;
        this.orders = orders;
        this.variants = variants;
        this.histories = histories;
        this.shipments = shipments;
        this.users = users;
        this.sales = sales;
        this.warehouse = warehouse;
        this.shipping = shipping;
        this.orderService = orderService;
        this.images = images;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if (!enabled) return;
        try {
            Map<String, Integer> result = seed();
            log.info("Demo data: {}", result);
        } catch (RuntimeException e) {
            log.error("Demo data seeding failed: {}", e.getMessage(), e);
        }
    }

    /** Tao du lieu demo; tra ve so don theo trang thai cuoi. Khong lam gi neu da co don demo. */
    public Map<String, Integer> seed() {
        Integer existing = jdbc.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE order_code LIKE ?", Integer.class, CODE_PREFIX + "%");
        if (existing != null && existing > 0) {
            log.info("Demo data already present ({} orders), skipping", existing);
            return Map.of("skipped", existing);
        }

        List<Long> variantPool = pickVariants();
        if (variantPool.isEmpty()) throw new IllegalStateException("Không có biến thể sản phẩm nào còn đủ tồn kho để tạo đơn demo");

        User salesUser = firstUser(Role.SALES_STAFF);
        User warehouseUser = firstUser(Role.WAREHOUSE_STAFF);
        User shippingUser = firstUser(Role.SHIPPING_STAFF);
        if (shippingUser == null) throw new IllegalStateException("Cần ít nhất một tài khoản nhân viên vận chuyển đang hoạt động");

        List<String> proofUrls = storeProofImages();
        Random rnd = new Random(20261105L);
        List<Stage> stages = new ArrayList<>();
        PLAN.forEach((stage, n) -> { for (int i = 0; i < n; i++) stages.add(stage); });

        Map<String, Integer> done = new TreeMap<>();
        List<Long> deliveredCodShipments = new ArrayList<>();
        int index = 0;
        for (Stage stage : stages) {
            index++;
            try {
                OrderRun run = new OrderRun(stage, index, rnd);
                run.create(variantPool);
                run.advance(salesUser, warehouseUser, shippingUser, proofUrls);
                run.backdate();
                if (run.codDelivered) deliveredCodShipments.add(run.shipmentId);
                done.merge(stage.name(), 1, Integer::sum);
            } catch (RuntimeException e) {
                log.warn("Demo order #{} ({}) stopped early: {}", index, stage, e.getMessage());
                done.merge("FAILED_" + stage.name(), 1, Integer::sum);
            } finally {
                SecurityContextHolder.clearContext();
            }
        }

        // Mot phieu doi soat COD da hoan tat, de man hinh COD co ca "da doi soat" lan "cho doi soat".
        if (deliveredCodShipments.size() >= 4) {
            try {
                as(shippingUser, () -> shipping.createCodReconciliation(shippingUser,
                        new CreateCodReconciliationDto(deliveredCodShipments.subList(0, 3), "Đối soát COD tuần (dữ liệu demo)")));
                done.put("COD_RECONCILED", 3);
            } catch (RuntimeException e) {
                log.warn("Demo COD reconciliation skipped: {}", e.getMessage());
            } finally {
                SecurityContextHolder.clearContext();
            }
        }
        return done;
    }

    /** Mot don demo: tao, day qua cac buoc toi diem dung, roi doi thoi gian ve qua khu. */
    private final class OrderRun {
        final Stage stage;
        final Random rnd;
        final LocalDateTime createdAt;
        Long orderId;
        String orderCode;
        String guestToken;
        boolean cod;
        BigDecimal total;
        Long shipmentId;
        boolean codDelivered;
        final Map<String, LocalDateTime> stepTimes = new LinkedHashMap<>();
        LocalDateTime lastTime;

        OrderRun(Stage stage, int index, Random rnd) {
            this.stage = stage;
            this.rnd = rnd;
            // Don cang xa trong luong thi cang cu: don moi hom nay, don da giao 3-12 ngay truoc.
            int hoursAgo = switch (stage) {
                case PENDING -> 1 + rnd.nextInt(10);
                case CONFIRMED, CANCELLED -> 8 + rnd.nextInt(30);
                case PICKING, PACKED -> 18 + rnd.nextInt(24);
                case READY_TO_SHIP, SHIP_PENDING -> 30 + rnd.nextInt(24);
                case HANDED_OVER, IN_TRANSIT, EXCEPTION -> 48 + rnd.nextInt(48);
                case DELIVERED -> 72 + rnd.nextInt(24 * 9);
                case RETURN_REQUESTED, RETURNED -> 96 + rnd.nextInt(24 * 4);
            };
            this.createdAt = LocalDateTime.now().minusHours(hoursAgo).withMinute(rnd.nextInt(60)).withSecond(rnd.nextInt(60));
        }

        void create(List<Long> pool) {
            tx.executeWithoutResult(status -> {
                Order o = new Order();
                orderCode = CODE_PREFIX + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
                guestToken = "demo-" + UUID.randomUUID();
                o.setOrderCode(orderCode);
                o.setShopId(SingleShop.ID);
                o.setGuestToken(guestToken);
                o.setCustomerName(NAMES[rnd.nextInt(NAMES.length)]);
                o.setCustomerPhone("09" + (10000000 + rnd.nextInt(89999999)));
                o.setShippingAddressSnapshot(ADDRESSES[rnd.nextInt(ADDRESSES.length)]);
                o.setNote(NOTES[rnd.nextInt(NOTES.length)]);
                cod = rnd.nextInt(4) != 0;
                o.setPaymentMethod(cod ? "COD" : "BANK_TRANSFER");
                o.setPaymentStatus(cod ? "COD_PENDING" : "PAID");
                o.setOrderStatus(OrderStatus.PENDING_CONFIRMATION.name());
                o.setStatus(OrderStatus.PENDING_CONFIRMATION);

                List<OrderItem> items = new ArrayList<>();
                double subtotal = 0;
                int lines = 1 + rnd.nextInt(3);
                Set<Long> used = new HashSet<>();
                for (int i = 0; i < lines; i++) {
                    Long vid = pool.get(rnd.nextInt(pool.size()));
                    if (!used.add(vid)) continue;
                    ProductVariant v = variants.findById(vid).orElse(null);
                    if (v == null || v.getAvailableQuantity() == null || v.getAvailableQuantity() < 2) continue;
                    int qty = 1 + (rnd.nextInt(5) == 0 ? 1 : 0);
                    v.setAvailableQuantity(v.getAvailableQuantity() - qty);
                    if (v.getStock() != null) v.setStock(v.getStock() - qty);
                    variants.save(v);

                    BigDecimal unit = v.getSalePrice() != null ? v.getSalePrice() : v.getPrice();
                    double price = unit != null ? unit.doubleValue() : 199000;
                    OrderItem it = new OrderItem();
                    it.setOrder(o);
                    it.setProduct(v.getProduct());
                    it.setVariantId(v.getId());
                    it.setProductNameSnapshot(v.getProduct().getName());
                    List<ProductImage> imgs = v.getProduct().getImages();
                    it.setImageSnapshot(imgs != null && !imgs.isEmpty() ? imgs.get(0).getImageUrl() : null);
                    it.setColorSnapshot(v.getColor());
                    it.setSizeSnapshot(v.getSize());
                    it.setUnitPrice(price);
                    it.setQuantity(qty);
                    it.setTotalPrice(price * qty);
                    items.add(it);
                    subtotal += price * qty;
                }
                if (items.isEmpty()) throw new IllegalStateException("không chọn được sản phẩm");
                o.setItems(items);
                o.setSubtotal(subtotal);
                o.setShippingFee(0.0);
                o.setDiscountTotal(0.0);
                o.setTotalAmount(subtotal);
                total = BigDecimal.valueOf(subtotal);
                Order saved = orders.save(o);
                orderId = saved.getId();

                OrderStatusHistory h = new OrderStatusHistory();
                h.setOrderId(orderId);
                h.setStatus(OrderStatus.PENDING_CONFIRMATION.name());
                h.setReason("Khách đặt hàng trên website");
                histories.save(h);
            });
            step("PENDING_CONFIRMATION");
        }

        void advance(User salesUser, User warehouseUser, User shippingUser, List<String> proofUrls) {
            if (stage == Stage.PENDING) return;
            if (stage == Stage.CANCELLED) {
                String[] reasons = {"Khách đổi ý, không muốn mua nữa", "Khách đặt trùng đơn", "Không liên lạc được với khách để xác nhận"};
                as(salesUser, () -> sales.cancelOrder(orderId, reasons[rnd.nextInt(reasons.length)]));
                step("CANCELLED");
                return;
            }
            as(salesUser, () -> sales.confirmOrder(orderId));
            step("CONFIRMED");
            if (stage == Stage.CONFIRMED) return;

            as(warehouseUser, () -> warehouse.startPicking(orderId));
            step("PICKING");
            if (stage == Stage.PICKING) return;
            as(warehouseUser, () -> warehouse.packOrder(orderId));
            step("PACKED");
            if (stage == Stage.PACKED) return;
            as(warehouseUser, () -> warehouse.readyToShip(orderId));
            step("HANDED_TO_CARRIER");
            if (stage == Stage.READY_TO_SHIP) return;

            String carrier = CARRIERS[rnd.nextInt(CARRIERS.length)];
            String tracking = switch (carrier) {
                case "GHN" -> "GHN" + (100000000 + rnd.nextInt(899999999));
                case "GHTK" -> "S" + (10000000 + rnd.nextInt(89999999)) + ".DM";
                default -> "JT" + (1000000000L + rnd.nextInt(899999999));
            };
            Shipment s = as(shippingUser, () -> shipping.createShipment(shippingUser, orderId, carrier, tracking,
                    cod ? total : BigDecimal.ZERO));
            shipmentId = s.getId();
            step("_SHIPMENT");
            if (stage == Stage.SHIP_PENDING) return;

            if (stage == Stage.EXCEPTION || stage == Stage.RETURNED) {
                as(shippingUser, () -> shipping.handover(shippingUser, shipmentId));
                step("_HANDOVER");
                as(shippingUser, () -> shipping.startShipping(shippingUser, shipmentId));
                step("SHIPPING");
                ShippingException ex = as(shippingUser, () -> shipping.addException(shippingUser, shipmentId,
                        stage == Stage.RETURNED ? "CUSTOMER_UNREACHABLE" : "ADDRESS_ISSUE",
                        stage == Stage.RETURNED
                                ? "Gọi 3 lần không liên lạc được khách, hãng báo giao thất bại"
                                : "Địa chỉ thiếu số nhà, shipper đang liên hệ lại khách"));
                step("_EXCEPTION");
                if (stage == Stage.RETURNED) {
                    as(shippingUser, () -> shipping.resolveException(shippingUser, ex.getId(),
                            "Giao thất bại 3 lần, hoàn hàng về kho", true));
                    step("CANCELLED"); // hoan ve kho: ShippingService chuyen don sang CANCELLED
                }
                return;
            }

            as(shippingUser, () -> shipping.handover(shippingUser, shipmentId));
            step("_HANDOVER");
            if (stage == Stage.HANDED_OVER) return;
            as(shippingUser, () -> shipping.startShipping(shippingUser, shipmentId));
            step("SHIPPING");
            if (stage == Stage.IN_TRANSIT) return;

            String receiver = orders.findById(orderId).map(Order::getCustomerName).orElse("Khách hàng");
            String proof = proofUrls.isEmpty() ? null : proofUrls.get(rnd.nextInt(proofUrls.size()));
            as(shippingUser, () -> shipping.delivered(shippingUser, shipmentId, receiver, proof,
                    RECEIVERS_NOTE[rnd.nextInt(RECEIVERS_NOTE.length)]));
            step("DELIVERED");
            codDelivered = cod && stage == Stage.DELIVERED;
            if (stage == Stage.DELIVERED) return;

            // RETURN_REQUESTED: khach yeu cau tra tu trang don hang cua minh (guest token).
            String[] reasons = {"Áo bị rộng so với bảng size, muốn trả để đổi size khác",
                    "Màu thực tế khác ảnh, muốn trả hàng"};
            orderService.requestReturn(orderCode, null, guestToken, reasons[rnd.nextInt(reasons.length)]);
            step("RETURN_REQUESTED");
        }

        /** Ghi moc thoi gian cua mot buoc; nhan = trang thai don buoc do ghi vao lich su ("_..." = buoc kien hang). */
        private void step(String label) {
            LocalDateTime next = lastTime == null ? createdAt : lastTime.plusMinutes(25 + rnd.nextInt(6 * 60));
            LocalDateTime cap = LocalDateTime.now().minusMinutes(2);
            if (next.isAfter(cap)) next = cap.isAfter(lastTime == null ? createdAt : lastTime) ? cap : (lastTime == null ? createdAt : lastTime);
            lastTime = next;
            stepTimes.put(label, next);
        }

        /** Dua moc thoi gian cua don ve qua khu cho giong du lieu that (cac service ghi now()). */
        void backdate() {
            if (orderId == null || lastTime == null) return;
            jdbc.update("UPDATE orders SET created_at = ?, updated_at = ? WHERE id = ?",
                    ts(createdAt), ts(lastTime), orderId);
            stepTimes.forEach((label, t) -> {
                if (!label.startsWith("_")) {
                    jdbc.update("UPDATE order_status_history SET created_at = ? WHERE order_id = ? AND status = ?",
                            ts(t), orderId, label);
                }
            });
            if (shipmentId == null) return;
            LocalDateTime handover = stepTimes.get("_HANDOVER");
            LocalDateTime delivered = stepTimes.get("DELIVERED");
            jdbc.update("UPDATE shipments SET handover_at = ?, delivered_at = ? WHERE shipment_id = ?",
                    handover == null ? null : ts(handover), delivered == null ? null : ts(delivered), shipmentId);
            if (delivered != null) {
                jdbc.update("UPDATE proof_of_delivery SET delivered_at = ? WHERE shipment_id = ?", ts(delivered), shipmentId);
            }
            LocalDateTime exception = stepTimes.get("_EXCEPTION");
            if (exception != null) {
                jdbc.update("UPDATE shipping_exceptions SET created_at = ? WHERE shipment_id = ?", ts(exception), shipmentId);
            }
        }
    }

    private static Timestamp ts(LocalDateTime t) {
        return Timestamp.valueOf(t);
    }

    /** Bien the con hang o ca cua hang (variant) lan kho (inventories) de moi buoc kho deu qua. */
    private List<Long> pickVariants() {
        List<Long> ids = new ArrayList<>(jdbc.queryForList("""
                SELECT v.id FROM product_variants v
                JOIN products p ON p.id = v.product_id
                JOIN inventories i ON i.product_id = p.id
                WHERE p.status = 'ACTIVE' AND v.available_quantity >= 5
                  AND i.shop_id = ? AND (i.quantity_on_hand - i.quantity_reserved) >= 20
                """, Long.class, SingleShop.ID));
        Collections.shuffle(ids, new Random(7));
        return ids.subList(0, Math.min(ids.size(), 40));
    }

    private User firstUser(Role role) {
        List<String> ids = jdbc.queryForList(
                "SELECT id FROM users WHERE role = ? AND status = 'ACTIVE' ORDER BY created_at", String.class, role.name());
        return ids.isEmpty() ? null : users.findById(ids.get(0)).orElse(null);
    }

    private List<String> storeProofImages() {
        List<String> urls = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            try (InputStream in = new ClassPathResource("demo/proofs/proof-" + i + ".jpg").getInputStream()) {
                urls.add(images.store(in.readAllBytes(), "proofs"));
            } catch (IOException | RuntimeException e) {
                log.warn("Demo proof image {} not stored: {}", i, e.getMessage());
            }
        }
        return urls;
    }

    /** Chay mot buoc voi danh tinh nhan vien (lich su don ghi dung nguoi thao tac). */
    private static <T> T as(User user, Supplier<T> action) {
        if (user != null) {
            var auth = new UsernamePasswordAuthenticationToken(user.getEmail(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        return action.get();
    }
}
