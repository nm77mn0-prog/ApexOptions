const ALLOWED_SYMBOLS = new Set(["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD"]);
const ALLOWED_INTERVALS = new Set(["1min", "5min", "15min", "1h"]);

export async function onRequestGet({ request, env }) {
  const apiKey = env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return Response.json({ status: "error", message: "مفتاح مزود بيانات الفوركس غير مضبوط في بيئة Preview." }, { status: 503 });
  }

  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") || "EUR/USD";
  const interval = url.searchParams.get("interval") || "1min";

  if (!ALLOWED_SYMBOLS.has(symbol) || !ALLOWED_INTERVALS.has(interval)) {
    return Response.json({ status: "error", message: "زوج العملة أو الإطار الزمني غير مدعوم." }, { status: 400 });
  }

  const upstream = new URL("https://api.twelvedata.com/time_series");
  upstream.searchParams.set("symbol", symbol);
  upstream.searchParams.set("interval", interval);
  upstream.searchParams.set("outputsize", "48");
  upstream.searchParams.set("timezone", "UTC");

  try {
    const response = await fetch(upstream.toString(), {
      headers: { Authorization: `apikey ${apiKey}` }
    });
    const data = await response.json();
    if (!response.ok || data.status === "error") {
      return Response.json({
        status: "error",
        message: data.message || "رفض مزود البيانات الطلب. تحقق من صلاحية الخطة وحدود API."
      }, { status: response.status >= 400 ? response.status : 502 });
    }
    return Response.json(data, {
      headers: { "Cache-Control": "private, max-age=30", "X-Content-Type-Options": "nosniff" }
    });
  } catch {
    return Response.json({ status: "error", message: "تعذر الاتصال بمزود بيانات الفوركس." }, { status: 502 });
  }
}
