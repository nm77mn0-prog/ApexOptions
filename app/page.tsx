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
  { symbol: "EUR/USD" },
  { symbol: "GBP/USD" },
  { symbol: "USD/JPY" },
  { symbol: "AUD/USD" },
  { symbol: "USD/CHF" },
  { symbol: "USD/CAD" }
];

function CandlestickChart({ symbol }: { symbol: string }) {
  const [timeframe, setTimeframe] = useState("1min");
  const [candles, setCandles] = useState<Array<{ datetime: string; open: number; high: number; low: number; close: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/forex?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || data.status !== "ok" || !Array.isArray(data.values)) {
          throw new Error(data.message || data.code || "تعذر جلب بيانات الفوركس");
        }
        const next = data.values.map((item: any) => ({
          datetime: String(item.datetime || ""),
          open: Number(item.open), high: Number(item.high),
          low: Number(item.low), close: Number(item.close)
        })).filter((item: any) => [item.open, item.high, item.low, item.close].every(Number.isFinite)).reverse();
        if (!next.length) throw new Error("لم تصل شموع لهذا الزوج حالياً");
        if (active) {
          setCandles(next);
          setFeedError("");
          setUpdatedAt(new Date().toLocaleTimeString());
          setLoading(false);
        }
      } catch (error) {
        if (active) {
          setFeedError(error instanceof Error ? error.message : "خطأ في الاتصال بمصدر الأسعار");
          setLoading(false);
        }
      }
    };
    setLoading(true);
    load();
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [symbol, timeframe]);

  const latest = candles[candles.length - 1];
  const first = candles[0];
  const change = first && latest ? ((latest.close - first.open) / first.open) * 100 : 0;
  const decimals = symbol === "USD/JPY" ? 3 : 5;
  const min = candles.length ? Math.min(...candles.map((c) => c.low)) : 0;
  const max = candles.length ? Math.max(...candles.map((c) => c.high)) : 1;
  const range = Math.max(max - min, Math.abs(max) * 0.0001, 0.00001);
  const y = (value: number) => 270 - ((value - min) / range) * 225;
  const x = (index: number) => 22 + index * (805 / Math.max(candles.length - 1, 1));

  return (
    <section className="panel liveChart">
      <div className="chartTop">
        <div><span className="chartSymbol">{symbol}</span><span className="chartSub"> · FOREX</span>
          <div className="chartPrice">{latest ? latest.close.toFixed(decimals) : "—"} {latest && <small className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "+" : ""}{change.toFixed(3)}%</small>}</div>
        </div>
        <span className="chartBadge">● TWELVE DATA</span>
      </div>
      <div className="timeframes">
        {[{ label: "1m", value: "1min" }, { label: "5m", value: "5min" }, { label: "15m", value: "15min" }, { label: "1h", value: "1h" }].map((t) =>
          <button type="button" key={t.value} onClick={() => setTimeframe(t.value)} className={timeframe === t.value ? "timeActive" : ""}>{t.label}</button>
        )}
        <span className="chartTools">{loading ? "جارٍ التحميل…" : updatedAt ? `آخر تحديث ${updatedAt}` : ""}</span>
      </div>
      <div className="candleCanvas">
        {candles.length > 0 ? <svg viewBox="0 0 900 320" role="img" aria-label={`Real forex candlestick chart for ${symbol}`} preserveAspectRatio="none">
          {[45, 100, 155, 210, 265].map((v) => <line key={v} x1="0" x2="900" y1={v} y2={v} stroke="#203449" strokeDasharray="4 5" />)}
          {candles.map((c, i) => {
            const up = c.close >= c.open;
            const color = up ? "#16c79a" : "#ef6477";
            const top = y(Math.max(c.open, c.close));
            const bottom = y(Math.min(c.open, c.close));
            return <g key={c.datetime + i}>
              <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.5" />
              <rect x={x(i) - Math.max(3, 300 / candles.length / 2)} y={top} width={Math.max(4, 600 / candles.length)} height={Math.max(2, bottom - top)} fill={color} rx="1" />
            </g>;
          })}
          {latest && <><line x1="0" x2="900" y1={y(latest.close)} y2={y(latest.close)} stroke="#25c99c" strokeDasharray="5 4" /></>}
        </svg> : <div className="chartMessage">{loading ? "جارٍ الاتصال بمصدر أسعار الفوركس…" : "لا توجد بيانات معروضة حالياً"}</div>}
      </div>
      <div className="chartFoot"><span>{candles[0]?.datetime || "—"}</span><span>{latest?.datetime || "—"}</span><span>{timeframe === "1min" ? "1 دقيقة" : timeframe === "5min" ? "5 دقائق" : timeframe === "15min" ? "15 دقيقة" : "ساعة"}</span></div>
      {feedError && <p className="chartError">{feedError}</p>}
      <p className="chartDisclaimer">بيانات أسعار فوركس من Twelve Data، تتحدث كل 60 ثانية. قد تختلف عن أسعار وسيط التداول، وتخضع لحدود وترخيص مزود البيانات.</p>
    </section>
  );
}

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
      referencePrice: 0
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

      <CandlestickChart symbol={symbol} />

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
            <p className="muted tradingIntro">Reference market selection only. Demo positions do not execute or settle.</p>
            <div className="marketStrip">
              {DEMO_MARKETS.map((market) => (
                <button type="button" className={symbol === market.symbol ? "market activeMarket" : "market"} key={market.symbol} onClick={() => setSymbol(market.symbol)}>
                  <b>{market.symbol}</b><strong>Forex</strong>
                  <small className="positive">FX</small>
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
                <span>Market <b>{selectedMarket.symbol}</b></span>
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
                <small>Demo only</small>
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
        <p>Authentication and read-only demo account views are connected. The practice ticket creates temporary on-screen demo positions only. Persistent trade creation, balance changes, deposits, withdrawals, and real-money execution remain disabled pending secure server-side validation, independent testing, and appropriate legal review.</p>
      </section>
      <footer>APEXOPTIONS · DEMO ONLY · NOT A BROKER OR EXCHANGE</footer>
    </main>
  );
}
