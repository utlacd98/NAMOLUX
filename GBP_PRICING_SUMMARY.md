# 💷 NamoLux Pricing (GBP)

## ✅ Updated Pricing Structure

Your pricing has been updated to match your design:

### 📦 Packages

| Package | Credits | Price | Features |
|---------|---------|-------|----------|
| **Free Trial** | 5 | £0 | • 5 domain checks<br>• AI chat brainstorming<br>• Basic shortlist |
| **Starter Pack** | 25 | £5 | • 25 domain checks<br>• All vibe modes<br>• Export to CSV<br>• Email support |
| **Pro Pack** ⭐ | 100 | £15 | • 100 domain checks<br>• Priority generation speed<br>• Export to Notion & Airtable<br>• Priority support |

## ⚠️ Action Required

### You Need to Update Your Stripe Products

Your current Stripe price IDs are in **USD**, but your app now uses **GBP (£)**.

**Current:**
- Starter: `price_1SqKBkFbb6V4jtxGuOmzDeSl` (probably $5 USD)
- Pro: `price_1SqKDnFbb6V4jtxGwa2uU4BL` (probably $20 USD)

**What to do:**

1. **Go to Stripe Dashboard** → Products
2. **Update Starter Pack:**
   - Click on the product
   - Add new price: **£5.00 GBP** (one-time)
   - Copy the new price ID
   - Update in `.env.local`

3. **Update Pro Pack:**
   - Click on the product
   - Add new price: **£15.00 GBP** (one-time)
   - Copy the new price ID
   - Update in `.env.local`

## 📝 What Changed

### Removed:
- ❌ Business Pack (£50, 150 credits)
- ❌ Enterprise Pack (£150, 500 credits)

### Updated:
- ✅ Free Trial: Now shows as £0 with 5 credits
- ✅ Starter Pack: 25 credits for £5 (was 10 for $5)
- ✅ Pro Pack: 100 credits for £15 (was 50 for $20)

### New Features Listed:
- Domain checks
- AI chat brainstorming
- Vibe modes
- Export options (CSV, Notion, Airtable)
- Priority support

## 🎨 UI Updates

The pricing page now shows:
- **3 packages** (not 4)
- **GBP (£)** currency symbol
- **"Most Popular"** badge on Pro Pack
- **Custom button text** ("Get started", "Get Starter", "Get Pro")
- **Feature lists** matching your design
- **Descriptions** for each package

## 🚀 Next Steps

1. **Update Stripe products to GBP** (see above)
2. **Get Stripe publishable key** (`pk_test_...`)
3. **Set up webhook** (use Stripe CLI for local testing)
4. **Test the flow:**
   ```bash
   npm run dev
   ```
   - Sign up → Get 5 free credits
   - Go to /pricing
   - Buy Starter → Should charge £5
   - Buy Pro → Should charge £15

## 📄 Files Updated

- ✅ `lib/stripe.ts` - Package definitions
- ✅ `components/pricing-section.tsx` - UI with GBP
- ✅ `.env.local` - Removed Business/Enterprise
- ✅ `.env.example` - Updated template

## 💡 Free Trial Note

Users automatically get **5 free credits** when they sign up (configured in `lib/credits.ts`). The "Free Trial" package on the pricing page just redirects them to the dashboard if they're already signed in.

---

**Your pricing is now in GBP and matches your design! 🎉**

Just update those Stripe products and you're ready to go!

