"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

// Hidden client island. Checks Supabase session and redirects authenticated
// users to /projects. Renders nothing visible — keeps Landing markup fully
// server-rendered for SEO crawlers.
//
// `?preview` query param suppresses redirect (lets logged-in users view the
// landing without logging out).
export default function AuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).has("preview");
    if (preview) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/projects");
    });
  }, [router]);
  return null;
}
