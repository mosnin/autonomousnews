import { redirect } from "next/navigation";

// Merged into /admin/quality. Redirect preserves bookmarks.
export default function AdminLinks() {
  redirect("/admin/quality");
}
