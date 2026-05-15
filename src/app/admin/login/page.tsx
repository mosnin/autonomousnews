import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, getExpectedToken } from "@/lib/admin-auth";

export const metadata = { robots: { index: false, follow: false } };

async function authenticate(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const expected = getExpectedToken();
  if (!expected) {
    redirect("/admin/login?error=unconfigured");
  }
  if (password !== expected) {
    redirect("/admin/login?error=invalid");
  }
  const c = await cookies();
  c.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <form
        action={authenticate}
        className="w-full max-w-sm bg-white border border-rule p-6 font-sans"
      >
        <h1 className="text-xl font-bold mb-4">Admin sign in</h1>
        {error === "invalid" ? (
          <p className="text-sm text-red-600 mb-3">Invalid password.</p>
        ) : null}
        {error === "unconfigured" ? (
          <p className="text-sm text-red-600 mb-3">
            ADMIN_PASSWORD env var not set.
          </p>
        ) : null}
        <label className="block text-sm mb-2" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full border border-rule px-3 py-2 mb-4"
        />
        <button
          type="submit"
          className="w-full bg-ink text-white py-2 hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
