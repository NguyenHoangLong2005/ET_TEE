package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Emails the customer every time their order moves to a new status.
 *
 * Triggered from {@code OrderStatusHistoryMailListener}: every code path that changes an order's
 * status records an order_status_history row, so hooking that row covers payment, confirmation,
 * picking, packing, hand-over, shipping, delivery, cancellation, returns and refunds without
 * touching each service. Runs asynchronously and never throws - a mail problem must not undo or
 * block the status change itself. Every attempt is written to email_logs by {@link MailService}.
 */
@Service
public class OrderStatusNotificationService {

    private static final Logger log = LoggerFactory.getLogger(OrderStatusNotificationService.class);

    private final OrderRepository orderRepository;
    private final MailService mailService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    public OrderStatusNotificationService(OrderRepository orderRepository, MailService mailService) {
        this.orderRepository = orderRepository;
        this.mailService = mailService;
    }

    /** headline / body shown to the customer for a status */
    private record Message(String headline, String body) {}

    @Async("taskExecutor")
    public void notifyStatusChange(Long orderId, String fromStatus, String toStatus, String reason) {
        try {
            if (orderId == null || toStatus == null) return;
            // The first history row of an order is the checkout itself; the confirmation mail covers it.
            if (fromStatus == null || fromStatus.isBlank() || fromStatus.equals(toStatus)) return;

            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) return;
            String to = order.getCustomerEmail();
            if (to == null || to.isBlank()) return;

            OrderStatus target;
            OrderStatus previous;
            try {
                target = OrderStatus.valueOf(toStatus);
                previous = OrderStatus.valueOf(fromStatus);
            } catch (IllegalArgumentException e) {
                return; // status text that is not part of the enum (legacy data): nothing to say
            }

            Message message = messageFor(order, previous, target, reason);
            if (message == null) return;

            String subject = message.headline() + " - đơn hàng #" + order.getOrderCode();
            mailService.sendHtml(to, subject, buildHtml(order, message, target));
        } catch (Exception e) {
            log.warn("Order status email failed (orderId={}, {} -> {}): {}", orderId, fromStatus, toStatus, e.getMessage());
        }
    }

    private Message messageFor(Order order, OrderStatus from, OrderStatus to, String reason) {
        return switch (to) {
            case DRAFT, PENDING_PAYMENT -> null;
            case PENDING_CONFIRMATION -> from == OrderStatus.PENDING_PAYMENT
                    ? ("BANK_TRANSFER".equals(order.getPaymentMethod())
                        ? new Message("Đã nhận thanh toán",
                            "Chúng tôi đã nhận được khoản thanh toán chuyển khoản của bạn. Đơn hàng đang chờ được xác nhận.")
                        : new Message("Đơn hàng chuyển sang thanh toán khi nhận hàng",
                            "Đơn hàng của bạn sẽ được thanh toán khi nhận hàng (COD) và đang chờ được xác nhận."))
                    : new Message("Đơn hàng đang chờ xác nhận", "Đơn hàng của bạn đã được ghi nhận và đang chờ xác nhận.");
            case CONFIRMED -> new Message("Đơn hàng đã được xác nhận",
                    "ET.TEE đã xác nhận đơn hàng của bạn và bắt đầu xử lý.");
            case PICKING -> new Message("Đang chuẩn bị hàng",
                    "Kho đang lấy hàng và chuẩn bị đơn hàng của bạn.");
            case PACKED -> new Message("Đơn hàng đã được đóng gói",
                    "Đơn hàng của bạn đã đóng gói xong và sắp được bàn giao cho đơn vị vận chuyển.");
            case HANDED_TO_CARRIER -> new Message("Đã bàn giao cho đơn vị vận chuyển",
                    "Đơn hàng của bạn đã được bàn giao cho đơn vị vận chuyển.");
            case SHIPPING -> new Message("Đơn hàng đang được giao",
                    "Đơn hàng của bạn đang trên đường giao đến bạn. Vui lòng chú ý điện thoại để nhận hàng.");
            case DELIVERED -> new Message("Giao hàng thành công",
                    "Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã mua sắm tại ET.TEE, hãy để lại đánh giá sản phẩm nhé.");
            case CANCELLED -> new Message("Đơn hàng đã bị hủy",
                    "Đơn hàng của bạn đã bị hủy." + reasonSuffix(reason));
            case RETURN_REQUESTED -> new Message("Đã tiếp nhận yêu cầu đổi trả",
                    "Chúng tôi đã tiếp nhận yêu cầu đổi trả của bạn và sẽ liên hệ sớm." + reasonSuffix(reason));
            case RETURNED -> new Message("Đã nhận hàng trả",
                    "Chúng tôi đã nhận được hàng trả của bạn." + reasonSuffix(reason));
            case REFUNDED -> new Message("Đã hoàn tiền",
                    "Khoản tiền của đơn hàng đã được hoàn lại cho bạn." + reasonSuffix(reason));
        };
    }

    private String reasonSuffix(String reason) {
        return reason == null || reason.isBlank() ? "" : " Lý do: " + reason.trim();
    }

    private String buildHtml(Order order, Message message, OrderStatus status) {
        String name = order.getCustomerName() != null && !order.getCustomerName().isBlank()
                ? esc(order.getCustomerName().trim()) : "bạn";
        boolean negative = status == OrderStatus.CANCELLED || status == OrderStatus.RETURNED
                || status == OrderStatus.RETURN_REQUESTED;
        String accent = negative ? "#B45309" : (status == OrderStatus.DELIVERED ? "#059669" : "#E50027");

        StringBuilder html = new StringBuilder();
        html.append("<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a\">");
        html.append("<div style=\"padding:20px 0;border-bottom:3px solid ").append(accent).append(";\">")
                .append("<strong style=\"font-size:20px;letter-spacing:1px\">ET.TEE</strong></div>");
        html.append("<h2 style=\"margin:24px 0 8px;color:").append(accent).append("\">").append(esc(message.headline())).append("</h2>");
        html.append("<p style=\"line-height:1.6\">Xin chào ").append(name).append(",</p>");
        html.append("<p style=\"line-height:1.6\">").append(esc(message.body())).append("</p>");
        html.append("<table style=\"width:100%;border-collapse:collapse;margin:20px 0;font-size:14px\">")
                .append("<tr><td style=\"padding:8px 0;color:#64748b\">Mã đơn hàng</td><td style=\"padding:8px 0;text-align:right\"><strong>#")
                .append(esc(order.getOrderCode())).append("</strong></td></tr>");
        if (order.getTotalAmount() != null) {
            html.append("<tr><td style=\"padding:8px 0;color:#64748b\">Tổng thanh toán</td><td style=\"padding:8px 0;text-align:right\"><strong>")
                    .append(String.format(Locale.forLanguageTag("vi-VN"), "%,.0f", order.getTotalAmount())).append("đ</strong></td></tr>");
        }
        html.append("</table>");
        // Only registered customers can open the order page (it needs their login).
        if (order.getUser() != null) {
            html.append("<p><a href=\"").append(esc(frontendUrl)).append("/account/orders/").append(esc(order.getOrderCode()))
                    .append("\" style=\"display:inline-block;background:").append(accent)
                    .append(";color:#fff;text-decoration:none;padding:12px 24px;border-radius:24px;font-weight:bold\">Xem đơn hàng</a></p>");
        }
        html.append("<p style=\"color:#64748b;font-size:13px;margin-top:28px\">Cần hỗ trợ? Hãy trả lời email này hoặc liên hệ CSKH của ET.TEE.<br>Trân trọng,<br>ET.TEE Shop</p>");
        html.append("</div>");
        return html.toString();
    }

    private static String esc(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
