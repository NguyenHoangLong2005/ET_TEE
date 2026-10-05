package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.BehaviorEventService;
import com.nguyenhoanglong.service.CartComplementService;
import com.nguyenhoanglong.service.ForYouService;
import com.nguyenhoanglong.service.OutfitService;
import com.nguyenhoanglong.service.SizeAdvisorService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Recommendation feeds for signed-in shoppers and guests (guest cart token):
 * home page "Danh rieng cho ban" (SASRec), cart "Thuong duoc mua kem" (FP-Growth rules) and the
 * PDP "Phoi tron bo" outfit (compatibility model) and size advice (published size charts).
 */
@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final ForYouService forYouService;
    private final CartComplementService cartComplementService;
    private final OutfitService outfitService;
    private final SizeAdvisorService sizeAdvisorService;
    private final UserRepository userRepository;

    public RecommendationController(ForYouService forYouService, CartComplementService cartComplementService,
                                    OutfitService outfitService, SizeAdvisorService sizeAdvisorService,
                                    UserRepository userRepository) {
        this.forYouService = forYouService;
        this.cartComplementService = cartComplementService;
        this.outfitService = outfitService;
        this.sizeAdvisorService = sizeAdvisorService;
        this.userRepository = userRepository;
    }

    /** Size for a product from the given measurements, or the signed-in shopper's saved ones. */
    @GetMapping("/size/{slug}")
    public ResponseEntity<ApiResponse<SizeAdvisorService.Advice>> size(
            @PathVariable String slug,
            @RequestParam(required = false) Double height, @RequestParam(required = false) Double weight,
            @RequestParam(required = false) Double chest, @RequestParam(required = false) Double waist,
            @RequestParam(required = false) Double shoulder, @RequestParam(required = false) String fit) {
        var body = body(height, weight, chest, waist, shoulder, fit);
        return ResponseEntity.ok(ApiResponse.success(sizeAdvisorService.forProduct(slug, body, currentEmail())));
    }

    /** /size-guide calculator: chart MEN_TOP | MEN_BOTTOM | WOMEN | KIDS. */
    @GetMapping("/size-chart/{chart}")
    public ResponseEntity<ApiResponse<SizeAdvisorService.Advice>> sizeForChart(
            @PathVariable String chart,
            @RequestParam(required = false) Double height, @RequestParam(required = false) Double weight,
            @RequestParam(required = false) Double chest, @RequestParam(required = false) Double waist,
            @RequestParam(required = false) Double shoulder, @RequestParam(required = false) String fit) {
        var body = body(height, weight, chest, waist, shoulder, fit);
        return ResponseEntity.ok(ApiResponse.success(sizeAdvisorService.forChart(chart.toUpperCase(), body)));
    }

    private static SizeAdvisorService.Body body(Double height, Double weight, Double chest, Double waist,
                                                Double shoulder, String fit) {
        check("height", height, 50, 230);
        check("weight", weight, 5, 250);
        check("chest", chest, 40, 200);
        check("waist", waist, 30, 200);
        check("shoulder", shoulder, 20, 80);
        SizeAdvisorService.Fit f = null;
        if (fit != null && !fit.isBlank()) {
            try {
                f = SizeAdvisorService.Fit.valueOf(fit.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fit must be SLIM, REGULAR or LOOSE");
            }
        }
        if (height == null && weight == null && chest == null && waist == null && shoulder == null) return null;
        return new SizeAdvisorService.Body(height, weight, chest, waist, shoulder, f);
    }

    private static void check(String name, Double v, double min, double max) {
        if (v != null && (v.isNaN() || v < min || v > max)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + " out of range");
        }
    }

    @GetMapping("/outfit/{slug}")
    public ResponseEntity<ApiResponse<OutfitService.Outfit>> outfit(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(outfitService.outfitFor(slug)));
    }

    @GetMapping("/cart-complements")
    public ResponseEntity<ApiResponse<CartComplementService.CartComplements>> cartComplements(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @RequestParam(defaultValue = "4") int limit) {
        var result = cartComplementService.forCart(currentEmail(), guestToken, Math.max(1, Math.min(limit, 12)));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private String currentEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return auth.getName();
        }
        return null;
    }

    @GetMapping("/for-you")
    public ResponseEntity<ApiResponse<ForYouService.ForYouResult>> forYou(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @RequestParam(defaultValue = "12") int limit) {
        String userKey = BehaviorEventService.resolveUserKey(currentUserId(), guestToken);
        var result = forYouService.recommend(userKey, Math.max(1, Math.min(limit, 24)));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private String currentUserId() {
        String email = currentEmail();
        return email == null ? null : userRepository.findByEmail(email).map(u -> u.getId()).orElse(null);
    }
}
