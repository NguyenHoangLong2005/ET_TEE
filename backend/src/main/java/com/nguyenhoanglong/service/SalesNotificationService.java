package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.SystemNotification;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.SystemNotificationRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Set;

/** Gui thong bao ca nhan (chuong) cho nhan vien ban hang cua chi nhanh khi co don moi can xac nhan. */
@Service
public class SalesNotificationService {
    private static final Logger log = LoggerFactory.getLogger(SalesNotificationService.class);
    private static final Set<Role> RECIPIENT_ROLES = Set.of(Role.SALES_STAFF, Role.SHOP_OWNER);

    private final UserRepository userRepository;
    private final SystemNotificationRepository notificationRepository;

    public SalesNotificationService(UserRepository userRepository, SystemNotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    /** Khong bao gio nem loi: thong bao that bai khong duoc lam hong luong dat hang. */
    public void notifyNewOrderAwaitingConfirmation(Order order) {
        try {
            if (order == null || order.getShopId() == null) return;
            for (User u : userRepository.findByShopId(order.getShopId())) {
                if (u.getRole() == null || !RECIPIENT_ROLES.contains(u.getRole())) continue;
                if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) continue;
                SystemNotification n = new SystemNotification();
                n.setType("NEW_ORDER");
                n.setTitle("Có đơn hàng mới cần xác nhận");
                n.setMessage("Đơn " + order.getOrderCode() + " của " + order.getCustomerName()
                        + " - " + String.format("%,.0f", order.getTotalAmount() != null ? order.getTotalAmount() : 0.0) + "₫.");
                n.setSeverity("INFO");
                n.setTargetUrl("/staff/dashboard/sales/orders?filter=new");
                n.setRecipientUserId(u.getId());
                notificationRepository.save(n);
            }
        } catch (Exception ex) {
            log.warn("Không thể gửi thông báo đơn mới {}", order != null ? order.getOrderCode() : null, ex);
        }
    }
}
