package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.SystemNotification;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.SystemNotificationRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Thong bao chuong cho luong phe duyet: yeu cau moi (voucher, de xuat nhap hang, dieu chinh ton kho)
 * den chu cua hang; ket qua duyet / tu choi / yeu cau chinh sua quay ve dung nhan vien da gui.
 */
@Service
public class ApprovalNotificationService {
    private static final Logger log = LoggerFactory.getLogger(ApprovalNotificationService.class);
    public static final String OWNER_APPROVALS_URL = "/store-owner/approvals";

    private final UserRepository userRepository;
    private final SystemNotificationRepository notificationRepository;

    public ApprovalNotificationService(UserRepository userRepository, SystemNotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    /** shopId null = yeu cau khong gan chi nhanh, moi chu cua hang deu duyet duoc nen deu nhan. Khong nem loi. */
    public void notifyOwnersOfRequest(Long shopId, String title, String message) {
        try {
            List<User> owners = shopId == null
                    ? userRepository.findByRoleAndStatus(Role.SHOP_OWNER, "ACTIVE")
                    : userRepository.findByShopId(shopId).stream()
                        .filter(u -> u.getRole() == Role.SHOP_OWNER && "ACTIVE".equalsIgnoreCase(u.getStatus()))
                        .toList();
            for (User owner : owners) {
                save(owner.getId(), "APPROVAL_REQUEST", title, message, "INFO", OWNER_APPROVALS_URL);
            }
        } catch (Exception ex) {
            log.warn("Không thể gửi thông báo yêu cầu phê duyệt: {}", title, ex);
        }
    }

    /**
     * Bao ket qua cho nguoi gui yeu cau. requester la id hoac email (voucher luu email nguoi tao).
     * decision: APPROVED | REJECTED | REVISION_REQUESTED. Khong nem loi.
     */
    public void notifyRequesterOfDecision(String requester, String subject, String decision, String note, String targetUrl) {
        notifyRequesterOfDecision(requester, subject, decision, note, targetUrl, null);
    }

    /** fixHint: them vao cuoi khi bi tu choi / can chinh sua, vd chi cach sua roi gui lai. */
    public void notifyRequesterOfDecision(String requester, String subject, String decision, String note, String targetUrl, String fixHint) {
        try {
            String userId = resolveUserId(requester);
            if (userId == null) return;
            String title;
            String severity;
            switch (decision) {
                case "APPROVED" -> { title = "Yêu cầu đã được phê duyệt"; severity = "SUCCESS"; }
                case "REJECTED" -> { title = "Yêu cầu bị từ chối"; severity = "DANGER"; }
                case "REVISION_REQUESTED" -> { title = "Yêu cầu cần chỉnh sửa"; severity = "WARNING"; }
                default -> { return; }
            }
            String message = subject + (note != null && !note.isBlank() ? ". Ghi chú của chủ cửa hàng: " + note.trim() : ".");
            if (fixHint != null && !"APPROVED".equals(decision)) message += " " + fixHint;
            save(userId, "APPROVAL_" + decision, title, message, severity, targetUrl);
        } catch (Exception ex) {
            log.warn("Không thể gửi thông báo kết quả phê duyệt cho {}", requester, ex);
        }
    }

    private String resolveUserId(String idOrEmail) {
        if (idOrEmail == null || idOrEmail.isBlank()) return null;
        return userRepository.findByEmail(idOrEmail)
                .or(() -> userRepository.findById(idOrEmail))
                .map(User::getId)
                .orElse(null);
    }

    private void save(String userId, String type, String title, String message, String severity, String targetUrl) {
        SystemNotification n = new SystemNotification();
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setSeverity(severity);
        n.setTargetUrl(targetUrl);
        n.setRecipientUserId(userId);
        notificationRepository.save(n);
    }
}
