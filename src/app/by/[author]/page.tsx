import { redirect } from "next/navigation";

// Author profile pages are retired. Techno Times no longer publishes under
// fictional reporter personas — every article is drafted by AI agents and
// signed off by the editor on duty. Any legacy /by/<slug> URL now performs a
// permanent redirect to the About page, which describes the masthead.
export default async function AuthorPage() {
  redirect("/about");
}
