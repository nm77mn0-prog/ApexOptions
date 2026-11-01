"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Wallet = { balance: number; currency: string };
type Trade = { id: string; symbol: string; direction: string; stake: number; status: string; created_at: string };

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) { setWallet(null); setTrades([]); return; }
    let active = true;
    (async () => {
      const [w, t] = await Promise.all([
        supabase!.from("demo_wallets").select("balance,currency").eq("user_id", session.user.id).maybeSingle(),
        supabase!.from("demo_trades").select("id,symbol,direction,stake,status,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(8)
      ]);
      if (!active) return;
      if (w.error) setMessage(`Wallet: ${w.error.message}`); else setWallet(w.data as Wallet | null);
      if (t.error) setMessage(`Trades: ${t.error.message}`); else setTrades((t.data || []) as Trade[]);
    })();
    return () => { active = false; };
  }, [session]);

  async function authenticate(e: FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage("Supabase settings are missing. Check the environment configuration."); return; }
    setBusy(true); setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm, then sign in.");
    else setMessage("Signed in successfully.");
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setMessage(error ? error.message : "Signed out.");
  }

  return (
    <main className="shell">
      <header className="top">
        <div className="brand"><span className="mark">A</span><span>ApexOptions</span></div>
        <span className="pill">DEMO ENVIRONMENT</span>
      </header>
      <section className="hero">
        <p className="eyebrow">APEXOPTIONS V3 · CONNECTED FOUNDATION</p>
        <h1>Trade interface.<br/><em>Built for clarity.</em></h1>
        <p className="muted">A bilingual-ready demo platform connected to Supabase. Virtual funds only; real-money trading is disabled.</p>
      </section>

      {!session ? <section className="panel auth">
        <h2>{mode === "signup" ? "Create demo account" : "Sign in"}</h2>
        <p className="muted">Use an email address and a password of at least 6 characters.</p>
        <form onSubmit={authenticate}>
          <label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          <button disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
        <button className="linkbtn" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMessage(""); }}>{mode === "signup" ? "Already registered? Sign in" : "New here? Create an account"}</button>
      </section> : <>
        <section className="grid">
          <article className="panel balance"><span className="muted">Demo balance</span><strong>{wallet ? `${Number(wallet.balance).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${wallet.currency}` : "—"}</strong><small>Virtual funds only</small></article>
          <article className="panel"><span className="muted">Account status</span><strong className="green">Demo</strong><small>{session.user.email}</small><button className="secondary" onClick={signOut}>Sign out</button></article>
        </section>
        <section className="panel history"><h2>Recent demo activity</h2>{trades.length ? <div className="tradeList">{trades.map(trade => <div className="trade" key={trade.id}><b>{trade.symbol}</b><span>{trade.direction.toUpperCase()}</span><span>{Number(trade.stake).toFixed(2)}</span><small>{trade.status}</small></div>)}</div> : <p className="muted">No demo trades yet.</p>}</section>
      </>}
      {message && <p className="message" role="status">{message}</p>}
      <section className="panel notice"><b>Development status</b><p>Authentication and read-only demo account views are connected. Trade creation, balance changes, live market feeds, deposits, withdrawals, and real-money execution remain disabled until secure server-side validation and appropriate legal review are completed.</p></section>
      <footer>APEXOPTIONS · DEMO ONLY · NOT A BROKER OR EXCHANGE</footer>
    </main>
  );
}
