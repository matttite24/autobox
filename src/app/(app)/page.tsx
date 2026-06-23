import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Autobox - Taller",
  description: "Sistema de gestión para taller",
};

export default function Home() {
  redirect("/inicio");
}
