package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;

import java.util.List;
import java.util.Map;

public interface WishlistService {
    List<ProductDto> getWishlist(String userEmail, String guestToken);
    void addToWishlist(String userEmail, String guestToken, Long productId);
    void removeFromWishlist(String userEmail, String guestToken, Long productId);
    Map<String, Object> getWishlistCount(String userEmail, String guestToken);
    void mergeGuestWishlistToUser(String guestToken, String userEmail);
}
