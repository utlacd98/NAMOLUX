# NamoLux cost calculator

Research date: 2 August 2026. Use GBP for decisions. This calculator deliberately separates observed values (to be filled from billing) from estimates.

## Inputs

```text
usd_to_gbp = 0.79
openai_input_usd_per_m = 0.40       # GPT-4.1 mini example
openai_output_usd_per_m = 1.60
groq_120b_input_usd_per_m = 0.15
groq_120b_output_usd_per_m = 0.60
fixed_cost_gbp = vercel + supabase + monitoring + email + other
stripe_payment_gbp = (price_including_vat × 0.015) + 0.20
stripe_billing_gbp = net_subscription_revenue × 0.007   # confirm contract
```

## Reusable formulae

```text
AI request cost GBP =
((input_tokens / 1,000,000 × input_USD_per_m)
 + (cached_input_tokens / 1,000,000 × cached_input_USD_per_m)
 + (output_tokens / 1,000,000 × output_USD_per_m))
 × usd_to_gbp

Feature cost = AI + function compute + database + storage + external API + email

Monthly user cost = Σ(feature runs × feature cost) + allocated fixed cost
Allocated fixed cost = fixed_cost_gbp / active paying users

Net revenue before COGS = price excluding VAT − Stripe payment fee − Stripe Billing fee
Contribution profit = net revenue before COGS − variable user cost
Gross margin = contribution profit / net revenue before COGS
Break-even customers = fixed_cost_gbp / contribution profit per paying customer
Free subsidy ratio = contribution profit per paying customer / expected free-user cost
```

## Worked expected Pro example

```text
Price shown to UK consumer: £9.99 VAT-inclusive
Assumed UK VAT: 20%; net revenue before VAT: £9.99 / 1.20 = £8.325
Payment fee: £9.99 × 1.5% + £0.20 = £0.34985
Estimated Billing fee: £9.99 × 0.7% = £0.06993
Expected variable cost: £0.16
Contribution: £8.325 − £0.34985 − £0.06993 − £0.16 = £7.74522
Gross margin: £7.74522 / £8.325 = 93.0%. This is the standard margin after payment fees and variable cost, using revenue excluding VAT as the denominator.
At £35.55 fixed cost: £35.55 / £7.74522 = 4.59, therefore 5 paying customers.
```

## Scenario worksheet

| Variable | Low | Expected | High |
|---|---:|---:|---:|
| Bulk runs per Pro/month | 2 | 4 | 20 |
| Score runs per Pro/month | 2 | 4 | 20 |
| AI naming runs/month (future) | 0 | 0 | 8 |
| Bulk 50×6 cost/run | £0.004 | £0.020 | £0.120 |
| Score 50 cost/run | £0.0003 | £0.001 | £0.005 |
| AI naming cost/run | £0.001 | £0.006 | £0.050 |
| Monthly variable Pro cost | £0.07 | £0.16 | £3.50 |

For a traffic model, calculate: `paid users = registered free users × conversion rate`; `free subsidy = free users × expected free cost`; `profit = paid users × contribution − fixed cost − free subsidy`.

## Guardrails when prices or model use changes

1. Recalculate after any provider price, prompt, output cap, retry policy or model-routing change.
2. Record actual `input_tokens`, `output_tokens`, `model`, `attempt_count`, cache hit and final cost with every server model call; do not store sensitive prompts in cost telemetry.
3. Alert at 50%, 80% and 100% of each provider/project budget and when an account's trailing 30-day variable cost exceeds 25% of its net revenue.
4. Price changes need VAT/accounting review; this file is not tax advice.
