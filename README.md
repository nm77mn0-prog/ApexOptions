# ApexOptions V3 — Supabase-connected demo starter

This is a development starter, not a deployed service and not a live trading system.

## Included
- Next.js web app with Supabase email sign-up/sign-in
- Read-only demo wallet and recent demo trade history
- Supabase client configured through environment variables
- SQL trigger to create a demo profile and $10,000 virtual wallet after registration

## Security and product limits
- Real-money trading, deposits, withdrawals, live order execution, and customer fund collection are intentionally disabled.
- The browser uses only a Supabase publishable key. Never place a Supabase secret/service-role key in this project.
- Wallet/trade writes must be implemented using validated server-side functions/RPCs, not direct browser updates.
- Before any real-money operation, obtain specialist legal advice and complete security, licensing, and compliance reviews.

## Setup
1. Run `supabase/first-user-trigger.sql` in Supabase SQL Editor.
2. The `.env.local` file in this package is prefilled for the Supabase project supplied during setup. Keep it private and do not upload it to a public repository. If missing, copy `.env.example` to `.env.local` and fill the URL and publishable key.
3. Install Node.js, then run `npm install` and `npm run dev`.
4. Open http://localhost:3000.

For deployment, use a hosting plan whose terms permit the intended use. Keep all secret keys server-side.
ApexOptions V3 deployment update
Preview redeploy trigger — November 2, 2026
