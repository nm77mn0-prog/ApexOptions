"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Wallet = { balance: number; currency: string };
type Trade = { id: string; symbol: string; direction: string; stake: number; status: string; created_at: string };
type Language = "en" | "ar";

const copy = {
  en: {
    demo: "DEMO ENVIRONMENT", eyebrow: "APEXOPTIONS V3 · DEVELOPMENT",
    titleA: "A clearer way", titleB: "to explore markets.",
    intro: "A bilingual demo trading interface. All balances and sample market values are virtual and for demonstration only.",
    create: "Create demo account", signIn: "Sign in", email: "Email address", password: "Password",
    passwordHint: "Use at least 6 characters.", wait: "Please wait…", createBtn: "Create account",
    signInBtn: "Sign in", already: "Already registered? Sign in", new: "New here? Create an account",
    balance: "Demo balance", virtual: "Virtual funds only", status: "Account status", demoAccount: "Demo account",
    signOut: "Sign out", markets: "Market watch", sample: "Illustrative sample values · Not live prices",
    pair: "Instrument", price: "Sample price", change: "Change", activity: "Recent demo activity",
    noTrades: "No demo trades yet.", development: "Development status",
    notice: "Account registration and read-only demo wallet are connected. Live market data, trade execution, deposits, withdrawals, and real-money services are not enabled.",
    footer: "APEXOPTIONS · DEMO ONLY · NOT A BROKER OR EXCHANGE",
    missing: "Supabase settings are missing. Check the environment configuration.",
    accountCreated: "Account created. Check your email to confirm, then sign in.",
    signedIn: "Signed in successfully.", signedOut: "Signed out.",
    up: "UP", down: "DOWN", language: "العربية"
  },
  ar: {
    demo: "بيئة تجريبية", eyebrow: "APEXOPTIONS V3 · نسخة تطويرية",
    titleA: "طريقة أوضح", titleB: "لاستكشاف الأسواق.",
    intro: "واجهة تداول تجريبية باللغتين العربية والإنجليزية. جميع الأرصدة وأسعار السوق المعروضة افتراضية ولأغراض العرض فقط.",
    create: "إنشاء حساب تجريبي", signIn: "تسجيل الدخول", email: "البريد الإلكتروني", password: "كلمة المرور",
    passwordHint: "استخدم 6 أحرف على الأقل.", wait: "يرجى الانتظار…", createBtn: "إنشاء الحساب",
    signInBtn: "تسجيل الدخول", already: "لديك حساب؟ سجّل الدخول", new: "مستخدم جديد؟ أنشئ حساباً",
    balance: "الرصيد التجريبي", virtual: "أموال افتراضية فقط", status: "حالة الحساب", demoAccount: "حساب تجريبي",
    signOut: "تسجيل الخروج", markets: "مراقبة الأسواق", sample: "قيم توضيحية فقط · ليست أسعاراً مباشرة",
    pair: "الأداة", price: "السعر الافتراضي", change: "التغيّر", activity: "آخر العمليات التجريبية",
    noTrades: "لا توجد عمليات تجريبية بعد.", development: "حالة التطوير",
    notice: "تم ربط التسجيل والمحفظة التجريبية للقراءة فقط. بيانات السوق المباشرة وتنفيذ الصفقات والإيداع والسحب والخدمات المالية الحقيقية غير مفعّلة.",
    footer: "APEXOPTIONS · نسخة تجريبية فقط · ليست وسيطاً أو بورصة",
    missing: "إعدادات Supabase غير موجودة. يرجى التحقق من إعدادات البيئة.",
    accountCreated: "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده ثم سجّل الدخول.",
    signedIn: "تم تسجيل الدخول بنجاح.", signedOut: "تم تسجيل الخروج.",
    up: "صعود", down: "هبوط", language: "English"
  }
} as const;

const sampleMarkets = [
  { symbol: "EUR/USD", price: "1.0842", change: "+0.18%", positive: true },
  { symbol: "GBP/USD", price: "1.2710", change: "-0.07%", positive: false },
  { symbol: "USD/JPY", price: "149.82", change: "+0.12%", positive: true },
  { symbol: "BTC/USD", price: "67,420", change: "+0.64%", positive: true }
];

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [language, setLanguage] = useState<Language>("ar");
  const t = copy[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

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
      const [w, tr] = await Promise.all([
        supabase!.from("demo_wallets").select("balance,currency").eq("user_id", session.user.id).maybeSingle(),
        supabase!.from("demo_trades").select("id,symbol,direction,stake,status,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(8)
      ]);
      if (!active) return;
      if (w.error) setMessage(w.error.message);
      else setWallet(w.data as Wallet | null);
      if (tr.error) setMessage(tr.error.message);
      else setTrades((tr.data || []) as Trade[]);
    })();
    return () => { active = false; };
  }, [session]);

  async function authenticate(e: FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage(t.missing); return; }
    setBusy(true);
    setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage(t.accountCreated);
    else setMessage(t.signedIn);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setMessage(error ? error.message : t.signedOut);
  }

  return (
    <main className="shell">
      <header className="top">
        <div className="brand"><span className="mark">A</span><span>ApexOptions</span></div>
        <div className="topActions">
          <button className="language" onClick={() => setLanguage(language === "ar" ? "en" : "ar")}>{t.language}</button>
          <span className="pill">{t.demo}</span>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.titleA}<br /><em>{t.titleB}</em></h1>
        <p className="muted">{t.intro}</p>
      </section>

      {!session ? (
        <section className="panel auth">
          <h2>{mode === "signup" ? t.create : t.signIn}</h2>
          <p className="muted">{t.passwordHint}</p>
          <form onSubmit={authenticate}>
            <label>{t.email}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <label>{t.password}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            <button disabled={busy}>{busy ? t.wait : mode === "signup" ? t.createBtn : t.signInBtn}</button>
          </form>
          <button className="linkbtn" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMessage(""); }}>
            {mode === "signup" ? t.already : t.new}
          </button>
        </section>
      ) : (
        <>
          <section className="grid">
            <article className="panel balance">
              <span className="muted">{t.balance}</span>
              <strong>{wallet ? `${Number(wallet.balance).toLocaleString(language === "ar" ? "ar" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${wallet.currency}` : "—"}</strong>
              <small>{t.virtual}</small>
            </article>
            <article className="panel account">
              <span className="muted">{t.status}</span>
              <strong className="green">{t.demoAccount}</strong>
              <small>{session.user.email}</small>
              <button className="secondary" onClick={signOut}>{t.signOut}</button>
            </article>
          </section>
          <section className="panel markets">
            <div className="sectionHead"><h2>{t.markets}</h2><span className="sampleNote">{t.sample}</span></div>
            <div className="marketTable">
              <div className="marketRow marketHeader"><span>{t.pair}</span><span>{t.price}</span><span>{t.change}</span></div>
              {sampleMarkets.map((market) => <div className="marketRow" key={market.symbol}>
                <b>{market.symbol}</b><span>{market.price}</span><strong className={market.positive ? "green" : "red"}>{market.change}</strong>
              </div>)}
            </div>
          </section>
          <section className="panel history">
            <h2>{t.activity}</h2>
            {trades.length ? <div className="tradeList">{trades.map((trade) => <div className="trade" key={trade.id}>
              <b>{trade.symbol}</b><span>{trade.direction === "up" ? t.up : t.down}</span><span>{Number(trade.stake).toFixed(2)}</span><small>{trade.status}</small>
            </div>)}</div> : <p className="muted">{t.noTrades}</p>}
          </section>
        </>
      )}

      {message && <p className="message" role="status">{message}</p>}
      <section className="panel notice"><b>{t.development}</b><p>{t.notice}</p></section>
      <footer>{t.footer}</footer>
    </main>
  );
}
