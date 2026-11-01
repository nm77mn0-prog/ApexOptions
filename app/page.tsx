"use client";

import { FormEvent, useEffect, useState } from "react";
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
type DemoPosition = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  stake: number;
  expiry: string;
  openedAt: string;
  referencePrice: number;
};

const DEMO_MARKETS = [
  { symbol: "EUR/USD", price: 1.08425, change: "+0.12%" },
  { symbol: "GBP/USD", price: 1.27184, change: "-0.08%" },
  { symbol: "BTC/USD", price: 67420.5, change: "+1.42%" },
  { symbol: "ETH/USD", price: 3528.75, change: "+0.64%" }
];

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [symbol, setSymbol] = useState(DEMO_MARKETS[0].symbol);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [stake, setStake] = useState("25");
  const [expiry, setExpiry] = useState("5 minutes");
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
    setPositions([]);
  }

  function openDemoPosition(e: FormEvent) {
    e.preventDefault();
    const amount = Number(stake);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      setMessage("Enter a demo stake between 0.01 and 10,000 USD.");
      return;
    }
    const market = DEMO_MARKETS.find((item) => item.symbol === symbol);
    if (!market) return;
    const position: DemoPosition = {
      id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol, side, stake: amount, expiry, openedAt: new Date().toLocaleString(),
      referencePrice: market.price
    };
    setPositions((current) => [position, ...current].slice(0, 10));
    setMessage("Demo position created in this browser session only. No funds were moved.");
  }

  const selectedMarket = DEMO_MARKETS.find((item) => item.symbol === symbol) || DEMO_MARKETS[0];

  return (
    <main className="shell">
      <header className="top">
        <div className="brand"><span className="mark">A</span><span>ApexOptions</span></div>
        <span className="pill">DEMO ENVIRONMENT</span>
      </header>

      <section className="hero">
        <p className="eyebrow">APEXOPTIONS V3 · CONNECTED FOUNDATION</p>
        <h1>Trade interface.<br /><em>Built for clarity.</em></h1>
        <p className="muted">A bilingual-ready demo platform connected to Supabase. Virtual funds only; real-money trading is disabled.</p>
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
          <section className="grid">
            <article className="panel balance">
              <span className="muted">Demo balance</span>
              <strong>{wallet ? `${Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${wallet.currency}` : "—"}</strong>
              <small>Virtual funds only · balance is read-only</small>
            </article>
            <article className="panel">
              <span className="muted">Account status</span>
              <strong className="green">Demo</strong>
              <small>{session.user.email}</small>
              <button className="secondary" onClick={signOut}>Sign out</button>
            </article>
          </section>

          <section className="panel trading">
            <div className="sectionHeading">
              <div><p className="eyebrow">PRACTICE TERMINAL</p><h2>Open a demo position</h2></div>
              <span className="simTag">SIMULATED</span>
            </div>
            <p className="muted tradingIntro">Prices below are sample reference values, not live market quotes.</p>
            <div className="marketStrip">
              {DEMO_MARKETS.map((market) => (
                <button type="button" className={symbol === market.symbol ? "market activeMarket" : "market"} key={market.symbol} onClick={() => setSymbol(market.symbol)}>
                  <b>{market.symbol}</b><strong>{market.price.toLocaleString(undefined, { maximumFractionDigits: 5 })}</strong>
                  <small className={market.change.startsWith("+") ? "positive" : "negative"}>{market.change}</small>
                </button>
              ))}
            </div>
            <form className="ticket" onSubmit={openDemoPosition}>
              <div className="field">
                <label htmlFor="market">Market</label>
                <select id="market" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                  {DEMO_MARKETS.map((market) => <option key={market.symbol} value={market.symbol}>{market.symbol}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="stake">Demo amount (USD)</label>
                <input id="stake" type="number" min="0.01" max="10000" step="0.01" value={stake} onChange={(e) => setStake(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="expiry">Practice duration</label>
                <select id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
                  <option>1 minute</option><option>5 minutes</option><option>15 minutes</option><option>30 minutes</option>
                </select>
              </div>
              <div className="directionButtons">
                <button type="button" className={side === "buy" ? "direction buy selected" : "direction buy"} onClick={() => setSide("buy")}>Buy / صعود</button>
                <button type="button" className={side === "sell" ? "direction sell selected" : "direction sell"} onClick={() => setSide("sell")}>Sell / هبوط</button>
              </div>
              <div className="ticketSummary">
                <span>Reference price <b>{selectedMarket.price.toLocaleString(undefined, { maximumFractionDigits: 5 })}</b></span>
                <span>Amount <b>${Number(stake || 0).toFixed(2)} virtual</b></span>
              </div>
              <button className="openPosition" type="submit">Open demo position</button>
            </form>
            <p className="safetyNote">Simulation only: positions are held in temporary page state, are not sent to Supabase, do not change your wallet, and do not execute or settle trades.</p>
          </section>

          <section className="panel history">
            <h2>Demo positions opened this session</h2>
            {positions.length ? <div className="positionList">{positions.map((position) => (
              <div className="position" key={position.id}>
                <div><b>{position.symbol}</b><small>{position.openedAt}</small></div>
                <span className={position.side === "buy" ? "positive" : "negative"}>{position.side.toUpperCase()}</span>
                <span>${position.stake.toFixed(2)}</span>
                <small>{position.expiry}</small>
                <small>Ref. {position.referencePrice}</small>
              </div>
            ))}</div> : <p className="muted">No demo positions opened in this session yet.</p>}
          </section>

          <section className="panel history">
            <h2>Recent saved demo activity</h2>
            {trades.length ? <div className="tradeList">{trades.map((trade) => (
              <div className="trade" key={trade.id}><b>{trade.symbol}</b><span>{trade.direction.toUpperCase()}</span><span>{Number(trade.stake).toFixed(2)}</span><small>{trade.status}</small></div>
            ))}</div> : <p className="muted">No saved demo trades yet.</p>}
          </section>
        </>
      )}

      {message && <p className="message" role="status">{message}</p>}
      <section className="panel notice">
        <b>Development status</b>
        <p>Authentication and read-only demo account views are connected. The practice ticket creates temporary on-screen demo positions only. Persistent trade creation, balance changes, live market feeds, deposits, withdrawals, and real-money execution remain disabled pending secure server-side validation, independent testing, and appropriate legal review.</p>
      </section>
      <footer>APEXOPTIONS · DEMO ONLY · NOT A BROKER OR EXCHANGE</footer>
    </main>
  );
}
