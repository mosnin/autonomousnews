import { cookies } from "next/headers";

export const ADMIN_COOKIE = "tt_admin";

function expectedToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return password;
}

export async function isAdminAuthed(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === expected;
}

export function getExpectedToken(): string | null {
  return expectedToken();
}

export function adminApiAuthorized(req: Request): boolean {
  // Allow either the admin cookie (browser) or a bearer ADMIN_API_KEY
  // (used by the agent worker pushing logs).
  const apiKey = process.env.ADMIN_API_KEY;
  if (apiKey) {
    const header = req.headers.get("authorization");
    if (header === `Bearer ${apiKey}`) return true;
  }
  return false;
}
