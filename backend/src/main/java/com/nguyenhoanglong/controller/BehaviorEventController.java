package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.BehaviorEventService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Storefront tracking beacon. Only VIEW is accepted here: ADD_TO_CART / PURCHASE are recorded
 * server-side by CartController / OrderController once the action really succeeded.
 */
@RestController
@RequestMapping("/api/events")
public class BehaviorEventController {

    public static class TrackEventRequest {
        @NotNull
        private Long productId;
        private String eventType;
        private String sessionId;
        private String source;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public String getEventType() { return eventType; }
        public void setEventType(String eventType) { this.eventType = eventType; }
        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
    }

    private final BehaviorEventService behaviorEventService;
    private final UserRepository userRepository;

    public BehaviorEventController(BehaviorEventService behaviorEventService, UserRepository userRepository) {
        this.behaviorEventService = behaviorEventService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<Void> track(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent,
            @Valid @RequestBody TrackEventRequest request) {
        if (request.getEventType() != null && !BehaviorEventService.VIEW.equals(request.getEventType())) {
            return ResponseEntity.badRequest().build();
        }
        String userKey = BehaviorEventService.resolveUserKey(currentUserId(), guestToken);
        if (userKey == null) {
            return ResponseEntity.badRequest().build();
        }
        behaviorEventService.recordView(userKey, request.getProductId(), request.getSessionId(),
                request.getSource(), userAgent);
        return ResponseEntity.accepted().build();
    }

    private String currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return userRepository.findByEmail(auth.getName()).map(u -> u.getId()).orElse(null);
        }
        return null;
    }
}
