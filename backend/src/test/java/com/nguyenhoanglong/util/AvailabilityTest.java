package com.nguyenhoanglong.util;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.dto.ProductVariantDto;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AvailabilityTest {

    private static ProductDto product(Integer... available) {
        ProductDto p = new ProductDto();
        p.setVariants(java.util.Arrays.stream(available)
                .map(a -> ProductVariantDto.builder().availableQuantity(a).build()).toList());
        return p;
    }

    @Test
    void soldOutInEverySizeIsOut() {
        assertThat(Availability.inStock(product(0, 0))).isFalse();
    }

    @Test
    void oneSizeLeftIsIn() {
        assertThat(Availability.inStock(product(0, 2))).isTrue();
    }

    @Test
    void noVariantDataIsKept() {
        assertThat(Availability.inStock(new ProductDto())).isTrue();
        assertThat(Availability.inStockOnly(List.of(product(0), product(1)))).hasSize(1);
    }
}
