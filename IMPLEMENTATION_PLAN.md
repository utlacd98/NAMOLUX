# NamoLux - Authentication & Payment Implementation Plan

## Overview
Implement a complete authentication and credit-based payment system where users can:
- Sign up/sign in with Clerk
- Purchase credits via Stripe
- Use credits to generate domains and run SEO audits
- Persist credits across sessions

## Architecture

### Tech Stack
- **Authentication**: Clerk (easy setup, great UX)
- **Database**: Vercel Postgres (or Supabase) with Prisma ORM
- **Payments**: Stripe Checkout
- **State Management**: React Context + Server Actions

## Database Schema

```prisma
model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String   @unique
  credits       Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  transactions  Transaction[]
  usageHistory  Usage[]
}

model Transaction {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  type            String   // "purchase" | "bonus" | "refund"
  credits         Int
  amount          Float?   // USD amount
  stripeSessionId String?  @unique
  status          String   // "pending" | "completed" | "failed"
  createdAt       DateTime @default(now())
}

model Usage {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String   // "domain_generation" | "seo_audit"
  credits     Int      // Credits used
  metadata    Json?    // Store details like keyword, URL, etc.
  createdAt   DateTime @default(now())
}
```

## Credit Pricing

### Packages
1. **Starter** - 10 credits - $5 (50¢ per credit)
2. **Pro** - 50 credits - $20 (40¢ per credit) - Save 20%
3. **Business** - 150 credits - $50 (33¢ per credit) - Save 33%
4. **Enterprise** - 500 credits - $150 (30¢ per credit) - Save 40%

### Credit Costs
- **Domain Generation**: 1 credit (generates 10 domains)
- **SEO Audit**: 1 credit (full website analysis)

### Free Tier
- New users get 3 free credits to try the service

## Implementation Steps

### Phase 1: Authentication (Clerk)
1. Install Clerk SDK
2. Set up Clerk app and get API keys
3. Add Clerk provider to layout
4. Create sign-in/sign-up pages
5. Add user button to navbar
6. Protect routes with middleware

### Phase 2: Database Setup
1. Choose database (Vercel Postgres recommended)
2. Install Prisma
3. Create schema
4. Set up migrations
5. Create database helper functions

### Phase 3: Credit System
1. Create API to get user credits
2. Create API to deduct credits
3. Create API to add credits
4. Add credit display in navbar
5. Update domain generation API to check/deduct credits
6. Update SEO audit API to check/deduct credits

### Phase 4: Stripe Integration
1. Create Stripe account
2. Create products in Stripe dashboard
3. Install Stripe SDK
4. Create checkout session API
5. Create webhook handler for payment success
6. Add credits to user on successful payment

### Phase 5: UI/UX
1. Create pricing page
2. Add "Buy Credits" button
3. Show credit balance
4. Add usage history page
5. Show "insufficient credits" modal
6. Add success/error notifications

## File Structure

```
domainsnipe/
├── app/
│   ├── api/
│   │   ├── credits/
│   │   │   ├── balance/route.ts       # Get user credits
│   │   │   ├── deduct/route.ts        # Deduct credits
│   │   │   └── history/route.ts       # Usage history
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts      # Create checkout session
│   │   │   └── webhook/route.ts       # Handle payment events
│   │   ├── generate-domains/route.ts  # Updated with credit check
│   │   └── seo-audit/route.ts         # Updated with credit check
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── pricing/page.tsx
│   └── dashboard/page.tsx             # User dashboard
├── lib/
│   ├── db.ts                          # Prisma client
│   ├── credits.ts                     # Credit management functions
│   └── stripe.ts                      # Stripe helpers
├── middleware.ts                      # Clerk auth middleware
├── prisma/
│   └── schema.prisma
└── .env.local
    ├── CLERK_SECRET_KEY
    ├── NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ├── DATABASE_URL
    ├── STRIPE_SECRET_KEY
    ├── NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    └── STRIPE_WEBHOOK_SECRET
```

## Environment Variables Needed

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (already have)
OPENAI_API_KEY=sk-proj-...
```

## User Flow

### New User
1. Lands on homepage
2. Clicks "Generate Names" or "SEO Audit"
3. Prompted to sign up
4. Signs up with Clerk (email/Google/GitHub)
5. Gets 3 free credits
6. Can use features
7. When credits run out, prompted to buy more

### Returning User
1. Signs in with Clerk
2. Credits are loaded from database
3. Can use features
4. Can buy more credits anytime

### Purchase Flow
1. User clicks "Buy Credits"
2. Selects package
3. Redirected to Stripe Checkout
4. Completes payment
5. Redirected back to app
6. Credits added automatically via webhook
7. Can immediately use new credits

## Next Steps

Ready to implement? Here's the order:
1. ✅ Set up Clerk authentication
2. ✅ Set up database (Vercel Postgres + Prisma)
3. ✅ Implement credit system
4. ✅ Set up Stripe
5. ✅ Build UI components
6. ✅ Test end-to-end

Let's start with Clerk authentication!

