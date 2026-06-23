"use client";

import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppHeader({
  title,
  mobileTitle,
  children,
  toolbar,
  className,
}: {
  title: string;
  mobileTitle?: string;
  children?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("sticky top-0 z-10 border-b bg-background px-4 py-3 shrink-0 sm:px-6", className)}>
      {/* Mobile Layout */}
      <div className="flex md:hidden items-center gap-3 min-w-0 w-full">
        <SidebarTrigger />
        <h1 className={cn("font-semibold shrink-0 whitespace-nowrap text-sm", toolbar ? "" : "flex-1")}>
          <span>{mobileTitle ?? title}</span>
        </h1>
        {toolbar ? <div className="flex min-w-0 flex-1 items-center justify-center">{toolbar}</div> : null}
        <div className={cn("flex items-center gap-2 shrink-0", toolbar ? "" : "ml-auto")}>
          {children}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger className="md:hidden" />
          <h1 className="font-semibold shrink-0 whitespace-nowrap text-base truncate">
            <span>{title}</span>
          </h1>
        </div>
        <div className="flex items-center justify-center w-[400px] lg:w-[448px]">
          {toolbar}
        </div>
        <div className="flex items-center justify-end gap-2 min-w-0">
          {children}
        </div>
      </div>
    </header>
  );
}
