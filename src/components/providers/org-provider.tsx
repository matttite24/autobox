"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface OrgContextType {
  orgId: Id<"organizations"> | null;
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextType>({
  orgId: null,
  isLoading: true,
});

export function useOrg() {
  return useContext(OrgContext);
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgId] = useState<Id<"organizations"> | null>(null);
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  const initDefaultOrg = useMutation(api.organizations.initDefaultOrg);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    async function init() {
      try {
        const id = await initDefaultOrg();
        if (mounted) setOrgId(id);
      } catch (error) {
        console.error("Error initializing default organization:", error);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, initDefaultOrg]);

  return (
    <OrgContext.Provider value={{ orgId, isLoading: isAuthLoading || (isAuthenticated && !orgId) }}>
      {children}
    </OrgContext.Provider>
  );
}
