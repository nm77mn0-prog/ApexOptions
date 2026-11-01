# Deployment checklist

## Supabase
1. Create a project.
2. Run `supabase/schema.sql` in SQL Editor.
3. Enable email authentication and configure allowed redirect URLs.
4. Keep service-role keys secret; never expose them in browser code.

## Hosting
Vercel Hobby is limited to personal/non-commercial use. It is suitable only for a personal prototype where permitted by its terms, not operating a commercial brokerage. Select a hosting provider and plan that expressly permits the intended commercial use before launch.

## Before any real-money feature
- Obtain US legal advice on product classification, CFTC/SEC jurisdiction, exchange and intermediary registration.
- Implement audited server-side order and ledger services.
- Use a regulated execution venue and approved market-data provider.
- Complete KYC/AML, sanctions screening, customer-fund safeguarding, security testing, incident response, and required disclosures.
- Keep deposits, withdrawals, real balances, and live order execution disabled until approvals are documented.
