package com.nguyenhoanglong.service.impl;

import com.nguyenhoanglong.dto.CategoryDto;
import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.dto.ProductVariantDto;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.entity.WishlistItem;
import com.nguyenhoanglong.exception.ApiException;
import com.nguyenhoanglong.exception.ResourceNotFoundException;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.repository.WishlistItemRepository;
import com.nguyenhoanglong.service.WishlistService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class WishlistServiceImpl implements WishlistService {

    private final WishlistItemRepository wishlistRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public WishlistServiceImpl(WishlistItemRepository wishlistRepository, UserRepository userRepository, ProductRepository productRepository) {
        this.wishlistRepository = wishlistRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDto> getWishlist(String userEmail, String guestToken) {
        List<WishlistItem> items;
        if (userEmail != null) {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", userEmail));
            items = wishlistRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        } else if (guestToken != null) {
            items = wishlistRepository.findByGuestTokenOrderByCreatedAtDesc(guestToken);
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu phải có thông tin xác thực hoặc guest token");
        }

        return items.stream()
                .map(item -> mapToProductDto(item.getProduct()))
                .collect(Collectors.toList());
    }

    @Override
    public void addToWishlist(String userEmail, String guestToken, Long productId) {
        if (userEmail == null && guestToken == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu phải có thông tin xác thực hoặc guest token");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (userEmail != null) {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", userEmail));
            
            Optional<WishlistItem> existing = wishlistRepository.findByUserIdAndProductId(user.getId(), productId);
            if (existing.isEmpty()) {
                WishlistItem item = new WishlistItem();
                item.setUser(user);
                item.setProduct(product);
                wishlistRepository.save(item);
            }
        } else {
            Optional<WishlistItem> existing = wishlistRepository.findByGuestTokenAndProductId(guestToken, productId);
            if (existing.isEmpty()) {
                WishlistItem item = new WishlistItem();
                item.setGuestToken(guestToken);
                item.setProduct(product);
                wishlistRepository.save(item);
            }
        }
    }

    @Override
    public void removeFromWishlist(String userEmail, String guestToken, Long productId) {
        if (userEmail == null && guestToken == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu phải có thông tin xác thực hoặc guest token");
        }

        if (userEmail != null) {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", userEmail));
            wishlistRepository.findByUserIdAndProductId(user.getId(), productId)
                    .ifPresent(wishlistRepository::delete);
        } else {
            wishlistRepository.findByGuestTokenAndProductId(guestToken, productId)
                    .ifPresent(wishlistRepository::delete);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getWishlistCount(String userEmail, String guestToken) {
        long count = 0;
        if (userEmail != null) {
            User user = userRepository.findByEmail(userEmail).orElse(null);
            if (user != null) {
                count = wishlistRepository.countByUserId(user.getId());
            }
        } else if (guestToken != null) {
            count = wishlistRepository.countByGuestToken(guestToken);
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu phải có thông tin xác thực hoặc guest token");
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("count", count);
        return response;
    }

    @Override
    public void mergeGuestWishlistToUser(String guestToken, String userEmail) {
        if (guestToken == null || userEmail == null) return;
        
        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null) return;

        List<WishlistItem> guestItems = wishlistRepository.findByGuestToken(guestToken);
        for (WishlistItem guestItem : guestItems) {
            Optional<WishlistItem> existingUserItem = wishlistRepository.findByUserIdAndProductId(user.getId(), guestItem.getProduct().getId());
            if (existingUserItem.isEmpty()) {
                // Update item to belong to user
                guestItem.setGuestToken(null);
                guestItem.setUser(user);
                wishlistRepository.save(guestItem);
            } else {
                // Duplicate, just delete guest item
                wishlistRepository.delete(guestItem);
            }
        }
    }

    private ProductDto mapToProductDto(Product product) {
        CategoryDto categoryDto = null;
        if (product.getCategory() != null) {
            categoryDto = CategoryDto.builder()
                    .id(product.getCategory().getId())
                    .name(product.getCategory().getName())
                    .description(product.getCategory().getDescription())
                    .build();
        }

        List<ProductVariantDto> variantDtos = new ArrayList<>();
        if (product.getVariants() != null) {
            variantDtos = product.getVariants().stream()
                    .map(v -> ProductVariantDto.builder()
                            .id(v.getId())
                            .sku(v.getSku())
                            .color(v.getColor())
                            .colorHex(v.getColorHex())
                            .size(v.getSize())
                            .price(v.getPrice())
                            .salePrice(v.getSalePrice())
                            .stock(v.getStock())
                            .availableQuantity(v.getAvailableQuantity())
                            .build())
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> imageDtos = new ArrayList<>();
        if (product.getImages() != null) {
            for (com.nguyenhoanglong.entity.ProductImage img : product.getImages()) {
                Map<String, Object> imgDto = new HashMap<>();
                imgDto.put("imageUrl", img.getImageUrl());
                imgDto.put("alt", img.getAlt());
                imgDto.put("isPrimary", img.getIsPrimary());
                imgDto.put("sortOrder", img.getSortOrder());
                imageDtos.add(imgDto);
            }
        }

        return ProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .description(product.getDescription())
                .brand(product.getBrand())
                .price(product.getPrice())
                .salePrice(product.getSalePrice())
                .category(categoryDto)
                .categoryId(categoryDto != null ? categoryDto.getId() : null)
                .gender(product.getGender())
                .targetGroup(product.getTargetGroup())
                .productType(product.getProductType())
                .material(product.getMaterial())
                .style(product.getStyle())
                .status(product.getStatus())
                .isNew(product.getIsNew())
                .isBestSeller(product.getIsBestSeller())
                .isSale(product.getIsSale())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .styleTags(product.getStyleTags() != null ? product.getStyleTags() : new ArrayList<>())
                .recommendationTags(product.getRecommendationTags() != null ? product.getRecommendationTags() : new ArrayList<>())
                .variants(variantDtos)
                .images(imageDtos)
                .build();
    }
}
