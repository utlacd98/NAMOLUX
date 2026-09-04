# NamoLux production checklist

The code is fail-closed: billing uncertainty disables paid access and ads, quota-database uncertainty rejects metered requests, and an absent admin role denies the metrics area.

## 1. Database

Confirm that the Vercel Production NEXT_PUBLIC_SUPABASE_URL points at the
intended Supabase project before any schema operation. This repository's local
and remote migration histories have diverged, so **do not run**
supabase db push against production.

For the Name Decision Workspace, apply the reviewed migrations explicitly and
in this order:

1. naming_workspace_persistence
2. bulk_check_queue_pipeline
3. naming_workspace_fk_indexes

Then verify that anon and authenticated have no privileges on the server-only
workspace tables, service_role cannot update decision reports, and only
service_role can execute the bulk-job claim/refund functions.

Run the Supabase security and performance advisors after deployment. The
intentional "RLS enabled, no policy" notices on server-only tables are safe
because browser roles are also explicitly revoked; do not grant browser roles
access to these tables or their quota functions.

## 2. Stripe

- Configure `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_PRO_ANNUAL` with the active recurring GBP £9.99/month and £69/year Prices on the same Pro product. Keep `STRIPE_PRICE_PRO` only as a legacy fallback.
- Point the live webhook to `https://www.namolux.com/api/stripe/webhook`.
- Subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
- Set `STRIPE_WEBHOOK_SECRET`, then test checkout, renewal, failed payment/grace, cancellation, reactivation, duplicate webhook delivery, and Customer Portal return.

## 3. Google AdSense and consent

- Add and approve `www.namolux.com` in AdSense.
- Keep **Auto ads** and overlay formats disabled; NamoLux uses manual, policy-controlled placements only.
- In AdSense **Privacy & messaging**, publish a European regulations message and include `https://www.namolux.com/privacy` as the privacy URL.
- Keep the one-click “Do not consent” choice enabled where required.
- Set the publisher and slot environment variables from `.env.example`.
- Verify `/ads.txt` returns the real publisher line.
- Only after the CMP and slots are verified, set `ADS_ENABLED=true` in production.

Paid accounts are checked before the AdSense script is rendered. `NEXT_PUBLIC_ADS_TEST_MODE=true` renders local placeholders without contacting Google.

## 4. Release gates

```powershell
npm run check
npm run build
npm audit
```

Then test signed-out free, signed-in free, active paid, canceled-but-paid-through, expired, and past-due-grace accounts in a real browser. Confirm that only eligible free states request `pagead2.googlesyndication.com`.
