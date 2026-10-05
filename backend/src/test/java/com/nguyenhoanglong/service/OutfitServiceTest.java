package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.recsys.OutfitModel;
import com.nguyenhoanglong.repository.ProductRepository;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OutfitServiceTest {

    private final OutfitModel model = mock(OutfitModel.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final ProductService productService = mock(ProductService.class);
    private final OutfitService service = new OutfitService(model, products, productService);

    private static Product product(long id, String type, String group) throws Exception {
        Product p = new Product();
        Field f = Product.class.getDeclaredField("id");
        f.setAccessible(true);
        f.set(p, id);
        p.setProductType(type);
        p.setTargetGroup(group);
        p.setStatus("ACTIVE");
        return p;
    }

    private static ProductDto dto(long id) {
        ProductDto d = new ProductDto();
        d.setId(id);
        return d;
    }

    @Test
    void fillsEveryTemplateSlotWithTheBestMatchAndKeepsAlternatives() throws Exception {
        when(products.findBySlug("ao")).thenReturn(Optional.of(product(1, "tshirt", "men")));
        when(model.isAvailable()).thenReturn(true);
        when(model.knows(1L)).thenReturn(true);
        when(model.slotOfType("tshirt")).thenReturn("top");
        when(model.templateFor("top")).thenReturn(List.of("bottom", "accessory"));
        when(model.candidates("bottom", "men")).thenReturn(new ArrayList<>(List.of(10L, 11L, 12L)));
        when(model.candidates("accessory", "men")).thenReturn(new ArrayList<>(List.of(20L, 21L)));
        Map<Long, Double> withAnchor = Map.of(10L, 0.1, 11L, 0.9, 12L, 0.5, 20L, 0.5, 21L, 0.5);
        when(model.compat(eq(1L), anyLong())).thenAnswer(i -> withAnchor.get((Long) i.getArgument(1)));
        // the accessories tie with the T-shirt; 21 goes better with the chosen trousers (11)
        when(model.compat(eq(11L), anyLong())).thenAnswer(i -> (Long) i.getArgument(1) == 21L ? 1.0 : 0.0);
        when(productService.getActiveProductsInOrder(anyList()))
                .thenAnswer(i -> ((List<Long>) i.getArgument(0)).stream().map(OutfitServiceTest::dto).toList());

        OutfitService.Outfit outfit = service.outfitFor("ao");

        assertEquals(OutfitService.Strategy.MODEL, outfit.strategy());
        assertEquals("top", outfit.anchorSlot());
        assertEquals(List.of("bottom", "accessory"), outfit.pieces().stream().map(OutfitService.OutfitPiece::slot).toList());
        assertEquals(11L, outfit.pieces().get(0).product().getId());
        assertEquals(List.of(12L, 10L), outfit.pieces().get(0).alternatives().stream().map(ProductDto::getId).toList());
        assertEquals(21L, outfit.pieces().get(1).product().getId());
    }

    @Test
    void inactiveTopPickFallsThroughToTheNextOne() throws Exception {
        when(products.findBySlug("ao")).thenReturn(Optional.of(product(1, "tshirt", "men")));
        when(model.isAvailable()).thenReturn(true);
        when(model.knows(1L)).thenReturn(true);
        when(model.slotOfType("tshirt")).thenReturn("top");
        when(model.templateFor("top")).thenReturn(List.of("bottom"));
        when(model.candidates("bottom", "men")).thenReturn(new ArrayList<>(List.of(10L, 11L)));
        when(model.compat(eq(1L), anyLong())).thenAnswer(i -> (Long) i.getArgument(1) == 10L ? 0.9 : 0.1);
        when(productService.getActiveProductsInOrder(anyList())).thenReturn(List.of(dto(11)));   // 10 inactive

        assertEquals(11L, service.outfitFor("ao").pieces().get(0).product().getId());
    }

    @Test
    void productUnknownToTheModelKeepsTheRuleBasedOutfit() throws Exception {
        when(products.findBySlug("moi")).thenReturn(Optional.of(product(99, "tshirt", "men")));
        when(model.isAvailable()).thenReturn(true);
        when(model.slotOfType("tshirt")).thenReturn("top");
        when(model.knows(99L)).thenReturn(false);
        when(productService.getOutfits("moi")).thenReturn(List.of(dto(5)));

        OutfitService.Outfit outfit = service.outfitFor("moi");

        assertEquals(OutfitService.Strategy.RULE, outfit.strategy());
        assertEquals(5L, outfit.pieces().get(0).product().getId());
        assertNull(outfit.pieces().get(0).slot());
    }
}
