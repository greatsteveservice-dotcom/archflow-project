"use client";

import { redirect } from "next/navigation";

// App Router version redirects to SPA — all navigation happens in main page.tsx
export default function VisitPageRoute() {
  redirect("/");
}
