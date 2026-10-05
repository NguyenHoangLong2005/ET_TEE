package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.Category;
import com.nguyenhoanglong.entity.StoreFeaturedCategory;
import com.nguyenhoanglong.repository.CategoryRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.StoreFeaturedCategoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.*;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final StoreFeaturedCategoryRepository storeFeaturedCategoryRepository;
    private final CurrentUserService currentUserService;

    public CategoryServiceImpl(CategoryRepository categoryRepository,
                               ProductRepository productRepository,
                               StoreFeaturedCategoryRepository storeFeaturedCategoryRepository,
                               CurrentUserService currentUserService) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.storeFeaturedCategoryRepository = storeFeaturedCategoryRepository;
        this.currentUserService = currentUserService;
    }

    private String toSlug(String input) {
        if (input == null || input.isBlank()) return "";
        String nowhitespace = input.trim().toLowerCase();
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        slug = slug.replaceAll("[đĐ]", "d");
        slug = slug.replaceAll("[^a-z0-9\\s-]", "");
        slug = slug.replaceAll("[\\s-]+", "-");
        return slug.replaceAll("^-|-$", "");
    }

    private CategoryDto mapToDto(Category c) {
        return new CategoryDto(
                c.getId(),
                c.getName(),
                c.getSlug(),
                c.getDescription(),
                c.getImageUrl(),
                c.getParentId(),
                c.getDisplayOrder(),
                c.getActive()
        );
    }

    private CategoryTreeDto mapToTreeDto(Category c) {
        return new CategoryTreeDto(
                c.getId(),
                c.getName(),
                c.getSlug(),
                c.getDescription(),
                c.getImageUrl(),
                c.getParentId(),
                c.getDisplayOrder(),
                c.getActive()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryDto> getPublicCategories() {
        return categoryRepository.findByActiveTrueOrderByDisplayOrderAscIdAsc()
                .stream().map(this::mapToDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryTreeDto> getCategoryTree() {
        List<Category> all = categoryRepository.findAllByOrderByDisplayOrderAscIdAsc();
        Map<Long, CategoryTreeDto> map = new LinkedHashMap<>();
        List<CategoryTreeDto> rootNodes = new ArrayList<>();

        for (Category c : all) {
            CategoryTreeDto dto = mapToTreeDto(c);
            map.put(c.getId(), dto);
        }

        for (Category c : all) {
            CategoryTreeDto dto = map.get(c.getId());
            if (c.getParentId() == null || !map.containsKey(c.getParentId())) {
                rootNodes.add(dto);
            } else {
                map.get(c.getParentId()).getChildren().add(dto);
            }
        }

        return rootNodes;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CategoryDto> getAdminCategories(String keyword, Pageable pageable) {
        if (keyword != null && !keyword.isBlank()) {
            String k = keyword.trim();
            return categoryRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(k, k, pageable)
                    .map(this::mapToDto);
        }
        return categoryRepository.findAll(pageable).map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryDto getCategoryById(Long id) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Danh mục không tồn tại"));
        return mapToDto(c);
    }

    @Override
    public CategoryDto createCategory(CategoryDto dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên danh mục không được để trống");
        }

        String name = dto.getName().trim();
        Long parentId = dto.getParentId();

        // 1. Validation anti-duplicate under same parent
        if (parentId == null) {
            if (categoryRepository.existsByNameAndParentIdIsNull(name, null)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Danh mục gốc cùng tên đã tồn tại");
            }
        } else {
            Category parent = categoryRepository.findById(parentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh mục cha không tồn tại"));
            if (categoryRepository.existsByNameAndParentId(name, parentId, null)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Danh mục con cùng tên đã tồn tại trong danh mục cha này");
            }
        }

        // 2. Hierarchical Prefix Slug Generation
        String baseSlug;
        if (dto.getSlug() != null && !dto.getSlug().isBlank()) {
            baseSlug = toSlug(dto.getSlug());
        } else {
            String nameSlug = toSlug(name);
            if (parentId != null) {
                Category parent = categoryRepository.findById(parentId).orElse(null);
                String parentSlug = parent != null ? parent.getSlug() : "";
                baseSlug = (parentSlug.isBlank() ? "" : parentSlug + "-") + nameSlug;
            } else {
                baseSlug = nameSlug;
            }
        }

        if (baseSlug.isBlank()) baseSlug = "category";

        String finalSlug = baseSlug;
        int counter = 1;
        while (categoryRepository.existsBySlug(finalSlug)) {
            finalSlug = baseSlug + "-" + counter;
            counter++;
        }

        Category category = new Category();
        category.setName(name);
        category.setSlug(finalSlug);
        category.setDescription(dto.getDescription());
        category.setImageUrl(dto.getImageUrl());
        category.setParentId(parentId);
        category.setDisplayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0);
        category.setActive(dto.getActive() != null ? dto.getActive() : true);
        String actor = currentUserService.getCurrentUserIdOrNull();
        category.setCreatedBy(actor);
        category.setUpdatedBy(actor);

        Category saved = categoryRepository.save(category);
        return mapToDto(saved);
    }

    @Override
    public CategoryDto updateCategory(Long id, CategoryDto dto) {
        Category existing = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Danh mục không tồn tại"));

        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên danh mục không được để trống");
        }

        String name = dto.getName().trim();
        Long newParentId = dto.getParentId();

        // 1. Cycle detection validation
        if (newParentId != null) {
            if (newParentId.equals(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "parentId mới không thể là chính danh mục này");
            }
            if (isDescendant(id, newParentId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "parentId mới không thể là danh mục con/cháu của danh mục này (vi phạm chu trình cây)");
            }
            categoryRepository.findById(newParentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh mục cha không tồn tại"));
        }

        // 2. Anti-duplicate name under same parent
        if (newParentId == null) {
            if (categoryRepository.existsByNameAndParentIdIsNull(name, id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Danh mục gốc cùng tên đã tồn tại");
            }
        } else {
            if (categoryRepository.existsByNameAndParentId(name, newParentId, id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Danh mục con cùng tên đã tồn tại trong danh mục cha này");
            }
        }

        // 3. Slug update handling (Immutable by default, only manual update allowed)
        if (dto.getSlug() != null && !dto.getSlug().isBlank() && !dto.getSlug().equalsIgnoreCase(existing.getSlug())) {
            String newSlug = toSlug(dto.getSlug());
            if (categoryRepository.existsBySlugAndIdNot(newSlug, id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug đã tồn tại");
            }
            existing.setSlug(newSlug);
        }

        existing.setName(name);
        existing.setDescription(dto.getDescription());
        existing.setImageUrl(dto.getImageUrl());
        existing.setParentId(newParentId);
        if (dto.getDisplayOrder() != null) existing.setDisplayOrder(dto.getDisplayOrder());
        if (dto.getActive() != null) existing.setActive(dto.getActive());
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());

        Category updated = categoryRepository.save(existing);
        return mapToDto(updated);
    }

    private boolean isDescendant(Long currentId, Long targetParentId) {
        Long check = targetParentId;
        while (check != null) {
            if (check.equals(currentId)) return true;
            Category c = categoryRepository.findById(check).orElse(null);
            if (c == null) break;
            check = c.getParentId();
        }
        return false;
    }

    @Override
    public void reorderCategories(List<CategoryReorderDto> reorders) {
        if (reorders == null || reorders.isEmpty()) return;
        for (CategoryReorderDto item : reorders) {
            if (item.getId() != null && item.getDisplayOrder() != null) {
                categoryRepository.findById(item.getId()).ifPresent(cat -> {
                    cat.setDisplayOrder(item.getDisplayOrder());
                    categoryRepository.save(cat);
                });
            }
        }
    }

    /** Trang thai don con dang xu ly (chua giao xong / chua dong). */
    private static final List<String> OPEN_ORDER_STATUSES = List.of(
            "PENDING_PAYMENT", "PENDING_CONFIRMATION", "CONFIRMED", "PICKING", "PACKED",
            "HANDED_TO_CARRIER", "SHIPPING", "RETURN_REQUESTED");

    @Override
    @Transactional(readOnly = true)
    public CategoryDeleteCheckDto checkDelete(Long id) {
        categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Danh mục không tồn tại"));

        // productRepository.findByCategoryId chi tra ve san pham con hoat dong:
        // Product co @SQLRestriction("status <> 'DELETED'") nen san pham da bi
        // xoa mem khong con tinh la "dang dung" danh muc nay.
        long children = categoryRepository.countByParentId(id);
        long products = productRepository.findByCategoryId(id).size();
        long openOrders = categoryRepository.countOpenOrdersByCategoryId(id, OPEN_ORDER_STATUSES);

        String reason = null;
        if (children > 0) {
            reason = "Danh mục đang có " + children + " danh mục con. Vui lòng xóa hoặc chuyển danh mục con trước.";
        } else if (openOrders > 0) {
            reason = "Có " + openOrders + " đơn hàng chưa hoàn tất chứa sản phẩm thuộc danh mục này. Hãy hoàn tất hoặc hủy các đơn đó trước.";
        } else if (products > 0) {
            reason = "Danh mục đang chứa " + products + " sản phẩm. Vui lòng chuyển sản phẩm sang danh mục khác trước.";
        }
        return new CategoryDeleteCheckDto(reason == null, reason, children, products, openOrders);
    }

    @Override
    public void deleteCategory(Long id) {
        Category existing = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Danh mục không tồn tại"));

        CategoryDeleteCheckDto check = checkDelete(id);
        if (!check.isCanDelete()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể xóa danh mục. " + check.getReason());
        }

        existing.setDeletedAt(java.time.LocalDateTime.now());
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());
        categoryRepository.save(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public StoreCategoryConfigDto getStoreCategoryConfig(Long shopId) {
        List<StoreFeaturedCategory> list = storeFeaturedCategoryRepository.findByShopIdOrderByDisplayOrderAsc(shopId);
        List<CategoryDto> catDtos = list.stream().map(s -> mapToDto(s.getCategory())).toList();
        return new StoreCategoryConfigDto(shopId, catDtos);
    }

    @Override
    public StoreCategoryConfigDto updateStoreCategoryConfig(Long shopId, List<Long> categoryIds) {
        storeFeaturedCategoryRepository.deleteByShopId(shopId);
        List<CategoryDto> result = new ArrayList<>();

        if (categoryIds != null) {
            int order = 1;
            for (Long catId : categoryIds) {
                Category cat = categoryRepository.findById(catId).orElse(null);
                if (cat != null) {
                    StoreFeaturedCategory sfc = new StoreFeaturedCategory(shopId, cat, order++);
                    storeFeaturedCategoryRepository.save(sfc);
                    result.add(mapToDto(cat));
                }
            }
        }

        return new StoreCategoryConfigDto(shopId, result);
    }
}
