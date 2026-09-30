package com.nguyenhoanglong.service;

/**
 * Result of merging a guest cart into a user cart.
 *
 * Contains a list of human-readable warnings (e.g. when merging a guest item
 * into the user cart would exceed the available stock). The caller (typically
 * AuthService during login/verifyEmail) is expected to surface these warnings
 * to the client instead of silently capping them.
 */
import java.util.Collections;
import java.util.List;

public class CartMergeResult {

    private final List<String> warnings;
    private final int mergedItems;
    private final int guestItemsProcessed;

    public CartMergeResult(List<String> warnings, int mergedItems, int guestItemsProcessed) {
        this.warnings = warnings == null ? Collections.emptyList() : Collections.unmodifiableList(warnings);
        this.mergedItems = mergedItems;
        this.guestItemsProcessed = guestItemsProcessed;
    }

    public static CartMergeResult empty() {
        return new CartMergeResult(Collections.emptyList(), 0, 0);
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public int getMergedItems() {
        return mergedItems;
    }

    public int getGuestItemsProcessed() {
        return guestItemsProcessed;
    }

    public boolean hasWarnings() {
        return !warnings.isEmpty();
    }
}
