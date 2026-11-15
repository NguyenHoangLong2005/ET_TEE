package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** Product has @SQLRestriction("status <> 'DELETED'"): a deleted product must not load by id. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DeletedProductLookupIntegrationTest {

    @Autowired private ProductRepository productRepository;
    @Autowired private EntityManager em;

    @Test
    void deletedProductIsNotFoundById() {
        Product p = new Product();
        long sfx = System.nanoTime();
        p.setName("Ao da xoa " + sfx);
        p.setSlug("ao-da-xoa-" + sfx);
        p.setPrice(new BigDecimal("100000"));
        p.setStatus("DELETED");
        Long id = productRepository.saveAndFlush(p).getId();
        em.clear();

        assertThat(productRepository.findById(id)).isEmpty();
    }
}
