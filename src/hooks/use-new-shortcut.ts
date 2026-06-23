"use client";

import { useEffect, useRef } from "react";
import { NEW_SHORTCUT_EVENT } from "@/lib/shortcuts";

export function useNewShortcut(onNew: () => void) {
  const onNewRef = useRef(onNew);

  useEffect(() => {
    onNewRef.current = onNew;
  }, [onNew]);

  useEffect(() => {
    const handleShortcut = () => onNewRef.current();
    window.addEventListener(NEW_SHORTCUT_EVENT, handleShortcut);
    return () => window.removeEventListener(NEW_SHORTCUT_EVENT, handleShortcut);
  }, []);
}
