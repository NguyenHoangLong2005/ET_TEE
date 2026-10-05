package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.UserBehaviorEvent;
import com.nguyenhoanglong.repository.UserBehaviorEventRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BehaviorEventServiceTest {

    private final UserBehaviorEventRepository repository = mock(UserBehaviorEventRepository.class);
    private final BehaviorEventService service = new BehaviorEventService(repository);

    private static final String UUID_TOKEN = "3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f";

    @Test
    void userKeyPrefersUserIdThenGuestUuid() {
        assertEquals("user-1", BehaviorEventService.resolveUserKey("user-1", UUID_TOKEN));
        assertEquals(UUID_TOKEN, BehaviorEventService.resolveUserKey(null, UUID_TOKEN));
        assertNull(BehaviorEventService.resolveUserKey(null, "  "));
    }

    @Test
    void nonUuidGuestTokenIsHashedToFitTheColumn() {
        String token = "guest-1759550000000-k3j4h5g6f7d8";
        String key = BehaviorEventService.resolveUserKey(null, token);
        assertEquals(36, key.length());
        assertEquals(key, BehaviorEventService.resolveUserKey(null, token), "stable across requests");
    }

    @Test
    void viewOfActiveProductIsSavedWithSanitizedFields() {
        when(repository.findActiveProductPrice(7L)).thenReturn(List.of(new BigDecimal("199000")));

        boolean saved = service.recordView(UUID_TOKEN, 7L, "sess-1234-abcd", "search",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile");

        assertTrue(saved);
        ArgumentCaptor<UserBehaviorEvent> captor = ArgumentCaptor.forClass(UserBehaviorEvent.class);
        verify(repository).save(captor.capture());
        UserBehaviorEvent e = captor.getValue();
        assertEquals(BehaviorEventService.VIEW, e.getEventType());
        assertEquals(new BigDecimal("199000"), e.getPriceAtEvent());
        assertEquals("sess-1234-abcd", e.getSessionId());
        assertEquals("search", e.getSource());
        assertEquals("mobile", e.getDeviceType());
        assertNotNull(e.getCreatedAt());
    }

    @Test
    void unknownSourceAndMalformedSessionAreDropped() {
        when(repository.findActiveProductPrice(7L)).thenReturn(List.of(BigDecimal.TEN));

        service.recordView(UUID_TOKEN, 7L, "<script>", "evil", null);

        ArgumentCaptor<UserBehaviorEvent> captor = ArgumentCaptor.forClass(UserBehaviorEvent.class);
        verify(repository).save(captor.capture());
        assertNull(captor.getValue().getSessionId());
        assertNull(captor.getValue().getSource());
    }

    @Test
    void viewOfMissingOrInactiveProductIsNotSaved() {
        when(repository.findActiveProductPrice(9L)).thenReturn(List.of());

        assertFalse(service.recordView(UUID_TOKEN, 9L, null, null, null));
        verify(repository, never()).save(any());
    }

    @Test
    void purchaseRecordsOneEventPerOrderLine() {
        when(repository.findOrderLines("DH123")).thenReturn(List.of(
                new Object[]{1L, 150000.0, 2},
                new Object[]{2L, 90000.0, 1}));

        service.recordPurchase("user-1", "DH123", null, null);

        ArgumentCaptor<UserBehaviorEvent> captor = ArgumentCaptor.forClass(UserBehaviorEvent.class);
        verify(repository, times(2)).save(captor.capture());
        assertEquals(List.of(1L, 2L), captor.getAllValues().stream().map(UserBehaviorEvent::getProductId).toList());
        assertEquals(2, captor.getAllValues().get(0).getQuantity());
        assertTrue(captor.getAllValues().stream().allMatch(e -> BehaviorEventService.PURCHASE.equals(e.getEventType())));
    }

    @Test
    void trackingFailureNeverPropagates() {
        when(repository.findVariantProductAndPrice(3L)).thenReturn(List.<Object[]>of(new Object[]{5L, BigDecimal.ONE}));
        when(repository.save(any())).thenThrow(new RuntimeException("db down"));

        assertDoesNotThrow(() -> service.recordAddToCart("user-1", 3L, 1, null, null));
    }

    @Test
    void mergeMovesGuestKeyToUser() {
        service.mergeGuestIntoUser(UUID_TOKEN, "user-1");
        verify(repository).reassignUser(UUID_TOKEN, "user-1");
    }
}
