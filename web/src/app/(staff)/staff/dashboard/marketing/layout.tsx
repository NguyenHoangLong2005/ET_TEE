"use client";

import PermissionGuard from "@/components/auth/PermissionGuard";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard
      allowedRoles={["MARKETING_STAFF"]}
      requiredPermissions={[
        "MANAGE_BANNER_LANDING",
        "MANAGE_CAMPAIGN_PROMO",
        "MANAGE_PRODUCT_PLACEMENT",
        "VIEW_CAMPAIGN_ANALYTICS",
      ]}
    >
      {children}
    </PermissionGuard>
  );
}
