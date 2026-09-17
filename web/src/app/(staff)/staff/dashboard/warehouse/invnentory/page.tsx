import { redirect } from "next/navigation";

export default function LegacyInventoryPage() {
  redirect("/staff/dashboard/warehouse/inventory");
}
