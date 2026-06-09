import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import AuditsSection from "@/components/admin/AuditsSection";
import LinksSection from "@/components/admin/LinksSection";

export const dynamic = "force-dynamic";

// One room for editorial quality: the post-publish audit queue (the
// operator's daily job) followed by internal-link hygiene (the weekly one).
// Formerly two separate pages at /admin/audits and /admin/links.
export default async function AdminQuality() {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  return (
    <div className="space-y-12">
      <AuditsSection />
      <LinksSection />
    </div>
  );
}
