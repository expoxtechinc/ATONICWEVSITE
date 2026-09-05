import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const contextFor = (email: string, role: "admin" | "user"): TrpcContext => ({
  user: { id: "supabase-user-id", email, name: "Test", role },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("admin access", () => {
  it("rejects an authenticated Supabase user without the admin role", async () => {
    const caller = appRouter.createCaller(contextFor("someone@example.com", "user"));
    await expect(caller.studio.createUploadUrl({ bucket: "full_audio", path: "test.mp3", upsert: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller({ ...contextFor("", "user"), user: null });
    await expect(caller.studio.createUploadUrl({ bucket: "full_audio", path: "test.mp3", upsert: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
