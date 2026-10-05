package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Voucher;
import com.nguyenhoanglong.repository.VoucherRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CustomerVoucherServiceTest {

    private final VoucherRepository repo = mock(VoucherRepository.class);
    private final MarketingService marketing = mock(MarketingService.class);
    private final CustomerVoucherService service = new CustomerVoucherService(repo, marketing);

    private static Voucher voucher(String code, String grantedTo) {
        Voucher v = new Voucher();
        v.setCode(code);
        v.setName(code);
        v.setType("PERCENT");
        v.setDiscountValue(BigDecimal.TEN);
        v.setGrantedToCustomerId(grantedTo);
        return v;
    }

    @Test
    void usableFirstBiggestDiscountFirstAndUnusableSayWhy() {
        Voucher big = voucher("BIG", null), small = voucher("SMALL", null), mine = voucher("WELCOME-ABC", "u1"),
                minOrder = voucher("MIN500", null);
        when(repo.findPersonalActive(eq("u1"), any())).thenReturn(List.of(mine));
        when(repo.findAllActive(any())).thenReturn(List.of(small, minOrder, big));
        when(marketing.validateVoucher(eq("MIN500"), any(), eq("u1")))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng tối thiểu 500000đ để dùng mã này"));
        when(marketing.computeDiscount(any(), any())).thenAnswer(i -> {
            String code = ((Voucher) i.getArgument(0)).getCode();
            BigDecimal d = switch (code) { case "BIG" -> new BigDecimal("80000"); case "WELCOME-ABC" -> new BigDecimal("30000"); default -> new BigDecimal("10000"); };
            return Map.of("discountAmount", d);
        });

        var options = service.optionsFor("u1", new BigDecimal("300000"));

        assertEquals(List.of("BIG", "WELCOME-ABC", "SMALL", "MIN500"), options.stream().map(CustomerVoucherService.VoucherOption::code).toList());
        assertTrue(options.get(1).personal());
        assertFalse(options.get(3).usable());
        assertTrue(options.get(3).reason().contains("tối thiểu"));
    }

    @Test
    void guestSeesOnlyPublicVouchers() {
        when(repo.findAllActive(any())).thenReturn(List.of(voucher("PUB", null)));
        when(marketing.computeDiscount(any(), any())).thenReturn(Map.of("discountAmount", BigDecimal.ONE));
        assertEquals(1, service.optionsFor(null, BigDecimal.TEN).size());
        verify(repo, never()).findPersonalActive(any(), any());
    }

    @Test
    void personalVoucherIsSingleUseBrandWideAndBoundToTheCustomer() {
        when(repo.existsByCode(anyString())).thenReturn(true, false);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        Voucher v = service.issuePersonal("u1", "WELCOME", "Quà", "Giảm 10%", BigDecimal.TEN, new BigDecimal("50000"),
                BigDecimal.ZERO, 30, "NEW_CUSTOMER", "SYSTEM:WELCOME");

        assertTrue(v.getCode().matches("WELCOME-[A-Z2-9]{6}"));
        assertEquals("u1", v.getGrantedToCustomerId());
        assertNull(v.getShopId());
        assertEquals(1, v.getMaxUses());
        assertEquals(1, v.getPerUserLimit());
        assertEquals("NEW_CUSTOMER", v.getTargetGroup());
        assertTrue(v.getEndDate().isAfter(LocalDateTime.now().plusDays(29)));
        verify(repo, times(2)).existsByCode(anyString());     // first code collided, regenerated
    }
}
