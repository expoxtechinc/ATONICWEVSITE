import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("auth.me", () => {
  it("returns the Supabase-authenticated profile context", async () => {
    const user = { id: "supabase-user-id", email: "aki.sokpah.link@gmail.com", name: "Akin S. Sokpah", role: "admin" as const };
    const ctx: TrpcContext = { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    expect(await appRouter.createCaller(ctx).auth.me()).toEqual(user);
  });
});
