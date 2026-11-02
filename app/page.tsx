"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Wallet = { balance: number; currency: string };
type Trade = {
  id: string;
  symbol: string;
  direction: string;
  stake: number;
  status: string;
  created_at: string;
};
type Pair = { symbol: string; name: string; price: string; change: string; payout: number };

const pairs: Pair[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", price: "1.08426", change: "+0.18%", payout: 88 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", price: "1.27184", change: "+0.12%", payout: 86 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", price: "149.382", change: "-0.08%", payout: 84 },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", price: "0.65418", change: "+0.05%", payout: 82 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", price: "0.88241", change: "-0.03%", payout: 80 },
  { symbol: "GOLD", name: "Gold / US Dollar", price: "2,342.60", change: "+0.31%", payout: 80 }
];

const chartPoints = "0,112 28,105 56,116 84,91 112,98 140,76 168,83 196,62 224,70 252,47 280,56 308,36 336,43 364,22 392,31 420,12";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [selected, setSelected] = useState("EUR/USD");
  const [stake, setStake] = useState("10");
  const [duration, setDuration] = useState("60 seconds");
  const [preview, setPreview] = useState<{ direction: "UP" | "DOWN"; symbol: string; stake: number; payout: number } | null>(null);

  const pair = pairs.find((item) => item.symbol === selected) || pairs[0];
  const potentialReturn = useMemo(() => {
    const amount = Number(stake);
    return Number.isFinite(amount) && amount > 0 ? amount * (1 + pair.payout / 100) : 0;
  }, [stake, pair.payout]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setWallet(null);
      setTrades([]);
      return;
    }
    let active = true;
    (async () => {
      const [w, t] = await Promise.all([
        supabase!.from("demo_wallets").select("balance,currency").eq("user_id", session.user.id).maybeSingle(),
        supabase!.from("demo_trades").select("id,symbol,direction,stake,status,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(8)
      ]);
      if (!active) return;
      if (w.error) setMessage(`Wallet: ${w.error.message}`);
      else setWallet(w.data as Wallet | null);
      if (t.error) setMessage(`Trades: ${t.error.message}`);
      else setTrades((t.data || []) as Trade[]);
    })();
    return () => { active = false; };
  }, [session]);

  async function authenticate(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMessage("Supabase settings are missing. Check the environment configuration.");
      return;
    }
    setBusy(true);
    setMessage("");
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

  function showPreview(direction: "UP" | "DOWN") {
    const amount = Number(stake);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid demo amount greater than zero.");
      setPreview(null);
      return;
    }
    if (wallet && amount > Number(wallet.balance)) {
      setMessage("The amount is higher than the available demo balance.");
      setPreview(null);
      return;
    }
    setMessage("Preview only: no order was submitted and no balance was changed.");
    setPreview({ direction, symbol: pair.symbol, stake: amount, payout: amount * (1 + pair.payout / 100) });
  }

  return (
    <main className="shell">
      <header className="top">
        <div className="brand"><span className="mark">A</span><span>ApexOptions</span></div>
        <div className="topRight"><span className="pill">DEMO ENVIRONMENT</span>{session && <button className="signout" onClick={signOut}>Sign out</button>}</div>
      </header>

      <section className="hero compactHero">
        <p className="eyebrow">APEXOPTIONS V3 · DEMO TRADING DESK</p>
        <h1>Trade with <em>clarity.</em></h1>
        <p className="muted">A practice interface using virtual funds. Displayed market values are illustrative samples, not live quotes.</p>
      </section>

      {!session ? (
        <section className="panel auth">
          <h2>{mode === "signup" ? "Create demo account" : "Sign in"}</h2>
          <p className="muted">Use an email address and a password of at least 6 characters.</p>
          <form onSubmit={authenticate}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            <button disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
          </form>
          <button className="linkbtn" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMessage(""); }}>
            {mode === "signup" ? "Already registered? Sign in" : "New here? Create an account"}
          </button>
        </section>
      ) : (
        <>
          <section className="accountStrip">
            <article className="panel balance"><span className="muted">Demo balance</span><strong>{wallet ? `${Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${wallet.currency}` : "—"}</strong><small>Virtual funds only</small></article>
            <article className="panel accountInfo"><span className="muted">Account</span><b>{session.user.email}</b><small className="green">Demo account active</small></article>
          </section>

          <section className="tradingLayout">
            <div className="marketColumn">
              <div className="panel marketPanel">
                <div className="sectionHeading"><div><span className="eyebrow">MARKETS</span><h2>Currency pairs</h2></div><span className="sampleTag">SAMPLE DATA</span></div>
                <div className="pairList">
                  {pairs.map((item) => (
                    <button key={item.symbol} className={selected === item.symbol ? "pair selectedPair" : "pair"} onClick={() => { setSelected(item.symbol); setPreview(null); }}>
                      <span className="pairName"><b>{item.symbol}</b><small>{item.name}</small></span>
                      <span className="pairQuote"><b>{item.price}</b><small className={item.change.startsWith("+") ? "green" : "red"}>{item.change}</small></span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel chartPanel">
                <div className="chartTop"><div><span className="muted">Selected market</span><h2>{pair.symbol}</h2></div><div className="chartPrice"><b>{pair.price}</b><small className={pair.change.startsWith("+") ? "green" : "red"}>{pair.change}</small></div></div>
                <div className="chartWrap">
                  <svg viewBox="0 0 420 140" role="img" aria-label="Illustrative sample price chart">
                    <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22c99a" stopOpacity=".28"/><stop offset="100%" stopColor="#22c99a" stopOpacity="0"/></linearGradient></defs>
                    <path d={`M ${chartPoints.replaceAll(" ", " L ")} L 420 140 L 0 140 Z`} fill="url(#chartFill)" />
                    <polyline points={chartPoints} fill="none" stroke="#29d6a5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="chartFoot"><span>Illustrative chart</span><span>Live feed not connected</span></div>
              </div>
            </div>

            <aside className="panel orderPanel">
              <span className="eyebrow">DEMO ORDER</span><h2>Place a practice trade</h2>
              <label>Investment amount (USD)</label>
              <input className="tradeInput" type="number" min="1" step="1" value={stake} onChange={(e) => { setStake(e.target.value); setPreview(null); }} />
              <div className="quickAmounts">{["10", "25", "50", "100"].map((v) => <button key={v} className={stake === v ? "quick activeQuick" : "quick"} onClick={() => { setStake(v); setPreview(null); }}>${v}</button>)}</div>
              <label>Trade duration</label>
              <select className="tradeInput" value={duration} onChange={(e) => setDuration(e.target.value)}><option>30 seconds</option><option>60 seconds</option><option>2 minutes</option><option>5 minutes</option></select>
              <div className="payoutBox"><span>Illustrative return rate</span><b>{pair.payout}%</b><small>Potential total return: ${potentialReturn.toFixed(2)}</small></div>
              <div className="directionButtons"><button className="upButton" onClick={() => showPreview("UP")}>↑ <span>UP</span></button><button className="downButton" onClick={() => showPreview("DOWN")}>↓ <span>DOWN</span></button></div>
              <p className="orderHint">Buttons create a local preview only. They do not execute or save a trade.</p>
              {preview && <div className="previewBox"><b>Practice preview</b><span>{preview.symbol} · {preview.direction} · {duration}</span><span>Amount: ${preview.stake.toFixed(2)}</span><span>Potential total return: ${preview.payout.toFixed(2)}</span></div>}
            </aside>
          </section>

          <section className="panel history">
            <div className="sectionHeading"><h2>Recent demo activity</h2><span className="muted">Saved account history</span></div>
            {trades.length ? <div className="tradeList">{trades.map((trade) => <div className="trade" key={trade.id}><b>{trade.symbol}</b><span>{trade.direction.toUpperCase()}</span><span>{Number(trade.stake).toFixed(2)}</span><small>{trade.status}</small></div>)}</div> : <p className="muted">No saved demo trades yet.</p>}
          </section>
        </>
      )}

      {message && <p className="message" role="status">{message}</p>}
      <section className="panel notice"><b>Demo and compliance notice</b><p>This version is for interface testing only. Quotes and returns shown here are illustrative. Trade previews are not executed or stored, and balances cannot be changed from this screen. Live market feeds, trade execution, deposits, withdrawals, and real-money services remain disabled pending secure backend implementation and appropriate legal review.</p></section>
      <footer>APEXOPTIONS · DEMO ONLY · NOT A BROKER OR EXCHANGE</footer>
    </main>
  );
}
