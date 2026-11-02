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
  { symbol: "EUR/USD", name: "Euro / US Dollar", price: "عرض السعر الحي", change: "اختر الزوج", payout: 88 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", price: "عرض السعر الحي", change: "اختر الزوج", payout: 86 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", price: "عرض السعر الحي", change: "اختر الزوج", payout: 84 },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", price: "عرض السعر الحي", change: "اختر الزوج", payout: 82 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", price: "عرض السعر الحي", change: "اختر الزوج", payout: 80 },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", price: "عرض السعر الحي", change: "اختر الزوج", payout: 80 }
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
    const timer = window.setInterval(load, 120000);
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
        <p className="muted">A practice interface using virtual funds. Live market candles are supplied by Twelve Data when the provider API key is configured.</p>
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
                <div className="sectionHeading"><div><span className="eyebrow">MARKETS</span><h2>Currency pairs</h2></div><span className="sampleTag">LIVE MARKET DATA</span></div>
                <div className="pairList">
                  {pairs.map((item) => (
                    <button key={item.symbol} className={selected === item.symbol ? "pair selectedPair" : "pair"} onClick={() => { setSelected(item.symbol); setPreview(null); }}>
                      <span className="pairName"><b>{item.symbol}</b><small>{item.name}</small></span>
                      <span className="pairQuote"><b>عرض السعر الحي</b><small>اختر الزوج</small></span>
                    </button>
                  ))}
                </div>
              </div>

              <CandlestickChart symbol={pair.symbol} />
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
      <section className="panel notice"><b>Demo and compliance notice</b><p>This version is for interface testing only. Market data is supplied by Twelve Data and may be delayed or limited by the provider. Demo returns remain illustrative. Trade previews are not executed or stored, and balances cannot be changed from this screen. Live market feeds, trade execution, deposits, withdrawals, and real-money services remain disabled pending secure backend implementation and appropriate legal review.</p></section>
      <footer>APEXOPTIONS · DEMO ONLY · NOT A BROKER OR EXCHANGE</footer>
    </main>
  );
}
