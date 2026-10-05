package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Nguon duy nhat de biet "nguoi dang goi request la ai, thuoc chi nhanh nao".
 * Thay the cho viec moi controller tu doc SecurityContextHolder + tu viet lai
 * logic resolveShopId (truoc day bi copy-paste o StoreOwnerController va
 * StoreOwnerCategoryController, ca hai deu co fallback "return 1L" nguy hiem
 * khi user khong co shopId).
 *
 * <p><b>JWT shopId co the cu:</b> token song toi 24h (app.jwt.expiration).
 * Neu ADMIN chuyen mot SHOP_OWNER sang chi nhanh khac hoac khoa tai khoan
 * trong luc token con hieu luc, JWT van mang thong tin cu. Vi vay:
 * <ul>
 *   <li>Doc (list/xem) co the dung claim shopId trong JWT lam goi y hien thi
 *       nhanh, chap nhan do tre toi da bang thoi han token.</li>
 *   <li>MOI THAO TAC GHI (tao/sua/xoa) bat buoc di qua
 *       {@link #resolveShopIdForWrite(Long)}, luon doc lai User tu DB. Day la
 *       diem quyet dinh: cho du JWT cu, du lieu ghi xuong van luon dung theo
 *       trang thai that cua tai khoan tai thoi diem ghi.</li>
 * </ul>
 * Doi lai token version/blacklist can them ha tang (bang luu version, kiem
 * tra o filter) trong khi loi ich chinh - chan ghi sai chi nhanh - da dat
 * duoc bang cach doc lai DB o thao tac ghi. Neu ve sau can thu hoi truy cap
 * TUC THI (ke ca doc) thi moi can nang cap len token version.</p>
 */
@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Nguoi dung hien tai, doc lai tu DB (khong tin bat ky gia tri nao tu JWT ngoai danh tinh). */
    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        String identifier = auth.getName();
        return userRepository.findByEmail(identifier)
                .or(() -> userRepository.findById(identifier))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng"));
    }

    public boolean isAdmin() {
        User user = getCurrentUser();
        return user.getRole() == Role.ADMIN;
    }

    /**
     * Id nguoi dung hien tai, dung de GHI NHAN (created_by/updated_by), khong
     * dung cho quyet dinh phan quyen. Tra ve null thay vi nem loi khi khong co
     * SecurityContext - xay ra khi mot service duoc goi truc tiep tu test
     * khong dung MockMvc/@WithMockUser (chua co token JWT that).
     */
    public String getCurrentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        return userRepository.findByEmail(auth.getName())
                .or(() -> userRepository.findById(auth.getName()))
                .map(User::getId)
                .orElse(null);
    }

    /**
     * shopId dung cho THAO TAC GHI. Luon lay tu ban ghi User moi nhat trong
     * DB, KHONG BAO GIO tin shopId gui len tu request body/query/path.
     *
     * @param requestedShopId shopId nguoi goi muon thao tac len (chi co y
     *                        nghia khi la ADMIN - ADMIN duoc chi dinh chi
     *                        nhanh muon quan ly; voi SHOP_OWNER/staff tham so
     *                        nay bi bo qua hoan toan).
     * @return shopId thuc su se dung de ghi du lieu. Co the null neu la ADMIN
     *         va khong chi dinh chi nhanh (nghia la thao tac khong gioi han
     *         theo chi nhanh, vd quan ly du lieu dung chung).
     * @throws ResponseStatusException 403 neu la SHOP_OWNER/staff nhung chua
     *         duoc gan vao chi nhanh nao.
     */
    public Long resolveShopIdForWrite(Long requestedShopId) {
        User user = getCurrentUser();
        if (user.getRole() == Role.ADMIN) {
            return requestedShopId;
        }
        if (user.getShopId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Tài khoản của bạn chưa được gán vào cửa hàng nào");
        }
        return user.getShopId();
    }
}
