# NamoLux

An AI-powered domain name generator and SEO audit tool built with Next.js 16, TypeScript, and OpenAI GPT.

**Live Site**: https://namolux.com

## Quick Start (Build & Deploy)

### Local Development
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local

# Run development server
npm run dev
```

### Production Build
```bash
# Build the project
npm run build

# The build output will show all routes generated
```

### Deploy to Vercel
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy to production
vercel --prod --yes
```

### Environment Variables Required
Create a `.env.local` file (or set in Vercel dashboard):
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

---

## Features

### 🎯 Domain Name Generator
- **AI-Powered Generation**: Uses GPT-4o-mini to generate creative, brandable domain names
- **Brand Vibe Selection**: Choose from luxury, futuristic, playful, trustworthy, or minimal vibes
- **Industry Targeting**: Tailor suggestions to specific industries
- **Real-time Availability Check**: Uses Google DNS API to check domain availability
- **Founder Signal™ Scoring**: 0-100 score measuring brand strength, risk, and scalability
- **Multi-TLD Check**: Check .com, .io, .co, .ai, and more
- **CSV Export**: Export your shortlisted domains
- **Namecheap Affiliate Links**: Direct purchase links

### 🔍 SEO Audit Tool (`/seo-audit`)
- **Comprehensive Analysis**: Checks meta tags, images, mobile-friendliness, security, and links
- **Real-time Scanning**: Analyzes any live website instantly
- **Actionable Insights**: Get specific recommendations for each issue
- **Category Scoring**: See scores for each SEO category
- **Overall SEO Score**: Get an at-a-glance view of website health

### 📝 Blog System (`/blog`)
- 20 SEO-optimized blog posts across 3 categories:
  - Domain Strategy
  - SEO Foundations
  - Builder Insights
- Static generation for fast loading
- Category filtering
- Related posts

### 📊 Founder Signal™ (`/founder-signal`)
- Proprietary scoring algorithm for domain quality
- Measures: length, pronounceability, memorability, TLD strength, brand potential

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI / shadcn/ui
- **AI**: OpenAI GPT-4o-mini
- **Domain Checking**: Google DNS API (dns.google/resolve)
- **Icons**: Lucide React
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ or pnpm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd domainsnipe
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

4. **Add your OpenAI API key** to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### Running the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Routes

### POST `/api/generate-domains`

Generates creative domain names using GPT.

**Request Body**:
```json
{
  "keyword": "fitness",
  "vibe": "luxury",
  "industry": "Health & Wellness",
  "maxLength": 10
}
```

**Response**:
```json
{
  "success": true,
  "domains": [
    {
      "name": "fitora",
      "reasoning": "Combines 'fit' with elegant suffix 'ora'"
    }
  ]
}
```

### POST `/api/check-domain`

Checks domain availability and scores them.

**Request Body**:
```json
{
  "domains": ["fitora", "gymevo", "healthix"]
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "name": "fitora",
      "available": true,
      "score": 8.5,
      "pronounceable": true,
      "memorability": 8.0,
      "length": 6
    }
  ]
}
```

### POST `/api/seo-audit`

Performs comprehensive SEO audit on a website.

**Request Body**:
```json
{
  "url": "https://example.com"
}
```

**Response**:
```json
{
  "success": true,
  "url": "https://example.com",
  "categories": [
    {
      "name": "Meta Tags",
      "score": 85,
      "items": [...]
    }
  ],
  "timestamp": "2026-01-16T..."
}
```

## Deployment

### Vercel (Recommended)

**Option 1: CLI Deployment**
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel (first time only)
vercel login

# Deploy to production
vercel --prod --yes
```

**Option 2: GitHub Integration**
1. Push your code to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables in Settings > Environment Variables:
   - `OPENAI_API_KEY` = your OpenAI API key
4. Deploy!

### Manual Build Commands
```bash
# Development
npm run dev          # Starts dev server at http://localhost:3000

# Production build
npm run build        # Creates optimized production build

# Start production server locally
npm run start        # Serves the production build

# Lint
npm run lint         # Run ESLint
```

### Other Platforms

The app can be deployed to any platform that supports Next.js 16:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for domain generation |

Create `.env.local` for local development or set in your hosting platform's dashboard.

## Project Structure

```
domainsnipe/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── generate-domains/   # AI domain generation
│   │   ├── check-domain/       # Domain availability check
│   │   ├── seo-audit/          # SEO analysis
│   │   └── seo-potential/      # SEO scoring
│   ├── blog/              # Blog pages
│   ├── generate/          # Domain generator page
│   ├── seo-audit/         # SEO audit tool page
│   └── ...                # Other pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── blog/             # Blog-specific components
│   ├── navbar.tsx        # Navigation
│   ├── hero.tsx          # Landing page hero
│   └── ...
├── lib/                   # Utilities and data
│   ├── blog.ts           # Blog posts data
│   ├── founder-signal.ts # Scoring algorithm
│   └── utils.ts          # Helper functions
└── public/               # Static assets
    ├── logo.png
    ├── favicon.ico
    └── og-image.png
```

## Key Files

- `components/theme-provider.tsx` - Forces dark mode (no toggle)
- `app/layout.tsx` - Root layout with metadata and theme setup
- `lib/blog.ts` - All 20 blog posts with content
- `lib/founder-signal.ts` - Domain scoring algorithm
- `app/api/check-domain/route.ts` - Uses Google DNS API for availability

## Design System

- **Theme**: Dark luxury with gold accents (forced dark mode)
- **Primary Color**: `#D6B27C` (gold)
- **Secondary Color**: `#8F7A55` (muted gold)
- **Background**: `#0B0C10` (near black)
- **Font**: Inter (sans-serif)

## Troubleshooting

### Site showing light mode?
The site is designed for dark mode only. If you see light mode:
1. Clear localStorage: `localStorage.removeItem('theme')`
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Build errors?
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### Vercel deployment issues?
- Ensure `OPENAI_API_KEY` is set in Vercel Environment Variables
- Check build logs in Vercel dashboard

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

