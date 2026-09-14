package com.nguyenhoanglong.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nguyenhoanglong.entity.Category;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductImage;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.repository.CategoryRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class DataSeederService {

    private static final Logger logger = LoggerFactory.getLogger(DataSeederService.class);

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // Uncomment this to automatically run seeding on startup
    // @PostConstruct
    public void seedDataOnStartup() {
        try {
            seedProducts();
        } catch (Exception e) {
            logger.error("Failed to seed data: ", e);
        }
    }

    public void seedProducts() throws Exception {
        long count = productRepository.count();
        if (count >= 668) {
            logger.info("Database already contains {} products. Skipping seed.", count);
            return;
        }

        File jsonFile = new File("../valid-products.json");
        if (!jsonFile.exists()) {
            jsonFile = new File("valid-products.json");
        }
        
        if (!jsonFile.exists()) {
            logger.warn("Could not find valid-products.json for seeding.");
            return;
        }

        logger.info("Starting database seeding from {}", jsonFile.getAbsolutePath());
        JsonNode rootNode = objectMapper.readTree(jsonFile);
        
        int inserted = 0;
        int skipped = 0;
        int total = rootNode.size();

        for (JsonNode node : rootNode) {
            String slug = node.get("slug").asText();
            
            // Idempotency check
            if (productRepository.findBySlug(slug).isPresent()) {
                skipped++;
                continue;
            }

            // Map Category
            String categoryName = node.get("category").asText();
            Category category = categoryRepository.findByName(categoryName)
                .orElseGet(() -> {
                    Category c = new Category();
                    c.setName(categoryName);
                    c.setSlug(categoryName.toLowerCase());
                    return categoryRepository.save(c);
                });

            Product product = new Product();
            product.setName(node.get("name").asText());
            product.setSlug(slug);
            product.setDescription(node.has("description") ? node.get("description").asText() : "");
            product.setCategory(category);
            product.setTargetGroup(node.has("targetGroup") ? node.get("targetGroup").asText() : null);
            product.setProductType(node.has("productType") ? node.get("productType").asText() : null);
            product.setMaterial(node.has("material") ? node.get("material").asText() : null);
            product.setPrice(new BigDecimal(node.get("price").asText()));
            product.setSalePrice(new BigDecimal(node.get("salePrice").asText()));
            product.setStatus(node.has("status") ? node.get("status").asText() : "ACTIVE");
            product.setIsNew(node.has("isNew") && node.get("isNew").asBoolean());
            product.setIsBestSeller(node.has("isBestSeller") && node.get("isBestSeller").asBoolean());
            product.setIsSale(node.has("isSale") && node.get("isSale").asBoolean());
            
            // Extract tags
            if (node.has("styleTags")) {
                List<String> sTags = new ArrayList<>();
                node.get("styleTags").forEach(tag -> sTags.add(tag.asText()));
                product.setStyleTags(sTags);
            }
            if (node.has("recommendationTags")) {
                List<String> rTags = new ArrayList<>();
                node.get("recommendationTags").forEach(tag -> rTags.add(tag.asText()));
                product.setRecommendationTags(rTags);
            }

            // Extract variants
            if (node.has("variants")) {
                for (JsonNode vNode : node.get("variants")) {
                    ProductVariant variant = new ProductVariant();
                    variant.setSku(vNode.get("sku").asText());
                    variant.setColor(vNode.has("colorName") ? vNode.get("colorName").asText() : null);
                    variant.setColorHex(vNode.has("colorHex") ? vNode.get("colorHex").asText() : null);
                    variant.setSize(vNode.has("size") ? vNode.get("size").asText() : null);
                    variant.setStock(vNode.get("stockQuantity").asInt());
                    variant.setAvailableQuantity(vNode.get("availableQuantity").asInt());
                    variant.setPrice(new BigDecimal(vNode.get("price").asText()));
                    variant.setSalePrice(new BigDecimal(vNode.get("salePrice").asText()));
                    product.addVariant(variant);
                }
            }

            // Extract images
            if (node.has("images")) {
                for (JsonNode imgNode : node.get("images")) {
                    ProductImage img = new ProductImage();
                    img.setImageUrl(imgNode.get("imageUrl").asText());
                    img.setAlt(imgNode.has("alt") ? imgNode.get("alt").asText() : "");
                    img.setIsPrimary(imgNode.has("isPrimary") && imgNode.get("isPrimary").asBoolean());
                    img.setSortOrder(imgNode.has("sortOrder") ? imgNode.get("sortOrder").asInt() : 0);
                    product.addImage(img);
                }
            }

            productRepository.save(product);
            inserted++;
            
            if (inserted % 50 == 0) {
                logger.info("Seeding progress: {} / {}", inserted, total);
            }
        }

        logger.info("Seeding completed! Inserted: {}, Skipped: {}", inserted, skipped);
    }
}
