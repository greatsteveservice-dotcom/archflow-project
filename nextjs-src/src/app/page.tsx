import { redirect } from "next/navigation";

// Root redirects to /projects. /projects handles auth (redirects to /login if no session).
// Public landing lives at /welcome — see src/app/welcome/page.tsx.
export default function HomePage() {
  redirect("/projects");
}
