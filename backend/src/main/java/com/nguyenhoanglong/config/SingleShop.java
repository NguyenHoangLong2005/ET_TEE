package com.nguyenhoanglong.config;

/**
 * He thong van hanh cho MOT cua hang duy nhat.
 *
 * <p>Cot shop_id van duoc giu trong CSDL (de khong phai viet lai ~120 file va
 * de con mo rong duoc ve sau), nhung moi du lieu nghiep vu deu thuoc cua hang
 * nay. Moi cho can "chi nhanh cua nguoi dung" ma gia tri dang null (ADMIN,
 * du lieu cu "dung chung") deu quy ve {@link #ID}.</p>
 */
public final class SingleShop {

    /** Id cua cua hang duy nhat (ban ghi dau tien cua bang shops). */
    public static final Long ID = 1L;

    private SingleShop() {
    }

    /** null (khong gan / dung chung) duoc hieu la cua hang duy nhat. */
    public static Long orDefault(Long shopId) {
        return shopId != null ? shopId : ID;
    }
}
