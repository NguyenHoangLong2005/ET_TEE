package com.nguyenhoanglong.service;

import com.nguyenhoanglong.config.SingleShop;
import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Kiem tra quyen thao tac len ban ghi co shop_id, dung chung cho moi module
 * (san pham, nha cung ung, nhan vien, ...).
 *
 * <p>He thong chi quan ly MOT cua hang ({@link SingleShop}). Ban ghi co
 * shop_id null (du lieu cu "dung chung toan chuoi") va tai khoan chua gan
 * shop_id deu duoc hieu la thuoc cua hang duy nhat. Lop kiem tra van duoc giu
 * de chan du lieu le mang shop_id khac (neu con sot lai tu thoi nhieu chi nhanh).</p>
 *
 * Quy uoc loi: luon tra ve 403 voi thong diep chung, KHONG lo id ban ghi.
 */
@Service
public class StoreAccessGuard {

    private static final String DENIED_MESSAGE = "Không có quyền truy cập tài nguyên này";

    private final CurrentUserService currentUserService;

    public StoreAccessGuard(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    /**
     * ADMIN luon duoc phep. Nguoi khac duoc phep khi ban ghi thuoc cua hang
     * (shop_id null hoac bang shop cua ho, mac dinh la cua hang duy nhat).
     *
     * @throws ResponseStatusException 403 neu khong co quyen.
     */
    public void assertOwnsShop(Long resourceShopId) {
        User user = currentUserService.getCurrentUser();
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (!SingleShop.orDefault(resourceShopId).equals(SingleShop.orDefault(user.getShopId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, DENIED_MESSAGE);
        }
    }

    /** Chi ADMIN duoc phep. */
    public void assertIsAdmin() {
        if (!currentUserService.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, DENIED_MESSAGE);
        }
    }

    /**
     * Cho thao tac ghi (sua/xoa). Truoc day ban ghi "dung chung" (shop_id
     * null) chi ADMIN moi sua duoc; voi mot cua hang, chu cua hang so huu toan
     * bo du lieu nen quy tac giong {@link #assertOwnsShop(Long)}.
     */
    public void assertOwnsShopForWrite(Long resourceShopId) {
        assertOwnsShop(resourceShopId);
    }
}
