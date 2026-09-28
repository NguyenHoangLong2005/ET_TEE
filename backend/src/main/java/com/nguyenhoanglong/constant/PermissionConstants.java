package com.nguyenhoanglong.constant;

import com.nguyenhoanglong.dto.PermissionCatalogDto;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class PermissionConstants {

    // ADMIN
    public static final String MANAGE_USER = "MANAGE_USER";
    public static final String MANAGE_ROLE_PERMISSION = "MANAGE_ROLE_PERMISSION";
    public static final String MANAGE_GLOBAL_CATEGORY = "MANAGE_GLOBAL_CATEGORY";
    public static final String CONFIG_PAYMENT_SHIPPING = "CONFIG_PAYMENT_SHIPPING";
    public static final String VIEW_SYS_ERROR_LOG = "VIEW_SYS_ERROR_LOG";
    public static final String VIEW_AUDIT_LOG = "VIEW_AUDIT_LOG";
    public static final String MANAGE_BACKUP = "MANAGE_BACKUP";
    public static final String MANAGE_AI_MODEL_FEATURE_FLAG = "MANAGE_AI_MODEL_FEATURE_FLAG";
    public static final String MANAGE_MAILING = "MANAGE_MAILING";

    // SHOP_OWNER
    public static final String MANAGE_SHOP_STAFF = "MANAGE_SHOP_STAFF";
    public static final String VIEW_SHOP_DASHBOARD = "VIEW_SHOP_DASHBOARD";
    public static final String VIEW_SHOP_LOG = "VIEW_SHOP_LOG";
    public static final String APPROVE_SHOP_PROMO = "APPROVE_SHOP_PROMO";
    public static final String MANAGE_SHOP_INVENTORY = "MANAGE_SHOP_INVENTORY";
    public static final String MANAGE_SHOP_CATEGORY = "MANAGE_SHOP_CATEGORY";
    public static final String MANAGE_SHOP_PRODUCT = "MANAGE_SHOP_PRODUCT";

    // SALES_STAFF
    public static final String VIEW_NEW_ORDER = "VIEW_NEW_ORDER";
    public static final String VERIFY_ORDER = "VERIFY_ORDER";
    public static final String PROCESS_ORDER_NOTE = "PROCESS_ORDER_NOTE";
    public static final String REQUEST_STOCK_HOLD = "REQUEST_STOCK_HOLD";
    public static final String MONITOR_ORDER_SLA = "MONITOR_ORDER_SLA";

    // CSKH_STAFF
    public static final String CHAT_CUSTOMER = "CHAT_CUSTOMER";
    public static final String MANAGE_TICKET = "MANAGE_TICKET";
    public static final String SEARCH_ORDER_BASIC = "SEARCH_ORDER_BASIC";
    public static final String PROCESS_RETURN_REFUND = "PROCESS_RETURN_REFUND";
    public static final String ISSUE_SUPPORT_VOUCHER = "ISSUE_SUPPORT_VOUCHER";
    public static final String ESCALATE_TICKET = "ESCALATE_TICKET";

    // WAREHOUSE_STAFF
    public static final String INBOUND_STOCK = "INBOUND_STOCK";
    public static final String COUNT_STOCK = "COUNT_STOCK";
    public static final String MANAGE_STOCK_LOCATION = "MANAGE_STOCK_LOCATION";
    public static final String ADJUST_STOCK = "ADJUST_STOCK";
    public static final String HOLD_STOCK_ORDER = "HOLD_STOCK_ORDER";
    public static final String PICK_PACK_LABEL = "PICK_PACK_LABEL";
    public static final String HANDOVER_SHIPPING = "HANDOVER_SHIPPING";
    public static final String PROPOSE_RESTOCK = "PROPOSE_RESTOCK";

    // SHIPPING_STAFF
    public static final String RECEIVE_PACKED_LIST = "RECEIVE_PACKED_LIST";
    public static final String MANAGE_WAYBILL = "MANAGE_WAYBILL";
    public static final String CONFIRM_HANDOVER = "CONFIRM_HANDOVER";
    public static final String UPDATE_SHIPPING_EXCEPTION = "UPDATE_SHIPPING_EXCEPTION";
    public static final String UPLOAD_POD = "UPLOAD_POD";
    public static final String RECONCILE_COD = "RECONCILE_COD";

    // MARKETING_STAFF
    public static final String MANAGE_BANNER_LANDING = "MANAGE_BANNER_LANDING";
    public static final String MANAGE_CAMPAIGN_PROMO = "MANAGE_CAMPAIGN_PROMO";
    public static final String MANAGE_PRODUCT_PLACEMENT = "MANAGE_PRODUCT_PLACEMENT";
    public static final String AB_TEST_CAMPAIGN = "AB_TEST_CAMPAIGN";
    public static final String VIEW_CAMPAIGN_ANALYTICS = "VIEW_CAMPAIGN_ANALYTICS";
    
    // OTHER
    public static final String PROFILE_VIEW = "PROFILE_VIEW";
    public static final String ORDER_VIEW = "ORDER_VIEW";
    public static final String PRODUCT_VIEW = "PRODUCT_VIEW";

    private static final List<PermissionCatalogDto> CATALOG;
    private static final Set<String> ALL_CODES;

    static {
        List<PermissionCatalogDto> list = new ArrayList<>();

        // ADMIN
        list.add(new PermissionCatalogDto(MANAGE_USER, "ADMIN", "Quản lý Người dùng", "Tạo, sửa, khoá/mở khoá tài khoản người dùng và nhân viên"));
        list.add(new PermissionCatalogDto(MANAGE_ROLE_PERMISSION, "ADMIN", "Quản lý Vai trò & Quyền", "Cấu hình phân quyền RBAC cho các vai trò"));
        list.add(new PermissionCatalogDto(MANAGE_GLOBAL_CATEGORY, "ADMIN", "Quản lý Danh mục toàn hệ thống", "Thêm, sửa, xoá, sắp xếp danh mục sản phẩm"));
        list.add(new PermissionCatalogDto(CONFIG_PAYMENT_SHIPPING, "ADMIN", "Cấu hình Thanh toán & Vận chuyển", "Thiết lập phương thức thanh toán, đơn vị vận chuyển"));
        list.add(new PermissionCatalogDto(VIEW_SYS_ERROR_LOG, "ADMIN", "Xem Log lỗi Hệ thống", "Truy cập nhật ký lỗi và giám sát hệ thống"));
        list.add(new PermissionCatalogDto(VIEW_AUDIT_LOG, "ADMIN", "Xem Audit Log", "Truy cập nhật ký thao tác của người dùng"));
        list.add(new PermissionCatalogDto(MANAGE_BACKUP, "ADMIN", "Quản lý Sao lưu", "Tạo và khôi phục bản sao lưu dữ liệu"));
        list.add(new PermissionCatalogDto(MANAGE_AI_MODEL_FEATURE_FLAG, "ADMIN", "Quản lý AI Feature Flags", "Bật/tắt các tính năng AI trên hệ thống"));
        list.add(new PermissionCatalogDto(MANAGE_MAILING, "ADMIN", "Quản lý Email", "Xem log gửi email, gửi lại email thất bại"));

        // SHOP_OWNER
        list.add(new PermissionCatalogDto(MANAGE_SHOP_STAFF, "SHOP_OWNER", "Quản lý Nhân viên Chi nhánh", "Tạo, khoá, reset mật khẩu nhân viên thuộc chi nhánh"));
        list.add(new PermissionCatalogDto(VIEW_SHOP_DASHBOARD, "SHOP_OWNER", "Xem Dashboard Chi nhánh", "Truy cập bảng điều khiển tổng quan chi nhánh"));
        list.add(new PermissionCatalogDto(VIEW_SHOP_LOG, "SHOP_OWNER", "Xem Log Chi nhánh", "Truy cập nhật ký hoạt động chi nhánh"));
        list.add(new PermissionCatalogDto(APPROVE_SHOP_PROMO, "SHOP_OWNER", "Phê duyệt Khuyến mãi Chi nhánh", "Duyệt/từ chối voucher và điều chỉnh tồn kho"));
        list.add(new PermissionCatalogDto(MANAGE_SHOP_INVENTORY, "SHOP_OWNER", "Quản lý Tồn kho Chi nhánh", "Xem và điều chỉnh tồn kho thuộc chi nhánh"));
        list.add(new PermissionCatalogDto(MANAGE_SHOP_CATEGORY, "SHOP_OWNER", "Quản lý Danh mục Chi nhánh", "Cấu hình danh mục hiển thị riêng cho chi nhánh"));
        list.add(new PermissionCatalogDto(MANAGE_SHOP_PRODUCT, "SHOP_OWNER", "Quản lý Sản phẩm Chi nhánh", "Cấu hình giá, trạng thái bán sản phẩm chi nhánh"));

        // SALES_STAFF
        list.add(new PermissionCatalogDto(VIEW_NEW_ORDER, "SALES_STAFF", "Xem Đơn hàng Mới", "Truy cập danh sách đơn hàng mới cần xử lý"));
        list.add(new PermissionCatalogDto(VERIFY_ORDER, "SALES_STAFF", "Xác minh Đơn hàng", "Kiểm tra và xác nhận thông tin đơn hàng"));
        list.add(new PermissionCatalogDto(PROCESS_ORDER_NOTE, "SALES_STAFF", "Ghi chú Đơn hàng", "Thêm ghi chú nội bộ cho đơn hàng"));
        list.add(new PermissionCatalogDto(REQUEST_STOCK_HOLD, "SALES_STAFF", "Yêu cầu Giữ hàng", "Gửi yêu cầu giữ hàng tồn kho cho đơn hàng"));
        list.add(new PermissionCatalogDto(MONITOR_ORDER_SLA, "SALES_STAFF", "Giám sát SLA Đơn hàng", "Theo dõi thời gian xử lý đơn hàng theo SLA"));

        // CSKH_STAFF
        list.add(new PermissionCatalogDto(CHAT_CUSTOMER, "CSKH_STAFF", "Chat với Khách hàng", "Hỗ trợ trực tuyến qua kênh chat"));
        list.add(new PermissionCatalogDto(MANAGE_TICKET, "CSKH_STAFF", "Quản lý Ticket", "Tạo, xử lý, đóng ticket hỗ trợ khách hàng"));
        list.add(new PermissionCatalogDto(SEARCH_ORDER_BASIC, "CSKH_STAFF", "Tra cứu Đơn hàng (cơ bản)", "Tìm kiếm thông tin đơn hàng để hỗ trợ khách"));
        list.add(new PermissionCatalogDto(PROCESS_RETURN_REFUND, "CSKH_STAFF", "Xử lý Đổi/Trả hàng", "Tiếp nhận và xử lý yêu cầu đổi trả, hoàn tiền"));
        list.add(new PermissionCatalogDto(ISSUE_SUPPORT_VOUCHER, "CSKH_STAFF", "Cấp Voucher đền bù", "Cấp voucher đền bù cho khách theo hạn mức"));
        list.add(new PermissionCatalogDto(ESCALATE_TICKET, "CSKH_STAFF", "Leo thang Ticket", "Chuyển ticket lên cấp xử lý cao hơn"));

        // WAREHOUSE_STAFF
        list.add(new PermissionCatalogDto(INBOUND_STOCK, "WAREHOUSE_STAFF", "Nhập hàng", "Tiếp nhận và ghi nhận hàng nhập kho"));
        list.add(new PermissionCatalogDto(COUNT_STOCK, "WAREHOUSE_STAFF", "Kiểm kê Tồn kho", "Thực hiện kiểm kê và đối soát tồn kho"));
        list.add(new PermissionCatalogDto(MANAGE_STOCK_LOCATION, "WAREHOUSE_STAFF", "Quản lý Vị trí Kho", "Sắp xếp và quản lý vị trí lưu trữ hàng hoá"));
        list.add(new PermissionCatalogDto(ADJUST_STOCK, "WAREHOUSE_STAFF", "Điều chỉnh Tồn kho", "Tạo phiếu điều chỉnh tồn kho (tăng/giảm)"));
        list.add(new PermissionCatalogDto(HOLD_STOCK_ORDER, "WAREHOUSE_STAFF", "Giữ hàng theo Đơn", "Đánh dấu giữ hàng cho đơn hàng cụ thể"));
        list.add(new PermissionCatalogDto(PICK_PACK_LABEL, "WAREHOUSE_STAFF", "Picking & Packing", "Lấy hàng, đóng gói và in nhãn vận đơn"));
        list.add(new PermissionCatalogDto(HANDOVER_SHIPPING, "WAREHOUSE_STAFF", "Bàn giao Vận chuyển", "Bàn giao hàng đã đóng gói cho đơn vị vận chuyển"));
        list.add(new PermissionCatalogDto(PROPOSE_RESTOCK, "WAREHOUSE_STAFF", "Đề xuất Nhập hàng", "Tạo đề xuất nhập hàng bổ sung khi tồn kho thấp"));

        // SHIPPING_STAFF
        list.add(new PermissionCatalogDto(RECEIVE_PACKED_LIST, "SHIPPING_STAFF", "Nhận DS hàng đóng gói", "Nhận danh sách hàng đã đóng gói cần giao"));
        list.add(new PermissionCatalogDto(MANAGE_WAYBILL, "SHIPPING_STAFF", "Quản lý Vận đơn", "Tạo, cập nhật, theo dõi vận đơn giao hàng"));
        list.add(new PermissionCatalogDto(CONFIRM_HANDOVER, "SHIPPING_STAFF", "Xác nhận Bàn giao", "Xác nhận đã nhận hàng từ kho"));
        list.add(new PermissionCatalogDto(UPDATE_SHIPPING_EXCEPTION, "SHIPPING_STAFF", "Cập nhật Sự cố Giao hàng", "Ghi nhận sự cố trong quá trình vận chuyển"));
        list.add(new PermissionCatalogDto(UPLOAD_POD, "SHIPPING_STAFF", "Tải lên Bằng chứng Giao hàng", "Upload ảnh/chữ ký xác nhận đã giao thành công"));
        list.add(new PermissionCatalogDto(RECONCILE_COD, "SHIPPING_STAFF", "Đối soát COD", "Đối soát tiền thu hộ (COD) với đơn vị vận chuyển"));

        // MARKETING_STAFF
        list.add(new PermissionCatalogDto(MANAGE_BANNER_LANDING, "MARKETING_STAFF", "Quản lý Banner & Landing", "Tạo, sửa, xoá banner quảng cáo và trang đích"));
        list.add(new PermissionCatalogDto(MANAGE_CAMPAIGN_PROMO, "MARKETING_STAFF", "Quản lý Chiến dịch & Voucher", "Tạo chiến dịch khuyến mãi, mã giảm giá"));
        list.add(new PermissionCatalogDto(MANAGE_PRODUCT_PLACEMENT, "MARKETING_STAFF", "Bố trí Sản phẩm", "Quản lý vị trí hiển thị sản phẩm trên trang chủ"));
        list.add(new PermissionCatalogDto(AB_TEST_CAMPAIGN, "MARKETING_STAFF", "A/B Testing Chiến dịch", "Tạo và quản lý thử nghiệm A/B cho chiến dịch"));
        list.add(new PermissionCatalogDto(VIEW_CAMPAIGN_ANALYTICS, "MARKETING_STAFF", "Xem Phân tích Chiến dịch", "Truy cập báo cáo hiệu quả chiến dịch marketing"));

        // OTHER
        list.add(new PermissionCatalogDto(PROFILE_VIEW, "OTHER", "Xem Hồ sơ cá nhân", "Truy cập và cập nhật thông tin cá nhân"));
        list.add(new PermissionCatalogDto(ORDER_VIEW, "OTHER", "Xem Đơn hàng", "Truy cập thông tin đơn hàng cơ bản"));
        list.add(new PermissionCatalogDto(PRODUCT_VIEW, "OTHER", "Xem Sản phẩm", "Truy cập thông tin sản phẩm cơ bản"));

        CATALOG = Collections.unmodifiableList(list);

        Set<String> codes = new HashSet<>();
        for (PermissionCatalogDto dto : list) {
            codes.add(dto.getCode());
        }
        ALL_CODES = Collections.unmodifiableSet(codes);
    }

    public static List<PermissionCatalogDto> getAllPermissions() {
        return CATALOG;
    }

    public static boolean isValidPermission(String code) {
        return code != null && ALL_CODES.contains(code);
    }
}
