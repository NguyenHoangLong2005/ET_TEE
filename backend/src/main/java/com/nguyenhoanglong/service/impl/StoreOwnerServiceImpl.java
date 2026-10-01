package com.nguyenhoanglong.service.impl;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.StoreOwnerService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StoreOwnerServiceImpl implements StoreOwnerService {

    private final com.nguyenhoanglong.service.DataAuditService dataAuditService;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final VoucherRepository voucherRepository;
    private final InventoryAdjustmentRepository inventoryAdjustmentRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private RestockRequestRepository restockRequestRepository;
    private final InventoryRepository inventoryRepository;
    private final ShopWorkShiftRepository shopWorkShiftRepository;
    private final StaffPerformanceEvaluationRepository staffPerformanceEvaluationRepository;
    private final SystemNotificationRepository systemNotificationRepository;
    private final UserRepository userRepository;
    private final StaffAuditLogRepository staffAuditLogRepository;
    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final ProductVariantRepository variantRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final SupplierRepository supplierRepository;
    private final com.nguyenhoanglong.service.CurrentUserService currentUserService;

    public StoreOwnerServiceImpl(ProductVariantRepository variantRepository,
                                 ManufacturerRepository manufacturerRepository,
                                 SupplierRepository supplierRepository,
                                 com.nguyenhoanglong.service.CurrentUserService currentUserService,
com.nguyenhoanglong.service.DataAuditService dataAuditService,
                                 ProductRepository productRepository,
                                 CategoryRepository categoryRepository,
                                 VoucherRepository voucherRepository,
                                 InventoryAdjustmentRepository inventoryAdjustmentRepository,
                                 InventoryRepository inventoryRepository,
                                 ShopWorkShiftRepository shopWorkShiftRepository,
                                 StaffPerformanceEvaluationRepository staffPerformanceEvaluationRepository,
                                 SystemNotificationRepository systemNotificationRepository,
                                 UserRepository userRepository,
                                 StaffAuditLogRepository staffAuditLogRepository,
                                 OrderRepository orderRepository,
                                 OrderStatusHistoryRepository orderStatusHistoryRepository,
                                 org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.variantRepository = variantRepository;
        this.manufacturerRepository = manufacturerRepository;
        this.supplierRepository = supplierRepository;
        this.currentUserService = currentUserService;
        this.dataAuditService = dataAuditService;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.voucherRepository = voucherRepository;
        this.inventoryAdjustmentRepository = inventoryAdjustmentRepository;
        this.inventoryRepository = inventoryRepository;
        this.shopWorkShiftRepository = shopWorkShiftRepository;
        this.staffPerformanceEvaluationRepository = staffPerformanceEvaluationRepository;
        this.systemNotificationRepository = systemNotificationRepository;
        this.userRepository = userRepository;
        this.staffAuditLogRepository = staffAuditLogRepository;
        this.orderRepository = orderRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponseDto<ShopProductDto> getShopProducts(Long shopId, int page, int size, String keyword, Long categoryId, String status) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        // Keyword, category and the branch-config filter now combine (the keyword used to silently
        // discard the category, and `status` was ignored altogether).
        String mode = status == null ? "" : status.trim().toLowerCase();
        org.springframework.data.jpa.domain.Specification<Product> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> preds = new ArrayList<>();
            if (keyword != null && !keyword.trim().isEmpty()) {
                String kw = "%" + keyword.trim().toLowerCase() + "%";
                preds.add(cb.or(cb.like(cb.lower(root.get("name")), kw), cb.like(cb.lower(root.get("slug")), kw)));
            }
            if (categoryId != null) {
                // a root category also covers its children
                preds.add(cb.or(cb.equal(root.get("category").get("id"), categoryId),
                        cb.equal(root.get("category").get("parentId"), categoryId)));
            }
            if ("sale".equals(mode)) {
                // promotional price set (and really lower than the list price)
                preds.add(cb.isNotNull(root.get("salePrice")));
                preds.add(cb.lessThan(root.<BigDecimal>get("salePrice"), root.<BigDecimal>get("price")));
            } else if ("inactive".equals(mode)) {
                preds.add(cb.notEqual(root.get("status"), "ACTIVE"));
            } else if ("active".equals(mode)) {
                preds.add(cb.equal(root.get("status"), "ACTIVE"));
            }
            return cb.and(preds.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<Product> productsPage = productRepository.findAll(spec, pageable);

        List<ShopProductDto> dtos = productsPage.getContent().stream().map(this::toShopProductDto).collect(Collectors.toList());

        return new PaginatedResponseDto<>(
                dtos,
                productsPage.getTotalElements(),
                page,
                size,
                productsPage.getTotalPages(),
                Map.of("shopId", shopId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ShopProductDto getShopProductById(Long shopId, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay san pham voi ID: " + productId));

        return toShopProductDto(product);
    }

    /**
     * One price for the whole system: basePrice / baseSalePrice are the product's real list and
     * promotional prices. The old per-branch override fields are no longer used (left null).
     */
    private ShopProductDto toShopProductDto(Product product) {
        String imageUrl = (!product.getImages().isEmpty()) ? product.getImages().get(0).getImageUrl() : "";
        String categoryName = (product.getCategory() != null) ? product.getCategory().getName() : "Khác";
        return ShopProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .categoryName(categoryName)
                .brand(product.getBrand())
                .basePrice(product.getPrice())
                .baseSalePrice(product.getSalePrice())
                .isAvailableForSale("ACTIVE".equals(product.getStatus()))
                .status(product.getStatus())
                .imageUrl(imageUrl)
                .build();
    }

    private static final BigDecimal PRICE_STEP = BigDecimal.valueOf(1000);

    @Override
    @Transactional
    public ShopProductDto updateProductPricing(Long productId, ProductPriceUpdateDto dto) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm với ID: " + productId));

        BigDecimal price = dto.getPrice();
        BigDecimal salePrice = dto.getSalePrice();
        if (price == null || price.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá niêm yết phải lớn hơn 0");
        }
        // Prices are shown and charged rounded to whole thousands, so only accept those: what the
        // owner types is exactly what the customer sees and pays.
        if (price.remainder(PRICE_STEP).signum() != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá niêm yết phải là bội số của 1.000đ");
        }
        if (salePrice != null) {
            if (salePrice.signum() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá khuyến mãi phải lớn hơn 0 (để trống nếu không khuyến mãi)");
            }
            if (salePrice.remainder(PRICE_STEP).signum() != 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá khuyến mãi phải là bội số của 1.000đ");
            }
            if (salePrice.compareTo(price) >= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá khuyến mãi phải nhỏ hơn giá niêm yết");
            }
        }

        String before = describePricing(product);
        applyPricing(product, price, salePrice);
        if (dto.getActive() != null) product.setStatus(dto.getActive() ? "ACTIVE" : "INACTIVE");
        productRepository.save(product);

        auditProductChange("PRODUCT_PRICE_CHANGE", product, "Cập nhật giá / trạng thái bán sản phẩm #" + product.getId(), before);
        return toShopProductDto(product);
    }

    /**
     * The price lives in two places: the product (shown in listings) and every variant (what the cart
     * and checkout actually charge). Both are written together so what is displayed is what is billed.
     */
    private void applyPricing(Product product, BigDecimal price, BigDecimal salePrice) {
        product.setPrice(price);
        product.setSalePrice(salePrice);
        product.setIsSale(salePrice != null);
        if (product.getVariants() != null) {
            for (ProductVariant variant : product.getVariants()) {
                variant.setPrice(price);
                variant.setSalePrice(salePrice);
            }
        }
    }

    // ── Product CRUD (store owner) ────────────────────────────────────────────

    /** Order statuses that mean "still in progress". */
    private static final List<String> OPEN_ORDER_STATUSES = List.of(
            "PENDING_PAYMENT", "PENDING_CONFIRMATION", "CONFIRMED", "PICKING", "PACKED",
            "HANDED_TO_CARRIER", "SHIPPING", "RETURN_REQUESTED");

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static String trimToNull(String s) {
        return s == null || s.trim().isEmpty() ? null : s.trim();
    }

    private static String toSlug(String input) {
        String s = input == null ? "" : input.trim().toLowerCase().replace('đ', 'd');
        s = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("[\\s-]+", "-")
                .replaceAll("^-|-$", "");
        return s;
    }

    /** Validates the fields shared by create and update; prices follow the same 1.000đ rule as pricing edits. */
    private void validateProductForm(StoreProductFormDto f) {
        if (trimToNull(f.name) == null) throw bad("Tên sản phẩm không được để trống");
        if (f.name.trim().length() > 255) throw bad("Tên sản phẩm tối đa 255 ký tự");
        if (f.categoryId == null) throw bad("Vui lòng chọn danh mục");
        if (!categoryRepository.existsById(f.categoryId)) throw bad("Danh mục không tồn tại");
        if (f.price == null || f.price.signum() <= 0) throw bad("Giá niêm yết phải lớn hơn 0");
        if (f.price.remainder(PRICE_STEP).signum() != 0) throw bad("Giá niêm yết phải là bội số của 1.000đ");
        if (f.salePrice != null) {
            if (f.salePrice.signum() <= 0) throw bad("Giá khuyến mãi phải lớn hơn 0 (để trống nếu không khuyến mãi)");
            if (f.salePrice.remainder(PRICE_STEP).signum() != 0) throw bad("Giá khuyến mãi phải là bội số của 1.000đ");
            if (f.salePrice.compareTo(f.price) >= 0) throw bad("Giá khuyến mãi phải nhỏ hơn giá niêm yết");
        }
        String brand = trimToNull(f.brand);
        if (brand != null && brand.length() > 100) throw bad("Thương hiệu tối đa 100 ký tự");
        if (f.manufacturerId != null && !manufacturerRepository.existsById(f.manufacturerId)) {
            throw bad("Nhà sản xuất không tồn tại hoặc đã bị xóa");
        }
        if (f.supplierId != null) {
            Supplier sup = supplierRepository.findById(f.supplierId)
                    .orElseThrow(() -> bad("Nhà cung cấp không tồn tại hoặc đã bị xóa"));
            // a branch-private supplier is only usable by that branch (or an admin)
            if (sup.getShopId() != null && !currentUserService.isAdmin()) {
                Long myShop = currentUserService.getCurrentUser().getShopId();
                if (!sup.getShopId().equals(myShop)) throw bad("Nhà cung cấp này không thuộc cửa hàng của bạn");
            }
        }
        if (f.images != null) {
            for (StoreProductFormDto.ImageForm img : f.images) {
                String url = trimToNull(img.imageUrl);
                if (url == null) throw bad("Có ảnh chưa nhập đường dẫn");
                if (url.length() > 1000) throw bad("Đường dẫn ảnh quá dài");
                String lower = url.toLowerCase();
                if (!(lower.startsWith("http://") || lower.startsWith("https://") || url.startsWith("/"))) {
                    throw bad("Ảnh phải là đường dẫn http(s) hoặc ảnh tải lên, không nhận dữ liệu base64");
                }
            }
        }
    }

    private void applyImages(Product product, List<StoreProductFormDto.ImageForm> images) {
        product.getImages().clear();
        if (images == null) return;
        boolean hasPrimary = images.stream().anyMatch(i -> Boolean.TRUE.equals(i.isPrimary));
        int order = 0;
        for (StoreProductFormDto.ImageForm i : images) {
            ProductImage img = new ProductImage();
            img.setImageUrl(i.imageUrl.trim());
            img.setAlt(i.alt == null ? "" : i.alt.trim());
            // the first image is the cover unless one is explicitly marked
            img.setIsPrimary(hasPrimary ? Boolean.TRUE.equals(i.isPrimary) : order == 0);
            img.setSortOrder(order++);
            product.addImage(img);
        }
    }

    private void applyProductFields(Product p, StoreProductFormDto f) {
        p.setName(f.name.trim());
        p.setDescription(trimToNull(f.description));
        // brand is the customer-facing label (e.g. ET.TEE); the manufacturer / supplier are
        // internal partners and are stored separately, never written over the brand.
        p.setBrand(trimToNull(f.brand));
        p.setManufacturerId(f.manufacturerId);
        p.setSupplierId(f.supplierId);
        p.setPrice(f.price);
        p.setSalePrice(f.salePrice);
        p.setIsSale(f.salePrice != null);
        p.setGender(trimToNull(f.gender));
        p.setTargetGroup(trimToNull(f.targetGroup));
        p.setProductType(trimToNull(f.productType));
        p.setMaterial(trimToNull(f.material));
        p.setCategory(categoryRepository.getReferenceById(f.categoryId));
    }

    private StoreProductFormDto toForm(Product p) {
        StoreProductFormDto f = new StoreProductFormDto();
        f.id = p.getId();
        f.name = p.getName();
        f.slug = p.getSlug();
        f.description = p.getDescription();
        f.brand = p.getBrand();
        f.manufacturerId = p.getManufacturerId();
        f.manufacturerName = p.getManufacturerId() == null ? null
                : manufacturerRepository.findById(p.getManufacturerId()).map(Manufacturer::getName).orElse(null);
        f.supplierId = p.getSupplierId();
        f.supplierName = p.getSupplierId() == null ? null
                : supplierRepository.findById(p.getSupplierId()).map(Supplier::getName).orElse(null);
        f.categoryId = p.getCategory() != null ? p.getCategory().getId() : null;
        f.categoryName = p.getCategory() != null ? p.getCategory().getName() : null;
        f.gender = p.getGender();
        f.targetGroup = p.getTargetGroup();
        f.productType = p.getProductType();
        f.material = p.getMaterial();
        f.price = p.getPrice();
        f.salePrice = p.getSalePrice();
        f.status = p.getStatus();
        for (ProductImage i : p.getImages()) {
            StoreProductFormDto.ImageForm img = new StoreProductFormDto.ImageForm();
            img.imageUrl = i.getImageUrl();
            img.alt = i.getAlt();
            img.isPrimary = i.getIsPrimary();
            f.images.add(img);
        }
        for (ProductVariant v : p.getVariants()) {
            StoreProductFormDto.VariantForm vf = new StoreProductFormDto.VariantForm();
            vf.id = v.getId();
            vf.sku = v.getSku();
            vf.color = v.getColor();
            vf.colorHex = v.getColorHex();
            vf.size = v.getSize();
            vf.stock = v.getStock();
            f.variants.add(vf);
        }
        return f;
    }

    @Override
    @Transactional(readOnly = true)
    public StoreProductFormDto getProductForm(Long productId) {
        Product p = productRepository.findByIdWithDetails(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm với ID: " + productId));
        return toForm(p);
    }

    @Override
    @Transactional
    public StoreProductFormDto createProduct(StoreProductFormDto f) {
        validateProductForm(f);

        if (f.variants == null || f.variants.isEmpty()) {
            throw bad("Cần ít nhất một biến thể (màu/size) để có thể bán sản phẩm");
        }
        Set<String> skus = new HashSet<>();
        for (StoreProductFormDto.VariantForm v : f.variants) {
            String sku = trimToNull(v.sku);
            if (sku == null) throw bad("Mỗi biến thể cần có SKU");
            if (sku.length() > 100) throw bad("SKU tối đa 100 ký tự");
            if (!skus.add(sku.toLowerCase())) throw bad("SKU bị trùng trong form: " + sku);
            if (variantRepository.existsBySku(sku)) throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU đã tồn tại: " + sku);
            if (v.stock == null || v.stock < 0) throw bad("Tồn kho của SKU " + sku + " phải từ 0 trở lên");
        }

        String base = trimToNull(f.slug) != null ? toSlug(f.slug) : toSlug(f.name);
        if (base.isEmpty()) base = "san-pham";
        String slug = base;
        int n = 1;
        while (productRepository.findBySlug(slug).isPresent()) slug = base + "-" + (n++);

        Product p = new Product();
        applyProductFields(p, f);
        p.setSlug(slug);
        // new products start on sale unless the owner chose to keep them hidden
        p.setStatus("INACTIVE".equalsIgnoreCase(f.status) ? "INACTIVE" : "ACTIVE");
        p.setIsNew(true);
        for (StoreProductFormDto.VariantForm v : f.variants) {
            ProductVariant variant = new ProductVariant();
            variant.setSku(v.sku.trim());
            variant.setColor(trimToNull(v.color));
            variant.setColorHex(trimToNull(v.colorHex));
            variant.setSize(trimToNull(v.size));
            variant.setPrice(f.price);
            variant.setSalePrice(f.salePrice);
            variant.setStock(v.stock);
            variant.setAvailableQuantity(v.stock);
            p.addVariant(variant);
        }
        applyImages(p, f.images);

        Product saved = productRepository.save(p);

        // The warehouse ledger needs its row too: confirming an order looks the product up in
        // inventories, so orders for a product created here were refused until someone did an inbound.
        if (inventoryRepository.findByProductId(saved.getId()).isEmpty()) {
            Inventory inv = new Inventory();
            inv.setProductId(saved.getId());
            String name = saved.getName();
            inv.setProductName(name.length() > 200 ? name.substring(0, 200) : name);
            inv.setQuantityOnHand(f.variants.stream().mapToInt(v -> v.stock != null ? v.stock : 0).sum());
            inv.setQuantityReserved(0);
            inv.setReorderLevel(10);
            inv.setShopId(currentActorShopId());
            inventoryRepository.save(inv);
        }

        auditProductChange("PRODUCT_CREATE", saved, "Tạo sản phẩm " + saved.getName(), "-");
        return toForm(saved);
    }

    @Override
    @Transactional
    public StoreProductFormDto updateProduct(Long productId, StoreProductFormDto f) {
        Product p = productRepository.findByIdWithDetails(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm với ID: " + productId));
        validateProductForm(f);
        String before = describePricing(p);

        applyProductFields(p, f);
        // variants keep their own price: keep them in step with the product price, as pricing edits do
        for (ProductVariant v : p.getVariants()) {
            v.setPrice(f.price);
            v.setSalePrice(f.salePrice);
        }
        if (f.status != null) {
            String st = f.status.trim().toUpperCase();
            if (!st.equals("ACTIVE") && !st.equals("INACTIVE")) throw bad("Trạng thái không hợp lệ");
            p.setStatus(st);
        }
        if (f.images != null) applyImages(p, f.images);

        Product saved = productRepository.save(p);
        auditProductChange("PRODUCT_UPDATE", saved, "Sửa sản phẩm " + saved.getName(), before);
        return toForm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> checkProductDelete(Long productId) {
        productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm với ID: " + productId));
        long open = orderRepository.countOpenOrdersByProductId(productId, OPEN_ORDER_STATUSES);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("canDelete", open == 0);
        res.put("openOrderCount", open);
        res.put("reason", open == 0 ? null
                : "Có " + open + " đơn hàng chưa hoàn tất chứa sản phẩm này. Hãy hoàn tất hoặc hủy các đơn đó trước; trong lúc chờ, bạn có thể tạm ngưng bán sản phẩm.");
        return res;
    }

    @Override
    @Transactional
    public void deleteProduct(Long productId) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm với ID: " + productId));
        Map<String, Object> check = checkProductDelete(productId);
        if (!Boolean.TRUE.equals(check.get("canDelete"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể xóa sản phẩm. " + check.get("reason"));
        }
        String before = describePricing(p);
        // Soft delete. The slug column is unique across ALL rows, so free the slug for reuse.
        String suffix = "-deleted-" + p.getId();
        String slug = p.getSlug();
        p.setSlug(slug.length() + suffix.length() > 255 ? slug.substring(0, 255 - suffix.length()) + suffix : slug + suffix);
        p.setStatus("DELETED");
        productRepository.save(p);
        productRemovalService.detachFromCartsAndWishlists(p.getId());
        auditProductChange("PRODUCT_DELETE", p, "Xóa sản phẩm " + p.getName(), before);
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.nguyenhoanglong.service.ProductRemovalService productRemovalService;

    /** Branch of the signed-in user; admins (no branch) fall back to the default shop 1. */
    private Long currentActorShopId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return 1L;
        return userRepository.findByEmail(auth.getName())
                .map(User::getShopId)
                .orElse(1L);
    }

    private static String describePricing(Product product) {
        return "price=" + product.getPrice() + ", salePrice=" + product.getSalePrice() + ", status=" + product.getStatus();
    }

    private void auditProductChange(String action, Product product, String message, String before) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String actor = auth != null && auth.isAuthenticated() ? auth.getName() : "SYSTEM";
        dataAuditService.logAudit(actor, action, "Product", String.valueOf(product.getId()), message,
                before, describePricing(product));
        // The storefront listing is cached for a short while; a price change must show up at once.
        com.nguyenhoanglong.service.ProductServiceImpl.invalidateListingCache();
    }

    @Override
    @Transactional
    public int bulkProductAction(List<Long> productIds, String action) {
        String act = action == null ? "" : action.trim().toUpperCase();
        if (!act.equals("ACTIVATE") && !act.equals("DEACTIVATE") && !act.equals("CLEAR_SALE")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thao tác hàng loạt không hợp lệ");
        }
        int changed = 0;
        for (Product product : productRepository.findAllById(sanitizeBulkIds(productIds))) {
            String before = describePricing(product);
            switch (act) {
                case "ACTIVATE" -> {
                    if ("ACTIVE".equals(product.getStatus())) continue;
                    product.setStatus("ACTIVE");
                }
                case "DEACTIVATE" -> {
                    if ("INACTIVE".equals(product.getStatus())) continue;
                    product.setStatus("INACTIVE");
                }
                default -> { // CLEAR_SALE
                    if (product.getSalePrice() == null) continue;
                    applyPricing(product, product.getPrice(), null);
                }
            }
            productRepository.save(product);
            auditProductChange("PRODUCT_BULK_" + act, product, "Thao tác hàng loạt " + act + " trên sản phẩm #" + product.getId(), before);
            changed++;
        }
        return changed;
    }

    private static List<Long> sanitizeBulkIds(List<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa chọn sản phẩm nào");
        }
        if (productIds.size() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ thao tác tối đa 200 sản phẩm mỗi lần");
        }
        return productIds.stream().filter(Objects::nonNull).distinct().toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoreApprovalItemDto> getPendingApprovals(Long shopId) {
        List<StoreApprovalItemDto> items = new ArrayList<>();

        // Da loc theo shopId + status o tang DB, khong con findAll() + filter trong JVM.
        List<Voucher> vouchers = voucherRepository.findPendingApprovalByShopId(shopId);
        for (Voucher v : vouchers) {
            items.add(StoreApprovalItemDto.builder()
                    .approvalId("VOUCHER-" + v.getId())
                    .type("VOUCHER")
                    .title("Duyet Ma giam gia / Voucher: " + v.getCode())
                    .description(v.getName() + " (Giam: " + v.getDiscountValue() + ")")
                    .requestedBy(v.getCreatedBy() != null ? v.getCreatedBy() : "Marketing Team")
                    .status(v.getStatus())
                    .createdAt(v.getCreatedAt())
                    .build());
        }

        // JOIN FETCH inventory, loc san theo shopId + status.
        List<InventoryAdjustment> adjustments = inventoryAdjustmentRepository.findPendingApprovalByShopId(shopId);
        for (InventoryAdjustment adj : adjustments) {
            Inventory inv = adj.getInventory();
            items.add(StoreApprovalItemDto.builder()
                    .approvalId("INV_ADJ-" + adj.getId())
                    .type("INVENTORY_ADJUSTMENT")
                    .title("Duyet dieu chinh ton kho: " + inv.getProductName())
                    .description("Ly do: " + adj.getReason() + " | Thay doi: " + (adj.getDifference() > 0 ? "+" : "") + adj.getDifference())
                    .requestedBy(adj.getRequestedBy() != null ? "NV Kho #" + adj.getRequestedBy() : "Nhan vien kho")
                    .status(adj.getStatus())
                    .createdAt(adj.getCreatedAt())
                    .build());
        }

        // Warehouse "Đề xuất nhập hàng": saved as PENDING but never surfaced here before.
        for (RestockRequest r : restockRequestRepository.findByShopIdAndStatusOrderByCreatedAtDesc(shopId, "PENDING")) {
            items.add(StoreApprovalItemDto.builder()
                    .approvalId("RESTOCK-" + r.getId())
                    .type("RESTOCK_REQUEST")
                    .title("Đề xuất nhập hàng: " + r.getProductName())
                    .description("Số lượng: " + r.getQuantity() + (r.getNote() != null ? " | Ghi chú: " + r.getNote() : ""))
                    .requestedBy(r.getRequestedBy() != null ? "NV Kho #" + r.getRequestedBy() : "Nhân viên kho")
                    .status(r.getStatus())
                    .createdAt(r.getCreatedAt())
                    .build());
        }

        // Hang cho duyet: yeu cau cu nhat len truoc (nullsLast: tranh NPE khi thieu createdAt).
        items.sort(Comparator.comparing(StoreApprovalItemDto::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        return items;
    }

    @Override
    @Transactional
    public StoreApprovalItemDto processRestockApproval(Long shopId, Long requestId, StoreApprovalActionDto actionDto, String actorIdOrEmail) {
        String actionStr = (actionDto.getAction() != null) ? actionDto.getAction().trim().toUpperCase() : "";
        if (!"APPROVED".equals(actionStr) && !"REJECTED".equals(actionStr)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hanh dong phe duyet khong hop le");
        }
        RestockRequest r = restockRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đề xuất nhập hàng #" + requestId));
        if (shopId != null && !shopId.equals(r.getShopId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đề xuất nhập hàng không thuộc cửa hàng của bạn");
        }
        if (!"PENDING".equalsIgnoreCase(r.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đề xuất này đã được xử lý");
        }
        r.setStatus(actionStr);
        r.setReviewedBy(actorIdOrEmail);
        r.setReviewedAt(LocalDateTime.now());
        r.setReviewNote(actionDto.getNote() != null && !actionDto.getNote().isBlank() ? actionDto.getNote().trim() : null);
        restockRequestRepository.save(r);

        return StoreApprovalItemDto.builder()
                .approvalId("RESTOCK-" + r.getId())
                .type("RESTOCK_REQUEST")
                .title("Đề xuất nhập hàng: " + r.getProductName())
                .description("Số lượng: " + r.getQuantity())
                .requestedBy(r.getRequestedBy())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public StoreApprovalItemDto processVoucherApproval(Long shopId, Long voucherId, StoreApprovalActionDto actionDto, String actorIdOrEmail) {
        String actionStr = (actionDto.getAction() != null) ? actionDto.getAction().trim().toUpperCase() : "";
        if (!"APPROVED".equals(actionStr) && !"REJECTED".equals(actionStr)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hanh dong phe duyet khong hop le");
        }

        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay Voucher voi ID: " + voucherId));

        // A voucher with no shop (marketing staff not assigned to a branch) may be approved by any owner.
        if (voucher.getShopId() != null && !voucher.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền phê duyệt Voucher không thuộc cửa hàng của bạn (Mã shop yêu cầu: " + shopId + ")");
        }

        String voucherStatus = voucher.getStatus() != null ? voucher.getStatus().toUpperCase() : "";
        if (!"PENDING".equals(voucherStatus) && !"PENDING_APPROVAL".equals(voucherStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voucher này đã được xử lý hoặc không ở trạng thái chờ duyệt");
        }

        if ("APPROVED".equals(actionStr)) {
            voucher.setStatus("ACTIVE");
            voucher.setIsActive(true);
        } else {
            voucher.setStatus("REJECTED");
            voucher.setIsActive(false);
        }
        voucher.setUpdatedBy(actorIdOrEmail);
        voucher.setUpdatedAt(LocalDateTime.now());
        voucherRepository.save(voucher);

        return StoreApprovalItemDto.builder()
                .approvalId("VOUCHER-" + voucher.getId())
                .type("VOUCHER")
                .title("Ma giam gia: " + voucher.getCode())
                .description(voucher.getName())
                .requestedBy(voucher.getCreatedBy())
                .status(voucher.getStatus())
                .createdAt(voucher.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public StoreApprovalItemDto processInventoryAdjustmentApproval(Long shopId, Long adjustmentId, StoreApprovalActionDto actionDto, String actorIdOrEmail) {
        String actionStr = (actionDto.getAction() != null) ? actionDto.getAction().trim().toUpperCase() : "";
        if (!"APPROVED".equals(actionStr) && !"REJECTED".equals(actionStr)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hanh dong phe duyet khong hop le");
        }

        InventoryAdjustment adj = inventoryAdjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay phieu dieu chinh kho ID: " + adjustmentId));

        if (adj.getInventory() == null || adj.getInventory().getShopId() == null || !adj.getInventory().getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen phe duyet phieu dieu chinh ton kho khong thuoc chi nhanh cua ban");
        }

        String adjStatus = adj.getStatus() != null ? adj.getStatus().toUpperCase() : "";
        if (!"PENDING".equals(adjStatus) && !"PENDING_APPROVAL".equals(adjStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phiếu điều chỉnh đã được xử lý");
        }

        if ("APPROVED".equals(actionStr)) {
            adj.setStatus("APPROVED");
            if (adj.getInventory() != null) {
                Inventory inv = adj.getInventory();
                int newQty = Math.max(0, inv.getQuantityOnHand() + adj.getDifference());
                inv.setQuantityOnHand(newQty);
                inventoryRepository.save(inv);
            }
        } else {
            adj.setStatus("REJECTED");
        }
        inventoryAdjustmentRepository.save(adj);

        String prodName = (adj.getInventory() != null) ? adj.getInventory().getProductName() : "San pham";
        return StoreApprovalItemDto.builder()
                .approvalId("INV_ADJ-" + adj.getId())
                .type("INVENTORY_ADJUSTMENT")
                .title("Dieu chinh ton kho: " + prodName)
                .description("Ly do: " + adj.getReason())
                .requestedBy(adj.getRequestedBy() != null ? adj.getRequestedBy().toString() : "Kho")
                .status(adj.getStatus())
                .createdAt(adj.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public StoreApprovalItemDto processApprovalAction(Long shopId, String approvalId, StoreApprovalActionDto actionDto, String actorIdOrEmail) {
        if (approvalId.startsWith("VOUCHER-") || "VOUCHER".equalsIgnoreCase(actionDto.getType())) {
            Long voucherId = parseIdFromApprovalId(approvalId, "VOUCHER-");
            return processVoucherApproval(shopId, voucherId, actionDto, actorIdOrEmail);
        } else if (approvalId.startsWith("INV_ADJ-") || "INVENTORY_ADJUSTMENT".equalsIgnoreCase(actionDto.getType())) {
            Long adjId = parseIdFromApprovalId(approvalId, "INV_ADJ-");
            return processInventoryAdjustmentApproval(shopId, adjId, actionDto, actorIdOrEmail);
        } else if (approvalId.startsWith("RESTOCK-") || "RESTOCK_REQUEST".equalsIgnoreCase(actionDto.getType())) {
            return processRestockApproval(shopId, parseIdFromApprovalId(approvalId, "RESTOCK-"), actionDto, actorIdOrEmail);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loai phe duyet khong hop le: " + approvalId);
        }
    }

    @Override
    public List<ShopWorkShiftDto> getWorkShifts(Long shopId, LocalDate startDate, LocalDate endDate, String userId) {
        List<ShopWorkShift> shifts;
        if (startDate != null && endDate != null) {
            shifts = shopWorkShiftRepository.findByShopIdAndShiftDateBetween(shopId, startDate, endDate);
        } else if (userId != null && !userId.trim().isEmpty()) {
            shifts = shopWorkShiftRepository.findByShopIdAndUserId(shopId, userId.trim());
        } else {
            shifts = shopWorkShiftRepository.findByShopId(shopId);
        }

        return shifts.stream().map(this::mapToWorkShiftDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ShopWorkShiftDto createWorkShift(Long shopId, ShopWorkShiftCreateDto createDto) {
        boolean hasUserId = createDto.getUserId() != null && !createDto.getUserId().trim().isEmpty();
        boolean hasUserEmail = createDto.getUserEmail() != null && !createDto.getUserEmail().trim().isEmpty();
        if (!hasUserId && !hasUserEmail) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email hoặc ID nhân viên là bắt buộc khi phân ca");
        }
        if (createDto.getShiftDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngay phan ca (shiftDate) la bat buoc");
        }
        if (createDto.getShiftType() == null || createDto.getShiftType().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loai ca lam viec (shiftType) la bat buoc");
        }

        User staff = (hasUserId
                ? userRepository.findById(createDto.getUserId().trim())
                : userRepository.findByEmail(createDto.getUserEmail().trim().toLowerCase()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));
        if (staff.getShopId() == null || !staff.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhân viên không thuộc chi nhánh của bạn");
        }

        ShopWorkShift shift = new ShopWorkShift();
        shift.setShopId(shopId);
        shift.setUserId(staff.getId());
        shift.setUserFullName(staff.getFullName());
        shift.setShiftDate(createDto.getShiftDate());
        shift.setShiftType(createDto.getShiftType().trim().toUpperCase());
        shift.setNote(createDto.getNote() != null ? createDto.getNote().trim() : null);
        shift.setStatus(createDto.getStatus() != null ? createDto.getStatus().trim().toUpperCase() : "SCHEDULED");

        ShopWorkShift saved = shopWorkShiftRepository.save(shift);
        notifyStaff(saved.getUserId(), "WORK_SHIFT_ASSIGNED", "Bạn được phân ca làm việc mới",
                "Ca: " + describeShift(saved) + ".", "INFO");
        return mapToWorkShiftDto(saved);
    }

    @Override
    @Transactional
    public ShopWorkShiftDto updateWorkShift(Long shopId, Long shiftId, ShopWorkShiftCreateDto updateDto) {
        ShopWorkShift shift = shopWorkShiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay ca lam viec ID: " + shiftId));

        if (!shift.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen sua ca lam viec cua shop khac");
        }

        if (updateDto.getShiftDate() != null) shift.setShiftDate(updateDto.getShiftDate());
        if (updateDto.getShiftType() != null && !updateDto.getShiftType().trim().isEmpty()) {
            shift.setShiftType(updateDto.getShiftType().trim().toUpperCase());
        }
        if (updateDto.getNote() != null) shift.setNote(updateDto.getNote().trim());
        if (updateDto.getStatus() != null && !updateDto.getStatus().trim().isEmpty()) {
            shift.setStatus(updateDto.getStatus().trim().toUpperCase());
        }

        ShopWorkShift saved = shopWorkShiftRepository.save(shift);
        notifyStaff(saved.getUserId(), "WORK_SHIFT_UPDATED", "Ca làm việc của bạn đã thay đổi",
                "Ca hiện tại: " + describeShift(saved) + ".", "WARNING");
        return mapToWorkShiftDto(saved);
    }

    @Override
    @Transactional
    public void deleteWorkShift(Long shopId, Long shiftId) {
        ShopWorkShift shift = shopWorkShiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay ca lam viec ID: " + shiftId));

        if (!shift.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen xoa ca lam viec cua shop khac");
        }

        shopWorkShiftRepository.delete(shift);
        notifyStaff(shift.getUserId(), "WORK_SHIFT_CANCELLED", "Ca làm việc của bạn đã bị hủy",
                "Ca: " + describeShift(shift) + ".", "WARNING");
    }

    @Override
    public List<StaffPerformanceEvaluationDto> getEvaluations(Long shopId, String period, String userId) {
        List<StaffPerformanceEvaluation> list;
        if (period != null && !period.trim().isEmpty()) {
            list = staffPerformanceEvaluationRepository.findByShopIdAndEvaluationPeriod(shopId, period.trim());
        } else if (userId != null && !userId.trim().isEmpty()) {
            list = staffPerformanceEvaluationRepository.findByShopIdAndUserId(shopId, userId.trim());
        } else {
            list = staffPerformanceEvaluationRepository.findByShopId(shopId);
        }

        return list.stream().map(this::mapToEvaluationDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public StaffPerformanceEvaluationDto createEvaluation(Long shopId, StaffPerformanceEvaluationCreateDto createDto, String evaluatedBy) {
        if (createDto.getUserId() == null || createDto.getUserId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID nhan vien (userId) la bat buoc");
        }
        if (createDto.getEvaluationPeriod() == null || createDto.getEvaluationPeriod().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ky danh gia (evaluationPeriod YYYY-MM) la bat buoc");
        }
        if (createDto.getRating() == null || createDto.getRating() < 1 || createDto.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Diem danh gia rating phai thuoc tu 1 den 5 sao");
        }

        String fullName = resolveUserFullName(createDto.getUserId().trim());
        String period = createDto.getEvaluationPeriod().trim();

        StaffPerformanceEvaluation eval = staffPerformanceEvaluationRepository
                .findByShopIdAndUserIdAndEvaluationPeriod(shopId, createDto.getUserId().trim(), period)
                .orElseGet(StaffPerformanceEvaluation::new);

        eval.setShopId(shopId);
        eval.setUserId(createDto.getUserId().trim());
        eval.setUserFullName(fullName);
        eval.setEvaluationPeriod(period);
        eval.setRating(createDto.getRating());
        eval.setSalesTargetAchievement(createDto.getSalesTargetAchievement());
        eval.setFeedbackNotes(createDto.getFeedbackNotes() != null ? createDto.getFeedbackNotes().trim() : null);
        eval.setEvaluatedBy(evaluatedBy != null ? evaluatedBy : "Store Owner");

        StaffPerformanceEvaluation saved = staffPerformanceEvaluationRepository.save(eval);
        notifyStaffOfEvaluation(saved);
        return mapToEvaluationDto(saved);
    }

    @Override
    public PaginatedResponseDto<ShopAuditLogDto> getShopAuditLogs(Long shopId, int page, int size, String action, String startDate, String endDate, String userId) {
        List<ShopAuditLogDto> logs = new ArrayList<>();
        
        List<StaffAuditLog> staffLogs = staffAuditLogRepository.findByShopIdOrderByCreatedAtDesc(shopId);
        
        for (StaffAuditLog log : staffLogs) {
            logs.add(ShopAuditLogDto.builder()
                    .id("SAL-" + log.getId())
                    .shopId(shopId)
                    .action(log.getAction())
                    .actorName(log.getActor() != null ? log.getActor().getFullName() : "System")
                    .actorRole(log.getActor() != null && log.getActor().getRole() != null ? log.getActor().getRole().name() : null)
                    .staffName(log.getStaff() != null ? log.getStaff().getFullName() : null)
                    .staffId(log.getStaff() != null ? log.getStaff().getId() : null)
                    .description(formatAuditDescription(log.getAction(), log.getOldValue(), log.getNewValue()))
                    .oldValue(log.getOldValue())
                    .newValue(log.getNewValue())
                    .timestamp(log.getCreatedAt())
                    .build());
        }
        
        if (action != null && !action.trim().isEmpty()) {
            logs = logs.stream()
                    .filter(l -> action.equalsIgnoreCase(l.getAction()))
                    .collect(Collectors.toList());
        }
        if (userId != null && !userId.trim().isEmpty()) {
            logs = logs.stream()
                    .filter(l -> userId.equals(l.getStaffId()))
                    .collect(Collectors.toList());
        }
        
        int total = logs.size();
        int start = Math.min(page * size, total);
        int end = Math.min(start + size, total);
        List<ShopAuditLogDto> pageContent = start < total ? logs.subList(start, end) : Collections.emptyList();

        return new PaginatedResponseDto<>(
                pageContent,
                total,
                page,
                size,
                (int) Math.ceil((double) total / size),
                Map.of("shopId", shopId)
        );
    }
    
    private String formatAuditDescription(String action, String oldValue, String newValue) {
        if (oldValue == null && newValue == null) {
            return "Thao tac: " + action;
        }
        if (oldValue != null && newValue != null) {
            return String.format("Thay doi tu '%s' thanh '%s'", oldValue, newValue);
        }
        if (newValue != null) {
            return "Gia tri moi: " + newValue;
        }
        return "Gia tri cu: " + oldValue;
    }

    @Override
    public Map<String, Object> getShopDashboardMetrics(Long shopId) {
        return getShopDashboardMetrics(shopId, null, null);
    }

    @Override
    public Map<String, Object> getShopDashboardMetrics(Long shopId, LocalDate rangeFrom, LocalDate rangeTo) {
        final boolean ranged = rangeFrom != null && rangeTo != null;
        // Tat ca chi so duoc tong hop bang SQL. Phien ban truoc load toan bo don hang cua shop
        // (va ca inventoryRepository.findAll()) roi dem bang stream, nen endpoint mat ~9s.
        Map<String, Object> metrics = new LinkedHashMap<>();

        Map<String, Long> countByStatus = new HashMap<>();
        Map<String, Double> amountByStatus = new HashMap<>();
        long totalOrders = 0;
        List<Object[]> statusRows = ranged
                ? orderRepository.aggregateByStatusForShopBetween(shopId,
                        rangeFrom.atStartOfDay(), rangeTo.plusDays(1).atStartOfDay())
                : orderRepository.aggregateByStatusForShop(shopId);
        for (Object[] row : statusRows) {
            String statusName = row[0] != null ? ((OrderStatus) row[0]).name() : "PENDING_CONFIRMATION";
            long cnt = ((Number) row[1]).longValue();
            double amount = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
            countByStatus.merge(statusName, cnt, Long::sum);
            amountByStatus.merge(statusName, amount, Double::sum);
            totalOrders += cnt;
        }

        long pendingOrders = countByStatus.getOrDefault("PENDING_CONFIRMATION", 0L)
                + countByStatus.getOrDefault("PENDING_PAYMENT", 0L);
        long confirmedOrders = countByStatus.getOrDefault("CONFIRMED", 0L);
        long shippedOrders = countByStatus.getOrDefault("PACKED", 0L)
                + countByStatus.getOrDefault("HANDED_TO_CARRIER", 0L)
                + countByStatus.getOrDefault("SHIPPING", 0L);
        long deliveredOrders = countByStatus.getOrDefault("DELIVERED", 0L);
        long cancelledOrders = countByStatus.getOrDefault("CANCELLED", 0L);
        long refundedOrders = countByStatus.getOrDefault("REFUNDED", 0L);

        BigDecimal totalRevenue = BigDecimal.valueOf(amountByStatus.getOrDefault("DELIVERED", 0.0));

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        Double monthSum = orderRepository.sumAmountForShopByStatusBetween(
                shopId, OrderStatus.DELIVERED,
                monthStart.atStartOfDay(), monthStart.plusMonths(1).atStartOfDay());
        BigDecimal monthRevenue = BigDecimal.valueOf(monthSum != null ? monthSum : 0.0);

        long totalStaff = userRepository.countByShopId(shopId);
        long activeStaff = userRepository.countByShopIdAndStatus(shopId, "ACTIVE");

        long totalProducts = inventoryRepository.countByShopId(shopId);
        long lowStockProducts = inventoryRepository.countLowStockByShopId(shopId);

        List<StoreApprovalItemDto> pendingApprovals = getPendingApprovals(shopId);

        metrics.put("orders", Map.of(
            "total", totalOrders,
            "pending", pendingOrders,
            "confirmed", confirmedOrders,
            "shipped", shippedOrders,
            "delivered", deliveredOrders,
            "cancelled", cancelledOrders,
            "refunded", refundedOrders
        ));

        metrics.put("revenue", Map.of(
            "total", totalRevenue,
            "thisMonth", monthRevenue,
            "currency", "VND"
        ));

        metrics.put("staff", Map.of(
            "total", totalStaff,
            "active", activeStaff
        ));

        metrics.put("inventory", Map.of(
            "totalProducts", totalProducts,
            "lowStockAlerts", lowStockProducts
        ));

        metrics.put("approvals", Map.of(
            "pendingCount", pendingApprovals.size(),
            "items", pendingApprovals.stream().limit(5).toList()
        ));

        // Recent orders (last 5) - chi lay 5 dong tu DB
        List<Map<String, Object>> recentOrders = orderRepository
            .findByShopId(shopId, PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
            .getContent().stream()
            .map(o -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", o.getId());
                row.put("orderCode", o.getOrderCode() != null ? o.getOrderCode() : "#" + o.getId());
                row.put("customerName", o.getCustomerName() != null ? o.getCustomerName() : "Khách hàng");
                row.put("totalAmount", o.getTotalAmount() != null ? o.getTotalAmount() : 0.0);
                String status = o.getStatus() != null ? o.getStatus().name() : (o.getOrderStatus() != null ? o.getOrderStatus() : "PENDING");
                row.put("status", status);
                row.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                return row;
            })
            .toList();
        metrics.put("recentOrders", recentOrders);

        if (ranged) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(rangeFrom, rangeTo) + 1;
            metrics.put("range", Map.of("from", rangeFrom.toString(), "to", rangeTo.toString(), "days", days,
                    "granularity", days <= 62 ? "day" : "month"));

            // Change vs the range of the same length immediately before this one.
            Double previous = orderRepository.sumAmountForShopByStatusBetween(shopId, OrderStatus.DELIVERED,
                    rangeFrom.minusDays(days).atStartOfDay(), rangeFrom.atStartOfDay());
            double previousRevenue = previous != null ? previous : 0.0;
            if (previousRevenue > 0) {
                metrics.put("revenueChange", (totalRevenue.doubleValue() - previousRevenue) / previousRevenue * 100.0);
            }
            metrics.put("previousRevenue", previousRevenue);

            Map<LocalDate, Double> revenueByDay = new HashMap<>();
            Map<LocalDate, Long> ordersByDay = new HashMap<>();
            for (Object[] row : orderRepository.aggregateDailyForShopBetween(shopId,
                    rangeFrom.atStartOfDay(), rangeTo.plusDays(1).atStartOfDay(), OrderStatus.DELIVERED)) {
                LocalDate day = toLocalDate(row[0]);
                if (day == null) continue;
                ordersByDay.put(day, ((Number) row[1]).longValue());
                revenueByDay.put(day, row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);
            }

            List<Map<String, Object>> series = new ArrayList<>();
            if (days <= 62) {
                for (LocalDate d = rangeFrom; !d.isAfter(rangeTo); d = d.plusDays(1)) {
                    Map<String, Object> point = new LinkedHashMap<>();
                    point.put("date", d.toString());
                    point.put("revenue", revenueByDay.getOrDefault(d, 0.0));
                    point.put("orders", ordersByDay.getOrDefault(d, 0L));
                    series.add(point);
                }
            } else {
                // Long ranges: one point per calendar month keeps the chart readable.
                Map<java.time.YearMonth, double[]> months = new java.util.TreeMap<>();
                for (LocalDate d = rangeFrom; !d.isAfter(rangeTo); d = d.plusDays(1)) {
                    double[] acc = months.computeIfAbsent(java.time.YearMonth.from(d), k -> new double[2]);
                    acc[0] += revenueByDay.getOrDefault(d, 0.0);
                    acc[1] += ordersByDay.getOrDefault(d, 0L);
                }
                months.forEach((ym, acc) -> {
                    Map<String, Object> point = new LinkedHashMap<>();
                    point.put("date", ym.toString()); // yyyy-MM
                    point.put("revenue", acc[0]);
                    point.put("orders", (long) acc[1]);
                    series.add(point);
                });
            }
            metrics.put("dailyRevenue", series);
            return metrics;
        }

        // Daily revenue for last 7 days - GROUP BY ngay o tang DB
        Map<LocalDate, long[]> dailyOrderCount = new HashMap<>();
        Map<LocalDate, Double> dailyRevenueSum = new HashMap<>();
        for (Object[] row : orderRepository.aggregateDailyForShop(
                shopId, today.minusDays(6).atStartOfDay(), OrderStatus.DELIVERED)) {
            LocalDate day = toLocalDate(row[0]);
            if (day == null) continue;
            dailyOrderCount.put(day, new long[]{ ((Number) row[1]).longValue() });
            dailyRevenueSum.put(day, row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);
        }

        List<Map<String, Object>> dailyRevenue = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Map<String, Object> dayData = new LinkedHashMap<>();
            dayData.put("date", day.toString());
            dayData.put("revenue", dailyRevenueSum.getOrDefault(day, 0.0));
            long[] cnt = dailyOrderCount.get(day);
            dayData.put("orders", cnt != null ? cnt[0] : 0L);
            dailyRevenue.add(dayData);
        }
        metrics.put("dailyRevenue", dailyRevenue);

        return metrics;
    }

    /** Ket qua CAST(... AS date) co the la java.sql.Date hoac LocalDate tuy driver. */
    private static LocalDate toLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate d) return d;
        if (value instanceof java.sql.Date d) return d.toLocalDate();
        if (value instanceof java.time.LocalDateTime dt) return dt.toLocalDate();
        return null;
    }

    @Override
    public PaginatedResponseDto<Map<String, Object>> getShopOrders(Long shopId, int page, int size, String status) {
        return getShopOrders(shopId, page, size, status, null, null, null);
    }

    @Override
    public PaginatedResponseDto<Map<String, Object>> getShopOrders(Long shopId, int page, int size, String status,
                                                                   String search, LocalDate from, LocalDate to) {
        // Phan trang tai DB. Truoc day ham nay load toan bo don hang cua shop roi subList,
        // khien /store-owner/orders?size=5 mat hang chuc giay khi bang orders lon.
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        OrderStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try {
                statusFilter = OrderStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Bo qua filter khong hop le, tra ve toan bo thay vi loi 500.
            }
        }

        String keyword = (search != null && !search.isBlank()) ? "%" + search.trim().toLowerCase() + "%" : "%";
        LocalDateTime fromTime = from != null ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime toTime = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.of(2100, 1, 1, 0, 0);
        Page<Order> ordersPage = orderRepository.searchForShop(shopId, statusFilter != null,
                statusFilter != null ? statusFilter : OrderStatus.PENDING_CONFIRMATION,
                fromTime, toTime, keyword, pageable);

        List<Map<String, Object>> content = ordersPage.getContent().stream()
            .map(o -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", o.getId());
                row.put("orderCode", o.getOrderCode() != null ? o.getOrderCode() : "#" + o.getId());
                row.put("customerName", o.getCustomerName() != null ? o.getCustomerName() : "Khách hàng");
                row.put("customerPhone", o.getCustomerPhone());
                row.put("totalAmount", o.getTotalAmount() != null ? o.getTotalAmount() : 0.0);
                String s = o.getStatus() != null ? o.getStatus().name() : (o.getOrderStatus() != null ? o.getOrderStatus() : "PENDING");
                row.put("status", s);
                row.put("paymentMethod", o.getPaymentMethod());
                row.put("paymentStatus", o.getPaymentStatus());
                row.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                return row;
            })
            .toList();

        PaginatedResponseDto<Map<String, Object>> result = new PaginatedResponseDto<>();
        result.setItems(content);
        result.setTotalItems((int) ordersPage.getTotalElements());
        result.setCurrentPage(page);
        result.setPageSize(size);
        result.setTotalPages(ordersPage.getTotalPages());
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getShopOrderDetail(Long shopId, Long orderId) {
        Order o = orderRepository.findById(orderId)
                .filter(x -> shopId != null && shopId.equals(x.getShopId())) // never leak another branch's order
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));

        Map<String, Object> d = new LinkedHashMap<>();
        d.put("id", o.getId());
        d.put("orderCode", o.getOrderCode());
        d.put("status", o.getStatus() != null ? o.getStatus().name() : o.getOrderStatus());
        d.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
        d.put("customerName", o.getCustomerName());
        d.put("customerPhone", o.getCustomerPhone());
        d.put("customerEmail", o.getCustomerEmail());
        d.put("shippingAddress", o.getShippingAddressSnapshot());
        d.put("note", o.getNote());
        d.put("paymentMethod", o.getPaymentMethod());
        d.put("paymentStatus", o.getPaymentStatus());
        d.put("voucherCode", o.getVoucherCode());
        d.put("subtotal", o.getSubtotal());
        d.put("discountTotal", o.getDiscountTotal());
        d.put("totalAmount", o.getTotalAmount());

        List<Map<String, Object>> items = new ArrayList<>();
        if (o.getItems() != null) {
            for (OrderItem item : o.getItems()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", item.getId());
                row.put("productName", item.getProductNameSnapshot());
                row.put("color", item.getColorSnapshot());
                row.put("size", item.getSizeSnapshot());
                row.put("image", item.getImageSnapshot());
                row.put("quantity", item.getQuantity());
                row.put("unitPrice", item.getUnitPrice());
                row.put("totalPrice", item.getTotalPrice());
                items.add(row);
            }
        }
        d.put("items", items);

        List<Map<String, Object>> history = new ArrayList<>();
        for (OrderStatusHistory h : orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(o.getId())) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("from", h.getFromStatus());
            row.put("to", h.getStatus());
            row.put("changedBy", h.getChangedBy());
            row.put("reason", h.getReason());
            row.put("createdAt", h.getCreatedAt() != null ? h.getCreatedAt().toString() : null);
            history.add(row);
        }
        d.put("history", history);
        return d;
    }

    private Long parseIdFromApprovalId(String approvalId, String prefix) {
        try {
            String idStr = approvalId.replace(prefix, "");
            return Long.parseLong(idStr);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dinh dang approvalId khong hop le: " + approvalId);
        }
    }

    /** Gửi đánh giá hiệu suất tới chuông thông báo của chính nhân viên được đánh giá. */
    private void notifyStaffOfEvaluation(StaffPerformanceEvaluation eval) {
        StringBuilder msg = new StringBuilder("Kỳ ").append(eval.getEvaluationPeriod())
                .append(": ").append(eval.getRating()).append("/5 sao");
        if (eval.getSalesTargetAchievement() != null) {
            msg.append(", đạt ")
                    .append(eval.getSalesTargetAchievement().stripTrailingZeros().toPlainString())
                    .append("% chỉ tiêu doanh số");
        }
        msg.append('.');
        if (eval.getFeedbackNotes() != null && !eval.getFeedbackNotes().isBlank()) {
            msg.append(" Nhận xét: ").append(eval.getFeedbackNotes());
        }

        SystemNotification notif = new SystemNotification();
        notif.setType("PERFORMANCE_EVALUATION");
        notif.setTitle("Bạn có đánh giá hiệu suất mới");
        notif.setMessage(msg.toString());
        notif.setSeverity(eval.getRating() >= 4 ? "SUCCESS" : eval.getRating() <= 2 ? "WARNING" : "INFO");
        notif.setRecipientUserId(eval.getUserId());
        systemNotificationRepository.save(notif);
    }

    private void notifyStaff(String userId, String type, String title, String message, String severity) {
        if (userId == null || userId.isBlank()) return;
        SystemNotification notif = new SystemNotification();
        notif.setType(type);
        notif.setTitle(title);
        notif.setMessage(message);
        notif.setSeverity(severity);
        notif.setRecipientUserId(userId);
        systemNotificationRepository.save(notif);
    }

    private String describeShift(ShopWorkShift shift) {
        return shift.getShiftType() + " ngày " + shift.getShiftDate();
    }

    private String resolveUserFullName(String userId) {
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Nhan vien " + userId);
    }

    private ShopWorkShiftDto mapToWorkShiftDto(ShopWorkShift shift) {
        ShopWorkShiftDto dto = buildWorkShiftDto(shift);
        dto.setUserName(shift.getUserFullName());
        userRepository.findById(shift.getUserId()).ifPresent(u -> {
            dto.setUserEmail(u.getEmail());
            dto.setRole(u.getRole() != null ? u.getRole().name() : null);
        });
        return dto;
    }

    private ShopWorkShiftDto buildWorkShiftDto(ShopWorkShift shift) {
        return ShopWorkShiftDto.builder()
                .id(shift.getId())
                .shopId(shift.getShopId())
                .userId(shift.getUserId())
                .userFullName(shift.getUserFullName())
                .shiftDate(shift.getShiftDate())
                .shiftType(shift.getShiftType())
                .note(shift.getNote())
                .status(shift.getStatus())
                .createdAt(shift.getCreatedAt())
                .build();
    }

    private StaffPerformanceEvaluationDto mapToEvaluationDto(StaffPerformanceEvaluation eval) {
        return StaffPerformanceEvaluationDto.builder()
                .id(eval.getId())
                .shopId(eval.getShopId())
                .userId(eval.getUserId())
                .userFullName(eval.getUserFullName())
                .evaluationPeriod(eval.getEvaluationPeriod())
                .rating(eval.getRating())
                .salesTargetAchievement(eval.getSalesTargetAchievement())
                .feedbackNotes(eval.getFeedbackNotes())
                .evaluatedBy(eval.getEvaluatedBy())
                .createdAt(eval.getCreatedAt())
                .build();
    }

    // ==========================================
    // 7. STAFF MANAGEMENT FOR SHOP
    // ==========================================

    @Override
    @Transactional(readOnly = true)
    public List<UserAdminDto> getShopStaff(Long shopId) {
        List<User> users = userRepository.findByShopId(shopId).stream()
                .filter(u -> u.getRole() != Role.USER && u.getRole() != Role.ADMIN)
                .collect(Collectors.toList());

        return users.stream().map(this::mapToUserAdminDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserAdminDto createShopStaff(Long shopId, UserCreateDto createDto, String actor) {
        String email = createDto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã tồn tại trong hệ thống");
        }

        String employeeCode = (createDto.getEmployeeCode() != null && !createDto.getEmployeeCode().trim().isEmpty())
                ? createDto.getEmployeeCode().trim()
                : null;
        if (employeeCode == null) {
            // ms % 10000 collided regularly and then failed with "code already exists"
            // for a code the owner never typed; draw until unused.
            java.security.SecureRandom rnd = new java.security.SecureRandom();
            do {
                employeeCode = "NV-" + (100000 + rnd.nextInt(900000));
            } while (userRepository.existsByEmployeeCode(employeeCode));
        }

        if (userRepository.existsByEmployeeCode(employeeCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã nhân viên đã tồn tại");
        }

        Role role;
        try {
            role = Role.valueOf(createDto.getRoleCode());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Mã vai trò không hợp lệ: " + createDto.getRoleCode() + ". Vui lòng sử dụng mã vai trò đã được định nghĩa trong hệ thống.");
        }

        boolean shopLevelRole = role == Role.SALES_STAFF || role == Role.CSKH_STAFF
                || role == Role.WAREHOUSE_STAFF || role == Role.SHIPPING_STAFF;
        if (!shopLevelRole) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chủ shop chỉ có thể tạo tài khoản nhân viên cấp cửa hàng (Bán hàng, CSKH, Kho, Vận chuyển)");
        }

        // A blank password used to mean the shared "EtTee@123456"; generate one and return it once.
        boolean generated = createDto.getInitialPassword() == null || createDto.getInitialPassword().trim().isEmpty();
        String rawPassword = generated ? generateRandomPassword() : createDto.getInitialPassword().trim();

        User newUser = User.builder()
                .fullName(createDto.getFullName().trim())
                .email(email)
                .phone(createDto.getPhone() != null ? createDto.getPhone().trim() : null)
                .employeeCode(employeeCode)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .emailVerified(true)
                .status("ACTIVE")
                .role(role)
                .shopId(shopId)
                .mustChangePassword(true)
                .build();

        User saved = userRepository.save(newUser);

        User actorUser = userRepository.findByEmail(actor)
                .orElseGet(() -> userRepository.findById(actor).orElse(null));

        staffAuditLogRepository.save(new StaffAuditLog(
                saved,
                actorUser != null ? actorUser : saved,
                "CREATE_STAFF",
                null,
                "Tạo nhân viên " + saved.getFullName() + " (" + role.name() + ")"
        ));

        UserAdminDto dto = mapToUserAdminDto(saved);
        if (generated) dto.setTemporaryPassword(rawPassword);
        return dto;
    }

    @Override
    @Transactional
    public UserAdminDto updateShopStaffStatus(Long shopId, String staffId, UserStatusUpdateDto statusDto, String actor) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));

        if (staff.getShopId() == null || !staff.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhân viên không thuộc cửa hàng quản lý của bạn");
        }

        if (staff.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể khóa tài khoản Quản trị viên");
        }

        String oldStatus = staff.getStatus();
        String newStatus = statusDto.getStatus() != null ? statusDto.getStatus().toUpperCase() : "ACTIVE";

        if ("LOCKED".equals(newStatus)) {
            staff.setStatus("LOCKED");
            staff.setLockReason(statusDto.getLockReason() != null ? statusDto.getLockReason().trim() : "Khóa bởi chủ cửa hàng");
            staff.setLockedBy(actor);
            staff.setLockedAt(LocalDateTime.now());
        } else {
            staff.setStatus("ACTIVE");
            staff.setLockReason(null);
            staff.setLockedBy(null);
            staff.setLockedAt(null);
        }

        User saved = userRepository.save(staff);

        User actorUser = userRepository.findByEmail(actor)
                .orElseGet(() -> userRepository.findById(actor).orElse(null));

        staffAuditLogRepository.save(new StaffAuditLog(
                saved,
                actorUser != null ? actorUser : saved,
                "LOCKED".equals(newStatus) ? "LOCK_STAFF" : "UNLOCK_STAFF",
                oldStatus,
                newStatus + (statusDto.getLockReason() != null ? ": " + statusDto.getLockReason() : "")
        ));

        return mapToUserAdminDto(saved);
    }

    @Override
    @Transactional
    public ResetPasswordResponseDto resetShopStaffPassword(Long shopId, String staffId, String actor) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));

        if (staff.getShopId() == null || !staff.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhân viên không thuộc cửa hàng quản lý của bạn");
        }

        if (staff.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền khôi phục mật khẩu Admin");
        }

        User actorUser = userRepository.findByEmail(actor)
                .orElseGet(() -> userRepository.findById(actor).orElse(null));

        // Chu cua hang chi cap lai mat khau cho NHAN VIEN cua minh. Neu cho phep
        // cap cho mot SHOP_OWNER khac cung chi nhanh thi co the chiem tai khoan
        // ngang cap; cap cho chinh minh thi bo qua buoc xac thuc mat khau cu.
        boolean actorIsAdmin = actorUser != null && actorUser.getRole() == Role.ADMIN;
        if (!actorIsAdmin && (staff.getRole() == Role.SHOP_OWNER || staff.getRole() == Role.USER
                || (actorUser != null && actorUser.getId().equals(staff.getId())))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ được cấp lại mật khẩu cho nhân viên của cửa hàng");
        }

        String tempPassword = generateRandomPassword();
        staff.setPasswordHash(passwordEncoder.encode(tempPassword));
        staff.setMustChangePassword(true);
        // Mat khau moi do quan ly cap: go khoa tam do dang nhap sai truoc do,
        // neu khong nguoi dung van bi chan 15 phut du nhap dung mat khau tam.
        staff.setFailedLoginAttempts(0);
        staff.setLockedUntil(null);
        userRepository.save(staff);

        staffAuditLogRepository.save(new StaffAuditLog(
                staff,
                actorUser != null ? actorUser : staff,
                "RESET_PASSWORD",
                null,
                "Khôi phục mật khẩu tạm thời cho nhân viên"
        ));

        return ResetPasswordResponseDto.builder()
                .message("Khôi phục mật khẩu nhân viên thành công. Đã cấp mật khẩu tạm thời.")
                .mustChangePassword(true)
                .temporaryPassword(tempPassword)
                .build();
    }

    private UserAdminDto mapToUserAdminDto(User u) {
        return new UserAdminDto(
                u.getId(),
                u.getEmployeeCode(),
                u.getFullName(),
                u.getEmail(),
                u.getPhone(),
                u.getRole() != null ? u.getRole().name() : "STAFF",
                u.getShopId(),
                u.getStatus(),
                u.getLockReason(),
                u.getLockedBy(),
                u.getLockedAt(),
                u.isMustChangePassword(),
                u.getCreatedAt(),
                u.getUpdatedAt(),
                List.of()
        );
    }

    private String generateRandomPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
