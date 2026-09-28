package com.nguyenhoanglong;

import com.nguyenhoanglong.dto.CategoryDto;
import com.nguyenhoanglong.service.CategoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class CategoryApiIntegrationTest {

    @Autowired
    private CategoryService categoryService;

    @Test
    @DisplayName("Case 1: Create 2 categories named 'Áo' under 2 different parents ('Nam' and 'Nữ')")
    public void testCase1_CreateTwoAoUnderDifferentParents() {
        // Create Parent 1: Nam
        CategoryDto parent1 = new CategoryDto();
        parent1.setName("Nam");
        CategoryDto createdParent1 = categoryService.createCategory(parent1);

        // Create Parent 2: Nữ
        CategoryDto parent2 = new CategoryDto();
        parent2.setName("Nữ");
        CategoryDto createdParent2 = categoryService.createCategory(parent2);

        // Create Child 1: Áo under Nam
        CategoryDto child1 = new CategoryDto();
        child1.setName("Áo");
        child1.setParentId(createdParent1.getId());
        CategoryDto createdChild1 = categoryService.createCategory(child1);

        // Create Child 2: Áo under Nữ
        CategoryDto child2 = new CategoryDto();
        child2.setName("Áo");
        child2.setParentId(createdParent2.getId());
        CategoryDto createdChild2 = categoryService.createCategory(child2);

        assertNotNull(createdChild1.getId());
        assertNotNull(createdChild2.getId());
        assertEquals("nam-ao", createdChild1.getSlug());
        assertEquals("nu-ao", createdChild2.getSlug());
        System.out.println("CASE 1 SUCCESS: child1.slug=" + createdChild1.getSlug() + ", child2.slug=" + createdChild2.getSlug());
    }

    @Test
    @DisplayName("Case 2: Try creating 2 root categories named 'Nam' -> 409 Conflict")
    public void testCase2_DuplicateRootCategoryName() {
        CategoryDto root1 = new CategoryDto();
        root1.setName("Thời Trang Nam Root");
        categoryService.createCategory(root1);

        CategoryDto root2 = new CategoryDto();
        root2.setName("Thời Trang Nam Root");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            categoryService.createCategory(root2);
        });

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Danh mục gốc cùng tên đã tồn tại"));
        System.out.println("CASE 2 SUCCESS: Threw 409 Conflict - " + ex.getReason());
    }

    @Test
    @DisplayName("Case 3: Try PUT setting parentId of a category to its own child -> 400 Bad Request")
    public void testCase3_CycleDetection() {
        CategoryDto parent = new CategoryDto();
        parent.setName("Parent Category");
        CategoryDto createdParent = categoryService.createCategory(parent);

        CategoryDto child = new CategoryDto();
        child.setName("Child Category");
        child.setParentId(createdParent.getId());
        CategoryDto createdChild = categoryService.createCategory(child);

        // Try to set parent's parentId to child's ID (Cycle!)
        createdParent.setParentId(createdChild.getId());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            categoryService.updateCategory(createdParent.getId(), createdParent);
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("vi phạm chu trình cây"));
        System.out.println("CASE 3 SUCCESS: Threw 400 Bad Request - " + ex.getReason());
    }

    @Test
    @DisplayName("Case 4: Update category name -> slug remains immutable")
    public void testCase4_SlugImmutability() {
        CategoryDto cat = new CategoryDto();
        cat.setName("Tên Ban Đầu");
        CategoryDto created = categoryService.createCategory(cat);

        String originalSlug = created.getSlug();
        assertEquals("ten-ban-dau", originalSlug);

        // Update name
        created.setName("Tên Mới Đã Đổi");
        created.setSlug(null); // Leave slug null so it does not manually override
        CategoryDto updated = categoryService.updateCategory(created.getId(), created);

        assertEquals("Tên Mới Đã Đổi", updated.getName());
        assertEquals(originalSlug, updated.getSlug());
        System.out.println("CASE 4 SUCCESS: Name changed to '" + updated.getName() + "', slug remained immutable '" + updated.getSlug() + "'");
    }
}
