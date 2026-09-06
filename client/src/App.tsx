import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Switch, useLocation, useRoute } from "wouter";
import { Music2, LayoutDashboard, Library, Image, Video, ShieldCheck, Settings, Search, Menu, X, Play, Pause, ExternalLink, ArrowUpRight, Disc3, Download, FileText, Activity, Fingerprint, LogIn } from "lucide-react";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { getSessionProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const logo = "https://cdn.phototourl.com/free/2026-09-05-3d19c965-bf86-4386-b751-40a4658098bd.jpg";

function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [location]);
  return <div className={`page-transition ${visible ? "is-visible" : ""}`}>{children}</div>;
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const nav = [["Music", "/music"], ["Releases", "/releases"], ["Videos", "/videos"], ["Artwork", "/artwork"], ["About", "/about"]];
  return <header className="site-header">
    <Link href="/" className="brand"><img src={logo} alt="A.Tonic logo" /><span>A.Tonic</span></Link>
    <nav className={`public-nav ${open ? "is-open" : ""}`}>
      {nav.map(([label, href]) => <Link key={href} href={href} className={location === href ? "active" : ""} onClick={() => setOpen(false)}>{label}</Link>)}
      <Link href="/licensing" className="nav-license" onClick={() => setOpen(false)}>License music <ArrowUpRight size={14}/></Link>
    </nav>
    <div className="header-actions"><Link href="/search" aria-label="Search"><Search size={18}/></Link><Link href="/admin" className="admin-link">Studio <ArrowUpRight size={14}/></Link><button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button></div>
  </header>;
}

function PublicFooter() { return <footer className="site-footer"><div><div className="brand footer-brand"><img src={logo} alt=""/><span>A.Tonic</span></div><p>Independent artist. Real feeling. Official home.</p></div><div className="footer-links"><Link href="/copyright">Copyright</Link><Link href="/licensing">Licensing</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></div><div className="footer-meta">© 2026 A.Tonic · Akin S. Sokpah</div></footer> }

function PublicLayout({ children }: { children: React.ReactNode }) { return <div className="public-shell"><PublicHeader/><main>{children}</main><PublicFooter/></div> }

function AuthCallback() {
  const ensureProfile = trpc.auth.ensureProfile.useMutation();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let active = true;
    const finish = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const providerError = params.get("error_description") ?? hashParams.get("error_description") ?? params.get("error") ?? hashParams.get("error");
        if (providerError) throw new Error(providerError.replace(/\+/g, " "));
        if (code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged.error) throw exchanged.error;
        } else if (hashParams.get("access_token") && hashParams.get("refresh_token")) {
          const restored = await supabase.auth.setSession({
            access_token: hashParams.get("access_token")!,
            refresh_token: hashParams.get("refresh_token")!,
          });
          if (restored.error) throw restored.error;
        }
        let { data, error: sessionError } = await supabase.auth.getSession();
        for (let attempt = 0; !data.session && !sessionError && attempt < 3; attempt += 1) {
          await new Promise(resolve => window.setTimeout(resolve, 150 * (attempt + 1)));
          ({ data, error: sessionError } = await supabase.auth.getSession());
        }
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error("Supabase did not return an authenticated session.");
        const bootstrapped = await ensureProfile.mutateAsync({});
        const resolved = await getSessionProfile(data.session);
        if (!active) return;
        const next = params.get("next");
        const safeNext = next?.startsWith("/admin") ? next : "/admin";
        window.location.replace(resolved.isAdmin && bootstrapped.role === "admin" ? safeNext : "/admin?auth_error=not_admin");
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "Authentication callback failed";
          window.location.replace(`/admin?auth_error=${encodeURIComponent(message.slice(0, 160))}`);
        }
      }
    };
    void finish();
    return () => { active = false; };
  }, [ensureProfile]);
  return <div className="admin-auth-screen"><div className="admin-auth-card"><img src={logo} alt="A.Tonic"/><p>Finishing secure sign-in…</p></div></div>;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
 const [collapsed, setCollapsed] = useState(false);
 const [location] = useLocation();
 const { user, loading, isAuthenticated, isAdmin, logout, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
 const [authEmail, setAuthEmail] = useState("");
 const [authPassword, setAuthPassword] = useState("");
 const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
 const [authError, setAuthError] = useState(() => new URLSearchParams(window.location.search).get("auth_error") ?? "");
 const items = [["Overview", "/admin", LayoutDashboard], ["Music library", "/admin/music", Library], ["Upload studio", "/admin/upload", Download], ["Artwork", "/admin/artwork", Image], ["Videos", "/admin/videos", Video], ["Licenses", "/admin/licenses", ShieldCheck], ["Audio tracking", "/admin/tracking", Activity], ["Fingerprints", "/admin/fingerprints", Fingerprint], ["Settings", "/admin/settings", Settings]] as const;
 if (loading) return <div className="admin-auth-screen"><div className="admin-auth-card"><img src={logo} alt="A.Tonic"/><p>Loading studio…</p></div></div>;
 if (!isAuthenticated || !isAdmin) return <div className="admin-auth-screen"><div className="admin-auth-card"><img src={logo} alt="A.Tonic"/><span className="eyebrow">Private workspace</span><h1>A.Tonic Studio</h1>{isAuthenticated ? <><p>This account is authenticated but does not have the administrator role.</p><button className="button button-dark" onClick={() => logout()}><LogIn size={16}/> Sign out</button></> : <><p>Sign in with Google or use your Supabase email account.</p><button className="button button-dark" onClick={() => signInWithGoogle()}><LogIn size={16}/> Continue with Google</button><div className="auth-divider">or email and password</div><form className="auth-form" onSubmit={async event => { event.preventDefault(); setAuthError(""); try { if (authMode === "sign-in") await signInWithPassword(authEmail, authPassword); else await signUpWithPassword(authEmail, authPassword); } catch (error) { setAuthError(error instanceof Error ? error.message : "Authentication failed"); } }}><input type="email" required value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="Email address"/><input type="password" required minLength={6} value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder="Password"/><button className="button button-light" type="submit">{authMode === "sign-in" ? "Sign in" : "Create account"}</button></form><button className="auth-switch" onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")}>{authMode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>{authError && <small className="auth-config-warning">{authError}</small>}</>}<Link href="/" className="text-link">Back to website</Link></div></div>;
 return <div className={`admin-shell ${collapsed ? "collapsed" : ""}`}><aside className="admin-sidebar"><div className="admin-brand"><img src={logo} alt="A.Tonic"/><span>A.Tonic <small>STUDIO</small></span></div><button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "→" : "←"}</button><div className="admin-kicker">Management</div><nav>{items.map(([label, href, Icon]) => <Link key={href} href={href} className={location === href ? "active" : ""}><Icon size={17}/><span>{label}</span></Link>)}</nav><div className="sidebar-bottom"><Link href="/"><ExternalLink size={16}/><span>View website</span></Link><div className="admin-user"><div className="avatar">AS</div><div><strong>Akin S. Sokpah</strong><small>Administrator</small></div></div></div></aside><section className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">A.Tonic / Studio</span><h1>Good evening, Akin.</h1></div><div className="topbar-actions"><span className="status-dot">All systems nominal</span><Link href="/"><LogIn size={16}/> Exit studio</Link></div></header>{children}</section></div>
}

function AdminHome() { return <AdminLayout><div className="admin-content"><div className="admin-hero"><div><span className="eyebrow">Monday · September 2026</span><h2>Your music, in one place.</h2><p>Manage releases, artwork, licensing and the details behind the sound.</p></div><Link href="/admin/upload" className="button button-dark"><Download size={16}/> Upload asset</Link></div><div className="metric-grid"><div className="metric"><span>Published releases</span><strong>1</strong><small>“Tired” is live in your library</small></div><div className="metric"><span>Licenses issued</span><strong>—</strong><small>No data yet</small></div><div className="metric"><span>Downloads</span><strong>—</strong><small>No data yet</small></div><div className="metric"><span>Fingerprint matches</span><strong>—</strong><small>No data yet</small></div></div><div className="admin-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Library snapshot</span><h3>Latest release</h3></div><Link href="/admin/music">View library <ArrowUpRight size={15}/></Link></div><div className="release-row"><div className="cover cover-wave"><span>A.T.</span></div><div className="release-copy"><strong>Tired</strong><span>Single · Afrobeat · Original</span><small>Published · 2026</small></div><div className="release-status">Published</div></div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Recent activity</span><h3>Nothing to review</h3></div><Activity size={18}/></div><div className="empty-panel"><p>No downloads, licenses, claims or fingerprint matches yet.</p><span>When activity happens, it will appear here.</span></div></section></div></div></AdminLayout> }

function UploadStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Afrobeat");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const createUrl = trpc.studio.createUploadUrl.useMutation();
  const createRelease = trpc.studio.createRelease.useMutation();
  const submit = async () => {
    if (!file || !title.trim()) return setMessage("Choose an audio file and add a title first.");
    setStatus("uploading"); setMessage("Preparing a private upload…");
    try {
      const path = `releases/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const signed = await createUrl.mutateAsync({ bucket: "full_audio", path, upsert: false });
      const response = await fetch(signed.signedUrl, { method: "PUT", headers: { "content-type": file.type || "audio/mpeg" }, body: file });
      if (!response.ok) throw new Error("The audio upload was rejected by storage.");
      await createRelease.mutateAsync({ title: title.trim(), genre, audioMasterPath: path, status: "draft" });
      setStatus("success"); setMessage("Audio uploaded privately and saved as a draft release.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Upload failed. Please try again."); }
  };
  return <AdminLayout><div className="admin-content"><div className="admin-page-heading"><div><span className="eyebrow">A.Tonic / Studio</span><h2>Upload studio</h2></div><span className="muted">Private storage · signed URLs</span></div><div className="upload-layout"><section className="panel upload-panel"><label className="upload-drop"><input type="file" accept="audio/mpeg,audio/wav,audio/flac,audio/mp4" onChange={e => setFile(e.target.files?.[0] ?? null)}/><Download size={24}/><strong>{file ? file.name : "Drop an audio master here"}</strong><span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ready to upload` : "MP3, WAV, FLAC or M4A · stored privately"}</span></label>{status === "uploading" && <div className="upload-progress"><span className="wave-loader"><i/><i/><i/><i/></span>{message}</div>}{status === "success" && <div className="upload-success">✓ {message}</div>}{status === "error" && <div className="upload-error">{message}</div>}</section><section className="panel upload-form"><span className="eyebrow">Release metadata</span><h3>Save to library</h3><label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Tired"/></label><label>Genre<input value={genre} onChange={e => setGenre(e.target.value)} placeholder="Afrobeat"/></label><button className="button button-dark" onClick={submit} disabled={status === "uploading"}>{status === "uploading" ? "Uploading…" : "Upload & save draft"} <ArrowUpRight size={15}/></button></section></div></div></AdminLayout>;
}

function MusicLibrary() {
  const { data: releases, isLoading, error } = trpc.releases.adminList.useQuery();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("all");
  const [artist, setArtist] = useState("all");
  const genres = useMemo(() => Array.from(new Set((releases ?? []).map(release => release.genre).filter(Boolean))).sort(), [releases]);
  const artists = useMemo(() => Array.from(new Set((releases ?? []).map(release => release.artist).filter(Boolean))).sort(), [releases]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (releases ?? []).filter(release => {
      const matchesSearch = !query || [release.title, release.artist, release.genre, release.release_type].filter(Boolean).some(value => String(value).toLowerCase().includes(query));
      const matchesGenre = genre === "all" || release.genre === genre;
      const matchesArtist = artist === "all" || release.artist === artist;
      return matchesSearch && matchesGenre && matchesArtist;
    });
  }, [artist, genre, releases, search]);
  return <AdminLayout><div className="admin-content"><div className="admin-page-heading"><div><span className="eyebrow">A.Tonic / Studio</span><h2>Music library</h2></div><Link href="/admin/upload" className="button button-dark"><Download size={16}/> Add new</Link></div><section className="panel library-panel"><div className="library-toolbar"><label className="search-field"><Search size={16}/><input aria-label="Search music library" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title, artist or genre…"/></label><select aria-label="Filter by genre" value={genre} onChange={event => setGenre(event.target.value)}><option value="all">All genres</option>{genres.map(value => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Filter by artist" value={artist} onChange={event => setArtist(event.target.value)}><option value="all">All artists</option>{artists.map(value => <option key={value} value={value}>{value}</option>)}</select>{(search || genre !== "all" || artist !== "all") && <button className="button button-outline clear-filters" onClick={() => { setSearch(""); setGenre("all"); setArtist("all"); }}>Clear</button>}</div>{isLoading ? <div className="table-empty"><span className="wave-loader"><i/><i/><i/><i/></span><p>Loading library…</p></div> : error ? <div className="table-empty"><h3>Library unavailable</h3><p>{error.message}</p></div> : filtered.length === 0 ? <div className="table-empty"><div className="empty-icon"><FileText size={22}/></div><h3>No matching releases</h3><p>Try a different title, genre or artist.</p></div> : <div className="library-list">{filtered.map(release => <div className="library-row" key={release.id}><div className="library-cover">{release.title.slice(0, 2).toUpperCase()}</div><div className="library-copy"><strong>{release.title}</strong><span>{release.artist ?? "A.Tonic"} · {release.genre ?? "Uncategorized"}</span><small>{release.release_type ?? "Release"} · {release.status}</small></div><span className="library-date">{release.release_date ?? "No release date"}</span></div>)}</div>}</section></div></AdminLayout>;
}

function AdminTable({ title, eyebrow }: { title: string; eyebrow: string }) { return <AdminLayout><div className="admin-content"><div className="admin-page-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="button button-dark"><Download size={16}/> Add new</button></div><div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={16}/><input placeholder={`Search ${title.toLowerCase()}...`}/></div><span className="muted">No data beyond the seeded release</span></div><div className="table-empty"><div className="empty-icon"><FileText size={22}/></div><h3>No {title.toLowerCase()} yet</h3><p>New items will appear here once you add them through the studio.</p></div></div></div></AdminLayout> }

function LicenseVerification() { const [, params] = useRoute("/verify-license/:licenseId"); const query = trpc.licensing.verifyById.useQuery({ id: params?.licenseId ?? "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(params?.licenseId) }); return <PublicLayout><section className="inner-page container"><div className="eyebrow red-eyebrow">License verification</div><h1>{query.isLoading ? "Checking…" : query.data ? "Verified license" : "Not found"}</h1>{query.data ? <div className="verify-card"><div><span>License code</span><strong>{query.data.license_code}</strong></div><div><span>Licensed work</span><strong>{query.data.releases?.[0]?.title ?? "A.Tonic release"}</strong></div><div><span>Status</span><strong className="verify-active">{query.data.status}</strong></div><div><span>Validity</span><strong>{query.data.start_date} — {query.data.end_date ?? "Open ended"}</strong></div><div><span>Platform</span><strong>{query.data.platform ?? "Approved use"}</strong></div></div> : <p>This license could not be verified or is no longer available.</p>}<Link href="/" className="button button-dark">Back home <ArrowUpRight size={15}/></Link></section></PublicLayout> }

function AppRouter() { return <PageTransition><Switch><Route path="/"><PublicLayout><Home/></PublicLayout></Route><Route path="/auth/callback"><AuthCallback/></Route><Route path="/verify-license/:licenseId"><LicenseVerification/></Route><Route path="/admin"><AdminHome/></Route><Route path="/admin/upload"><UploadStudio/></Route><Route path="/admin/music"><MusicLibrary/></Route><Route path="/admin/:rest*"><AdminTable title="Music library" eyebrow="A.Tonic / Studio"/></Route><Route path="/music"><PublicLayout><Home section="music"/></PublicLayout></Route><Route path="/releases"><PublicLayout><Home section="releases"/></PublicLayout></Route><Route path="/videos"><PublicLayout><Home section="videos"/></PublicLayout></Route><Route path="/artwork"><PublicLayout><Home section="artwork"/></PublicLayout></Route><Route path="/about"><PublicLayout><Home section="about"/></PublicLayout></Route><Route path="/licensing"><PublicLayout><Home section="licensing"/></PublicLayout></Route><Route path="/search"><PublicLayout><Home section="search"/></PublicLayout></Route><Route path="/contact"><PublicLayout><Home section="contact"/></PublicLayout></Route><Route path="/copyright"><PublicLayout><Home section="copyright"/></PublicLayout></Route><Route component={NotFound}/></Switch></PageTransition> }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster/><AppRouter/></TooltipProvider></ThemeProvider></ErrorBoundary> }
export { logo };
