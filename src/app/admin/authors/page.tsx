import { redirect } from "next/navigation";

// The author roster is retired. Techno Times runs a single-editor masthead;
// there is no per-author admin surface. This route redirects to the admin
// dashboard so any bookmarked link still lands somewhere useful.
export default async function AdminAuthors() {
  redirect("/admin");
}
