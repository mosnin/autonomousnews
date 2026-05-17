import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-wash">
      <div className="bg-ink text-white">
        <div className="max-w-content mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-nameplate text-xl">
              Techno Times · Admin
            </Link>
            <nav className="hidden md:flex gap-5 text-sm">
              <Link href="/admin" className="hover:underline">Overview</Link>
              <Link href="/admin/articles" className="hover:underline">Articles</Link>
              <Link href="/admin/authors" className="hover:underline">Authors</Link>
              <Link href="/admin/runs" className="hover:underline">Runs</Link>
              <Link href="/admin/links" className="hover:underline">Links</Link>
              <Link href="/admin/health" className="hover:underline">Health</Link>
            </nav>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="text-sm underline" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-content mx-auto px-4 py-8 font-sans">{children}</div>
    </div>
  );
}
