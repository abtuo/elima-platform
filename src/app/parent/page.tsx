import { redirect } from "next/navigation";

export default function ParentIndexPage() {
  // Redirect to the parent overview; auth is handled by Supabase session.
  redirect("/parent/overview");
}
