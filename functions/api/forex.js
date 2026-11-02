const SYMBOLS = new Map([
  ["EUR/USD", "EUR/USD"],
  ["GBP/USD", "GBP/USD"],
  ["USD/JPY", "USD/JPY"],
  ["AUD/USD", "AUD/USD"],
  ["USD/CHF", "USD/CHF"],
  ["USD/CAD", "USD/CAD"],
  ["GOLD", "XAU/USD"],
]);
const ALLOWED_INTERVALS = new Set(["1min", "5min", "15min", "1h"]);

export async function onRequestGet({ request, env }) {
  const apiKey = env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return Response.json(
      { status: "error", message: "مفتاح Twelve Data غير مضبوط في Cloudflare Pages." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const requestedSymbol = url.searchParams.get("symbol") || "EUR/USD";
  const symbol = SYMBOLS.get(requestedSymbol);
  const interval = url.searchParams.get("interval") || "1min";

  if (!symbol || !ALLOWED_INTERVALS.has(interval)) {
    return Response.json(
      { status: "error", message: "زوج العملة أو الإطار الزمني غير مدعوم." },
      { status: 400 }
    );
  }

  const headers = { Authorization: `apikey ${apiKey}` };
  const candlesUrl = new URL("https://api.twelvedata.com/time_series");
  candlesUrl.searchParams.set("symbol", symbol);
  candlesUrl.searchParams.set("interval", interval);
  candlesUrl.searchParams.set("outputsize", "60");
  candlesUrl.searchParams.set("timezone", "UTC");

  const priceUrl = new URL("https://api.twelvedata.com/price");
  priceUrl.searchParams.set("symbol", symbol);

  try {
    const [candlesResponse, priceResponse] = await Promise.all([
      fetch(candlesUrl, { headers }),
      fetch(priceUrl, { headers }),
    ]);
    const candles = await candlesResponse.json();
    const quote = await priceResponse.json();

    if (!candlesResponse.ok || candles.status === "error" || !Array.isArray(candles.values)) {
      return Response.json(
        { status: "error", message: candles.message || "تعذر جلب الشموع من Twelve Data." },
        { status: candlesResponse.status >= 400 ? candlesResponse.status : 502 }
      );
    }

    const latestCandle = candles.values[0];
    const priceAvailable = priceResponse.ok && quote.status !== "error" && quote.price;
    return Response.json(
      {
        status: "ok",
        meta: { ...candles.meta, requested_symbol: requestedSymbol },
        values: candles.values,
        price: priceAvailable ? quote.price : (latestCandle?.close ?? null),
        price_source: priceAvailable ? "price" : "latest_candle",
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch {
    return Response.json(
      { status: "error", message: "تعذر الاتصال بمزود بيانات Twelve Data." },
      { status: 502 }
    );
  }
}
