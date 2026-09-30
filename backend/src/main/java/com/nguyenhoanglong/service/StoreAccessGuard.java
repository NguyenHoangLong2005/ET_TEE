package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Kiem tra quyen so huu chi nhanh, dung chung cho moi module (san pham tai
 * chi nhanh, nha cung ung rieng, nhan vien, ...) de tranh copy-paste logic.
 *
 * Quy uoc loi (theo quyet dinh Q4): truy cap cheo chi nhanh luon tra ve 403
 * voi thong diep chung, KHONG lo ma chi nhanh hay id ban ghi trong thong diep.
 */
@Service
public class StoreAccessGuard {

    private static final String DENIED_MESSAGE = "Không có quyền truy cập tài nguyên này";

    private final CurrentUserService currentUserService;

    public StoreAccessGuard(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    /**
     * Xac nhan nguoi dung hien tai duoc phep thao tac len mot ban ghi thuoc
     * chi nhanh {@code resourceShopId}. ADMIN luon duoc phep. SHOP_OWNER/staff
     * chi duoc phep khi resourceShopId trung voi shopId cua chinh ho.
     *
     * @throws ResponseStatusException 403 neu khong co quyen.
     */
    public void assertOwnsShop(Long resourceShopId) {
        User user = currentUserService.getCurrentUser();
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (resourceShopId == null || user.getShopId() == null || !resourceShopId.equals(user.getShopId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, DENIED_MESSAGE);
        }
    }

    /**
     * Nhu {@link #assertOwnsShop(Long)} nhung cho tai nguyen DUNG CHUNG toan
     * chuoi (resourceShopId == null, vi du nha cung ung khong gan chi nhanh
     * nao). Chi ADMIN duoc sua/xoa; SHOP_OWNER chi duoc doc (khong goi ham
     * nay cho thao tac ghi tren tai nguyen dung chung).
     */
    public void assertIsAdmin() {
        if (!currentUserService.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, DENIED_MESSAGE);
        }
    }

    /**
     * ADMIN luon qua. SHOP_OWNER/staff chi qua khi resourceShopId trung voi
     * shop cua ho; resourceShopId == null (tai nguyen dung chung) thi KHONG
     * qua - dung cho cac thao tac ghi (sua/xoa) tren nha cung ung, vi
     * SHOP_OWNER chi duoc sua nha cung ung RIENG cua chi nhanh minh, khong
     * duoc dong gop sua nha cung ung dung chung.
     */
    public void assertOwnsShopForWrite(Long resourceShopId) {
        User user = currentUserService.getCurrentUser();
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (resourceShopId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, DENIED_MESSAGE);
        }
        assertOwnsShop(resourceShopId);
    }
}
