import { describe, expect, it } from "vitest";

describe("Supabase Auth configuration", () => {
  it("exposes email authentication and reports the Google provider state", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be configured");
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    expect(response.ok).toBe(true);
    const settings = await response.json() as { external?: { email?: boolean; google?: boolean } };
    expect(settings.external?.email).toBe(true);
    expect(typeof settings.external?.google).toBe("boolean");
  }, 15000);
});
