import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const contextFor = (email: string, role: "admin" | "user"): TrpcContext => ({
  user: { id: 1, openId: "test-user", email, name: "Test", loginMethod: "google", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("admin access", () => {
  it("rejects an admin-role user whose email is not the allowlisted admin", async () => {
    const caller = appRouter.createCaller(contextFor("someone@example.com", "admin"));
    await expect(caller.studio.createUploadUrl({ bucket: "full_audio", path: "test.mp3", upsert: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller({ ...contextFor("", "user"), user: null });
    await expect(caller.studio.createUploadUrl({ bucket: "full_audio", path: "test.mp3", upsert: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
