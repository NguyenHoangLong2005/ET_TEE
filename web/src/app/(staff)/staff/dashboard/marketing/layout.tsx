"use client";

import PermissionGuard from "@/components/auth/PermissionGuard";
import MarketingNav from "@/components/staff/marketing/MarketingNav";

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
      <div className="border-b border-slate-200 bg-white px-6 py-3 md:px-8">
        <div className="mx-auto max-w-7xl">
          <MarketingNav />
        </div>
      </div>
      {children}
    </PermissionGuard>
  );
}
