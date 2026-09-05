import { createHash } from "node:crypto";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getSupabaseAdmin } from "./supabase";

const releaseId = z.string().uuid();
const bucketName = z.enum(["covers", "previews", "full_audio", "videos", "artwork", "documents", "licenses", "artist_profile"]);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
  }),
  releases: router({
    published: publicProcedure.query(async () => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("releases").select("id,title,artist,version,subtitle,genre,mood,language,explicit,release_type,release_date,description,artwork_path,audio_preview_path,status,songwriter,composer,producer,distributor,p_line,c_line,isrc,iswc,upc,catalog_number,recording_id,work_id,created_at,updated_at").eq("status", "published").order("release_date", { ascending: false, nullsFirst: false }).limit(50);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    byId: publicProcedure.input(z.object({ id: releaseId })).query(async ({ input }) => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("releases").select("*").eq("id", input.id).eq("status", "published").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }),
  }),
  profile: router({
    public: publicProcedure.query(async () => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("artist_profile").select("id,artist_name,legal_name,biography,email,location,profile_image_path,updated_at").limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }),
  }),
  licensing: router({
    verifyById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("licenses").select("license_code,license_type,purpose,platform,permissions,restrictions,start_date,end_date,download_rights,commercial_rights,status,releases(title,artist)").eq("id", input.id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }),
    verify: publicProcedure.input(z.object({ licenseCode: z.string().min(4).max(40) })).query(async ({ input }) => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("licenses").select("license_code,license_type,purpose,platform,permissions,restrictions,start_date,end_date,download_rights,commercial_rights,status,releases(title,artist)").eq("license_code", input.licenseCode).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }),
    create: publicProcedure.input(z.object({ releaseId, licenseType: z.string().min(2), purpose: z.string().min(2), platform: z.string().optional(), permissions: z.array(z.string()).default([]), restrictions: z.array(z.string()).default([]), endDate: z.string().optional(), downloadRights: z.boolean().default(false), commercialRights: z.boolean().default(false), licenseeEmail: z.string().email() })).mutation(async ({ input }) => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("licenses").insert({ release_id: input.releaseId, license_type: input.licenseType, purpose: input.purpose, licensee_email: input.licenseeEmail, platform: input.platform ?? null, permissions: input.permissions, restrictions: input.restrictions, end_date: input.endDate ?? null, download_rights: false, commercial_rights: false, status: "pending" }).select("*").single();
      if (error) throw new Error(error.message);
      return data;
    }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("licenses").select("*,releases(title,artist)").eq("licensee_email", ctx.user.email ?? "").order("created_at", { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
  }),
  downloads: router({
    issue: protectedProcedure.input(z.object({ releaseId, licenseId: z.string().uuid().optional(), bucket: bucketName.default("full_audio"), path: z.string().min(1), fileVersion: z.string().default("original") })).mutation(async ({ input, ctx }) => {
      const supabase = getSupabaseAdmin();
      const { data: license } = input.licenseId ? await supabase.from("licenses").select("id,download_rights,status").eq("id", input.licenseId).eq("licensee_email", ctx.user.email ?? "").maybeSingle() : { data: null };
      if (input.licenseId && (!license || license.status !== "active" || !license.download_rights)) throw new Error("This license does not allow downloads.");
      const { data: signed, error: signedError } = await supabase.storage.from(input.bucket).createSignedUrl(input.path, 300);
      if (signedError) throw new Error(signedError.message);
      const { data: inserted, error } = await supabase.from("downloads").insert({ release_id: input.releaseId, license_id: input.licenseId ?? null, user_id: ctx.user.id, ip_hash: sha256(String(ctx.req.ip ?? ctx.req.headers["x-forwarded-for"] ?? "unknown")), user_agent: String(ctx.req.headers["user-agent"] ?? "unknown"), file_version: input.fileVersion, status: "issued" }).select("id,created_at,status").single();
      if (error) throw new Error(error.message);
      return { download: inserted, url: signed.signedUrl, expiresIn: 300 };
    }),
  }),
  tracking: router({
    play: publicProcedure.input(z.object({ releaseId, sessionId: z.string().min(8).max(128) })).mutation(async ({ input }) => {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("play_events").insert({ release_id: input.releaseId, session_hash: sha256(input.sessionId) });
      if (error) throw new Error(error.message);
      return { success: true } as const;
    }),
  }),
  studio: router({
    createRelease: adminProcedure.input(z.object({ title: z.string().min(1), subtitle: z.string().optional(), genre: z.string().optional(), releaseType: z.string().default("Single"), audioMasterPath: z.string().optional(), status: z.enum(["draft", "review", "published"]).default("draft") })).mutation(async ({ input }) => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("releases").insert({ title: input.title, subtitle: input.subtitle ?? null, genre: input.genre ?? null, release_type: input.releaseType, audio_master_path: input.audioMasterPath ?? null, status: input.status, artist: "A.Tonic" }).select("*").single();
      if (error) throw new Error(error.message);
      return data;
    }),
    createUploadUrl: adminProcedure.input(z.object({ bucket: bucketName, path: z.string().min(1), upsert: z.boolean().default(false) })).mutation(async ({ input }) => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage.from(input.bucket).createSignedUploadUrl(input.path, { upsert: input.upsert });
      if (error) throw new Error(error.message);
      return data;
    }),
    createDownloadUrl: adminProcedure.input(z.object({ bucket: bucketName, path: z.string().min(1), expiresIn: z.number().int().min(60).max(3600).default(300) })).mutation(async ({ input }) => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage.from(input.bucket).createSignedUrl(input.path, input.expiresIn);
      if (error) throw new Error(error.message);
      return data;
    }),
  }),
});

export type AppRouter = typeof appRouter;
