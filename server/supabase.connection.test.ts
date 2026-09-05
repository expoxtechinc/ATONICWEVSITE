import { describe, expect, it } from "vitest";

describe("Supabase connection", () => {
  it("can read the public artist profile endpoint with the configured anon key", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be configured");
    const response = await fetch(`${url}/rest/v1/artist_profile?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  }, 15000);
});
