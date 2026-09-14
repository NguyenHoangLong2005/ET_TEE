package com.nguyenhoanglong.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileWriter;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DataAuditService {

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    // Define colors mapping
    private static final Map<String, String> COLOR_MAP = new HashMap<>();
    static {
        COLOR_MAP.put("trắng", "#FFFFFF");
        COLOR_MAP.put("đen", "#111111");
        COLOR_MAP.put("xám", "#808080");
        COLOR_MAP.put("ghi", "#808080");
        COLOR_MAP.put("be", "#D8C3A5");
        COLOR_MAP.put("kem", "#D8C3A5");
        COLOR_MAP.put("xanh navy", "#1F2A44");
        COLOR_MAP.put("xanh dương", "#2F80ED");
        COLOR_MAP.put("xanh lá", "#2E7D32");
        COLOR_MAP.put("đỏ", "#D32F2F");
        COLOR_MAP.put("hồng", "#E91E63");
        COLOR_MAP.put("vàng", "#F2C94C");
        COLOR_MAP.put("nâu", "#8D6E63");
        COLOR_MAP.put("tím", "#7E57C2");
    }

    public DataAuditService(ProductRepository productRepository, ObjectMapper objectMapper) {
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> runProductAudit() {
        List<Product> products = productRepository.findAllWithDetails();
        List<Map<String, Object>> reports = new ArrayList<>();
        List<Map<String, Object>> kidsGenderReports = new ArrayList<>();
        int autoFixedCount = 0;
        int needsReviewCount = 0;
        int kidsAutoFixedCount = 0;
        int kidsNeedsReviewCount = 0;

        for (Product product : products) {
            List<Map<String, Object>> issues = new ArrayList<>();
            boolean isModified = false;

            // Gather current data for report
            String currentTargetGroup = product.getTargetGroup() != null ? product.getTargetGroup().toLowerCase() : "";
            Set<String> sizes = new HashSet<>();
            Set<String> colors = new HashSet<>();

            if (product.getVariants() != null) {
                for (ProductVariant variant : product.getVariants()) {
                    if (variant.getSize() != null) sizes.add(variant.getSize().toUpperCase());
                    if (variant.getColor() != null) colors.add(variant.getColor().toLowerCase());
                }
            }

            // 1. Audit TargetGroup vs Size (FLAG ONLY)
            boolean hasAdultSize = sizes.stream().anyMatch(s -> s.equals("XS") || s.equals("S") || s.equals("M") || s.equals("L") || s.equals("XL") || s.equals("XXL"));
            boolean hasKidsSize = sizes.stream().anyMatch(s -> s.matches("90|100|110|120|130|140|150|160"));

            if ("kids".equals(currentTargetGroup) && hasAdultSize && !hasKidsSize) {
                issues.add(createIssue("TargetGroup-Size Mismatch", "targetGroup=kids but sizes are adult sizes", "NEEDS_REVIEW", "HIGH", "Review and change targetGroup to men/women/unisex"));
                needsReviewCount++;
            }
            if (("men".equals(currentTargetGroup) || "women".equals(currentTargetGroup)) && hasKidsSize && !hasAdultSize) {
                issues.add(createIssue("TargetGroup-Size Mismatch", "targetGroup=" + currentTargetGroup + " but sizes are kids sizes", "NEEDS_REVIEW", "HIGH", "Review and change targetGroup to kids"));
                needsReviewCount++;
            }

            // 2. Trim/Lowercase slug safely (AUTO_FIX)
            if (product.getSlug() != null && !product.getSlug().equals(product.getSlug().trim().toLowerCase())) {
                product.setSlug(product.getSlug().trim().toLowerCase());
                issues.add(createIssue("Slug Format", "Slug had uppercase/spaces", "AUTO_FIXED", "LOW", "Trimmed and lowercased"));
                isModified = true;
                autoFixedCount++;
            }

            // 3. Variant Color Audit (AUTO_FIX safe colors)
            if (product.getVariants() != null) {
                for (ProductVariant variant : product.getVariants()) {
                    if (variant.getColor() != null) {
                        String colorName = variant.getColor().trim().toLowerCase();
                        String expectedHex = getExpectedHex(colorName);
                        
                        if (expectedHex != null) {
                            if (variant.getColorHex() == null || !variant.getColorHex().equalsIgnoreCase(expectedHex)) {
                                // Auto fix if known mapping
                                if (variant.getColorHex() == null || variant.getColorHex().equals("#000000")) {
                                    variant.setColorHex(expectedHex);
                                    issues.add(createIssue("Color Hex Fix", "Set hex for " + colorName + " to " + expectedHex, "AUTO_FIXED", "MEDIUM", "Auto mapped"));
                                    isModified = true;
                                    autoFixedCount++;
                                } else {
                                    // Hex exists but doesn't match standard mapping
                                    issues.add(createIssue("Color Hex Mismatch", "Variant color is " + colorName + " but hex is " + variant.getColorHex(), "NEEDS_REVIEW", "MEDIUM", "Check if hex " + variant.getColorHex() + " is intended or should be " + expectedHex));
                                    needsReviewCount++;
                                }
                            }
                        } else {
                            // Unknown color
                            if (variant.getColorHex() == null || variant.getColorHex().equals("#000000")) {
                                variant.setColor("Theo ảnh");
                                variant.setColorHex(null);
                                issues.add(createIssue("Unknown Color Hex", "Color " + colorName + " has no known hex mapping and was #000000 or null", "AUTO_FIXED", "MEDIUM", "Set color name to 'Theo ảnh' and hex to null to avoid wrong default"));
                                isModified = true;
                                autoFixedCount++;
                            } else {
                                issues.add(createIssue("Unknown Color Name", "Color " + colorName + " has custom hex " + variant.getColorHex(), "NEEDS_VISUAL_REVIEW", "LOW", "Verify if hex matches real product color"));
                            }
                        }
                    }
                }
            }

            // 4. Kids Gender Audit
            boolean isKidsGenderIssue = false;
            List<Map<String, Object>> kidsIssues = new ArrayList<>();
            if ("kids".equals(currentTargetGroup)) {
                String nameLower = product.getName() != null ? product.getName().toLowerCase() : "";
                String slugLower = product.getSlug() != null ? product.getSlug().toLowerCase() : "";
                String currentGender = product.getGender() != null ? product.getGender().toLowerCase() : "";
                
                boolean hasGirlKeywords = nameLower.contains("bé gái") || slugLower.contains("be-gai") || nameLower.contains("váy") || nameLower.contains("đầm");
                boolean hasBoyKeywords = nameLower.contains("bé trai") || slugLower.contains("be-trai");

                if (hasGirlKeywords && !hasBoyKeywords) {
                    if (!"girl".equals(currentGender)) {
                        product.setGender("girl");
                        Map<String, Object> issue = createIssue("Kids Gender Mismatch", "Product name contains girl keywords but gender is " + currentGender, "AUTO_FIXED", "HIGH", "Set gender to girl");
                        issues.add(issue);
                        kidsIssues.add(issue);
                        isModified = true;
                        autoFixedCount++;
                        kidsAutoFixedCount++;
                        isKidsGenderIssue = true;
                    }
                } else if (hasBoyKeywords && !hasGirlKeywords) {
                    if (!"boy".equals(currentGender)) {
                        product.setGender("boy");
                        Map<String, Object> issue = createIssue("Kids Gender Mismatch", "Product name contains boy keywords but gender is " + currentGender, "AUTO_FIXED", "HIGH", "Set gender to boy");
                        issues.add(issue);
                        kidsIssues.add(issue);
                        isModified = true;
                        autoFixedCount++;
                        kidsAutoFixedCount++;
                        isKidsGenderIssue = true;
                    }
                } else if (currentGender.isEmpty()) {
                    Map<String, Object> issue = createIssue("Kids Gender Missing", "Kids product missing gender", "NEEDS_REVIEW", "MEDIUM", "Please verify and set gender to boy, girl, or unisex");
                    issues.add(issue);
                    kidsIssues.add(issue);
                    needsReviewCount++;
                    kidsNeedsReviewCount++;
                    isKidsGenderIssue = true;
                } else if ("boy".equals(currentGender) && hasGirlKeywords) {
                    Map<String, Object> issue = createIssue("Kids Gender Conflict", "Product gender is boy but name contains girl keywords", "NEEDS_REVIEW", "HIGH", "Please verify and update gender/name");
                    issues.add(issue);
                    kidsIssues.add(issue);
                    needsReviewCount++;
                    kidsNeedsReviewCount++;
                    isKidsGenderIssue = true;
                } else if ("girl".equals(currentGender) && hasBoyKeywords) {
                    Map<String, Object> issue = createIssue("Kids Gender Conflict", "Product gender is girl but name contains boy keywords", "NEEDS_REVIEW", "HIGH", "Please verify and update gender/name");
                    issues.add(issue);
                    kidsIssues.add(issue);
                    needsReviewCount++;
                    kidsNeedsReviewCount++;
                    isKidsGenderIssue = true;
                }
            }

            if (!issues.isEmpty()) {
                Map<String, Object> reportItem = new LinkedHashMap<>();
                reportItem.put("productId", product.getId());
                reportItem.put("productName", product.getName());
                reportItem.put("slug", product.getSlug());
                reportItem.put("currentTargetGroup", product.getTargetGroup());
                reportItem.put("category", product.getCategory() != null ? product.getCategory().getSlug() : null);
                reportItem.put("productType", product.getProductType());
                reportItem.put("gender", product.getGender());
                reportItem.put("sizes", sizes);
                reportItem.put("colors", colors);
                reportItem.put("issues", issues);
                reports.add(reportItem);
            }

            if (isKidsGenderIssue && !kidsIssues.isEmpty()) {
                Map<String, Object> kidsReportItem = new LinkedHashMap<>();
                kidsReportItem.put("productId", product.getId());
                kidsReportItem.put("productName", product.getName());
                kidsReportItem.put("slug", product.getSlug());
                kidsReportItem.put("gender", product.getGender());
                kidsReportItem.put("issues", kidsIssues);
                kidsGenderReports.add(kidsReportItem);
            }

            if (isModified) {
                productRepository.save(product);
            }
        }

        // Generate files
        Map<String, Object> finalReport = new LinkedHashMap<>();
        finalReport.put("timestamp", LocalDateTime.now().toString());
        finalReport.put("totalProductsAudited", products.size());
        finalReport.put("autoFixedIssues", autoFixedCount);
        finalReport.put("needsReviewIssues", needsReviewCount);
        finalReport.put("details", reports);

        try {
            // Write JSON
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File("product-data-audit.json"), finalReport);
            
            // Write MD
            try (FileWriter mdWriter = new FileWriter("product-data-audit.md")) {
                mdWriter.write("# Product Data Audit Report\n\n");
                mdWriter.write("- **Total Audited:** " + products.size() + "\n");
                mdWriter.write("- **Auto Fixed:** " + autoFixedCount + "\n");
                mdWriter.write("- **Needs Review:** " + needsReviewCount + "\n\n");
                
                for (Map<String, Object> item : reports) {
                    mdWriter.write("### Product ID: " + item.get("productId") + " - " + item.get("productName") + "\n");
                    mdWriter.write("- **Slug:** `" + item.get("slug") + "`\n");
                    mdWriter.write("- **Target Group:** `" + item.get("currentTargetGroup") + "`\n");
                    mdWriter.write("- **Sizes:** `" + item.get("sizes") + "`\n");
                    mdWriter.write("- **Colors:** `" + item.get("colors") + "`\n");
                    mdWriter.write("- **Issues:**\n");
                    
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> issues = (List<Map<String, Object>>) item.get("issues");
                    for (Map<String, Object> issue : issues) {
                        mdWriter.write("  - [" + issue.get("action") + "] **" + issue.get("type") + "** (" + issue.get("severity") + "): " + issue.get("description") + " -> *Suggestion: " + issue.get("suggestedFix") + "*\n");
                    }
                    mdWriter.write("\n");
                }
            }
            
            // Write Kids Gender JSON
            Map<String, Object> kidsFinalReport = new LinkedHashMap<>();
            kidsFinalReport.put("timestamp", LocalDateTime.now().toString());
            kidsFinalReport.put("totalKidsIssues", kidsGenderReports.size());
            kidsFinalReport.put("autoFixedIssues", kidsAutoFixedCount);
            kidsFinalReport.put("needsReviewIssues", kidsNeedsReviewCount);
            kidsFinalReport.put("details", kidsGenderReports);

            objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File("kids-gender-audit.json"), kidsFinalReport);

            // Write Kids Gender MD
            try (FileWriter mdWriter = new FileWriter("kids-gender-audit.md")) {
                mdWriter.write("# Kids Gender Audit Report\n\n");
                mdWriter.write("- **Total Issues:** " + kidsGenderReports.size() + "\n");
                mdWriter.write("- **Auto Fixed:** " + kidsAutoFixedCount + "\n");
                mdWriter.write("- **Needs Review:** " + kidsNeedsReviewCount + "\n\n");
                
                for (Map<String, Object> item : kidsGenderReports) {
                    mdWriter.write("### Product ID: " + item.get("productId") + " - " + item.get("productName") + "\n");
                    mdWriter.write("- **Slug:** `" + item.get("slug") + "`\n");
                    mdWriter.write("- **Current Gender:** `" + item.get("gender") + "`\n");
                    mdWriter.write("- **Issues:**\n");
                    
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> kidsIssueList = (List<Map<String, Object>>) item.get("issues");
                    for (Map<String, Object> issue : kidsIssueList) {
                        mdWriter.write("  - [" + issue.get("action") + "] **" + issue.get("type") + "** (" + issue.get("severity") + "): " + issue.get("description") + " -> *Suggestion: " + issue.get("suggestedFix") + "*\n");
                    }
                    mdWriter.write("\n");
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return finalReport;
    }

    private String getExpectedHex(String colorName) {
        for (Map.Entry<String, String> entry : COLOR_MAP.entrySet()) {
            if (colorName.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private Map<String, Object> createIssue(String type, String desc, String action, String severity, String suggestedFix) {
        Map<String, Object> issue = new LinkedHashMap<>();
        issue.put("type", type);
        issue.put("description", desc);
        issue.put("action", action);
        issue.put("severity", severity);
        issue.put("suggestedFix", suggestedFix);
        return issue;
    }
}
