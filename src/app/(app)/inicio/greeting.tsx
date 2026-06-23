"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

export function GreetingMessage() {
  const currentUser = useQuery(api.users.currentUser, {});
  const greeting = getGreeting();
  
  const name = currentUser?.name?.split(" ")[0];

  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        {greeting}{name ? `, ${name}` : ""} 👋
      </span>
      <span className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        ¡Bienvenido a su taller!
      </span>
    </span>
  );
}
