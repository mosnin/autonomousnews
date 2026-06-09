import { redirect } from "next/navigation";

// Folded into the /admin overview health strip. Redirect preserves bookmarks.
export default function AdminHealth() {
  redirect("/admin");
}
