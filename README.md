# NamoLux

An AI-powered domain name generator and SEO audit tool built with Next.js 16, TypeScript, and OpenAI GPT.

## Features

### 🎯 Domain Name Generator
- **AI-Powered Generation**: Uses GPT-4o-mini to generate creative, brandable domain names
- **Brand Vibe Selection**: Choose from luxury, futuristic, playful, trustworthy, or minimal vibes
- **Industry Targeting**: Tailor suggestions to specific industries
- **Real-time Availability Check**: Automatically checks .com domain availability
- **Smart Scoring**: Evaluates domains based on length, pronounceability, and memorability
- **Shortlist & Export**: Save your favorite domains and export them

### 🔍 SEO Audit Tool
- **Comprehensive Analysis**: Checks meta tags, images, mobile-friendliness, security, and links
- **Real-time Scanning**: Analyzes any live website instantly
- **Actionable Insights**: Get specific recommendations for each issue
- **Category Scoring**: See scores for each SEO category
- **Overall SEO Score**: Get an at-a-glance view of website health

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **AI**: OpenAI GPT-4o-mini
- **Web Scraping**: Cheerio
- **Icons**: Lucide React

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

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add your `OPENAI_API_KEY` in the Environment Variables section
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for domain generation |

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

