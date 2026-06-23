"use client";

import { useOrg } from "@/components/providers/org-provider";
import { RevenueChart } from "./revenue-chart";

export function RevenueChartWidget() {
  const { orgId } = useOrg();
  if (!orgId) return null;
  return <RevenueChart orgId={orgId} />;
}
