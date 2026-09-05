import { useEffect, useState } from "react";
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

function AdminLayout({ children }: { children: React.ReactNode }) {
 const [collapsed, setCollapsed] = useState(false);
 const [location] = useLocation();
 const { user, loading, isAuthenticated, logout, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
 const [authEmail, setAuthEmail] = useState("");
 const [authPassword, setAuthPassword] = useState("");
 const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
 const [authError, setAuthError] = useState("");
 const items = [["Overview", "/admin", LayoutDashboard], ["Music library", "/admin/music", Library], ["Upload studio", "/admin/upload", Download], ["Artwork", "/admin/artwork", Image], ["Videos", "/admin/videos", Video], ["Licenses", "/admin/licenses", ShieldCheck], ["Audio tracking", "/admin/tracking", Activity], ["Fingerprints", "/admin/fingerprints", Fingerprint], ["Settings", "/admin/settings", Settings]] as const;
 if (loading) return <div className="admin-auth-screen"><div className="admin-auth-card"><img src={logo} alt="A.Tonic"/><p>Loading studio…</p></div></div>;
 if (!isAuthenticated || user?.role !== "admin") return <div className="admin-auth-screen"><div className="admin-auth-card"><img src={logo} alt="A.Tonic"/><span className="eyebrow">Private workspace</span><h1>A.Tonic Studio</h1>{isAuthenticated ? <><p>This account is authenticated but does not have the administrator role.</p><button className="button button-dark" onClick={() => logout()}><LogIn size={16}/> Sign out</button></> : <><p>Sign in with Google or use your Supabase email account.</p><button className="button button-dark" onClick={() => signInWithGoogle()}><LogIn size={16}/> Continue with Google</button><div className="auth-divider">or email and password</div><form className="auth-form" onSubmit={async event => { event.preventDefault(); setAuthError(""); try { if (authMode === "sign-in") await signInWithPassword(authEmail, authPassword); else await signUpWithPassword(authEmail, authPassword); } catch (error) { setAuthError(error instanceof Error ? error.message : "Authentication failed"); } }}><input type="email" required value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="Email address"/><input type="password" required minLength={6} value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder="Password"/><button className="button button-light" type="submit">{authMode === "sign-in" ? "Sign in" : "Create account"}</button></form><button className="auth-switch" onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")}>{authMode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>{authError && <small className="auth-config-warning">{authError}</small>}</>}<Link href="/" className="text-link">Back to website</Link></div></div>;
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

function AdminTable({ title, eyebrow }: { title: string; eyebrow: string }) { return <AdminLayout><div className="admin-content"><div className="admin-page-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="button button-dark"><Download size={16}/> Add new</button></div><div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={16}/><input placeholder={`Search ${title.toLowerCase()}...`}/></div><span className="muted">No data beyond the seeded release</span></div><div className="table-empty"><div className="empty-icon"><FileText size={22}/></div><h3>No {title.toLowerCase()} yet</h3><p>New items will appear here once you add them through the studio.</p></div></div></div></AdminLayout> }

function LicenseVerification() { const [, params] = useRoute("/verify-license/:licenseId"); const query = trpc.licensing.verifyById.useQuery({ id: params?.licenseId ?? "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(params?.licenseId) }); return <PublicLayout><section className="inner-page container"><div className="eyebrow red-eyebrow">License verification</div><h1>{query.isLoading ? "Checking…" : query.data ? "Verified license" : "Not found"}</h1>{query.data ? <div className="verify-card"><div><span>License code</span><strong>{query.data.license_code}</strong></div><div><span>Licensed work</span><strong>{query.data.releases?.[0]?.title ?? "A.Tonic release"}</strong></div><div><span>Status</span><strong className="verify-active">{query.data.status}</strong></div><div><span>Validity</span><strong>{query.data.start_date} — {query.data.end_date ?? "Open ended"}</strong></div><div><span>Platform</span><strong>{query.data.platform ?? "Approved use"}</strong></div></div> : <p>This license could not be verified or is no longer available.</p>}<Link href="/" className="button button-dark">Back home <ArrowUpRight size={15}/></Link></section></PublicLayout> }

function AppRouter() { return <PageTransition><Switch><Route path="/"><PublicLayout><Home/></PublicLayout></Route><Route path="/verify-license/:licenseId"><LicenseVerification/></Route><Route path="/admin"><AdminHome/></Route><Route path="/admin/upload"><UploadStudio/></Route><Route path="/admin/:rest*"><AdminTable title="Music library" eyebrow="A.Tonic / Studio"/></Route><Route path="/music"><PublicLayout><Home section="music"/></PublicLayout></Route><Route path="/releases"><PublicLayout><Home section="releases"/></PublicLayout></Route><Route path="/videos"><PublicLayout><Home section="videos"/></PublicLayout></Route><Route path="/artwork"><PublicLayout><Home section="artwork"/></PublicLayout></Route><Route path="/about"><PublicLayout><Home section="about"/></PublicLayout></Route><Route path="/licensing"><PublicLayout><Home section="licensing"/></PublicLayout></Route><Route path="/search"><PublicLayout><Home section="search"/></PublicLayout></Route><Route path="/contact"><PublicLayout><Home section="contact"/></PublicLayout></Route><Route path="/copyright"><PublicLayout><Home section="copyright"/></PublicLayout></Route><Route component={NotFound}/></Switch></PageTransition> }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster/><AppRouter/></TooltipProvider></ThemeProvider></ErrorBoundary> }
export { logo };
