# Quick Start Guide

Get NamoLux up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd domainsnipe
npm install
```

Or if you prefer pnpm:
```bash
pnpm install
```

## Step 2: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Get your OpenAI API key:
   - Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy it

3. Add your API key to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```

## Step 3: Run the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Step 4: Test the Features

### Test Domain Generator
1. Navigate to [http://localhost:3000/generate](http://localhost:3000/generate)
2. Enter a keyword (e.g., "fitness")
3. Select a brand vibe (e.g., "Luxury")
4. Click "Generate Names"
5. Wait for AI-generated domain suggestions with availability checks

### Test SEO Audit
1. Navigate to [http://localhost:3000/seo-audit](http://localhost:3000/seo-audit)
2. Enter a website URL (e.g., "https://example.com")
3. Click "Analyze"
4. View comprehensive SEO analysis with scores and recommendations

## Troubleshooting

### "OpenAI API key not found" error
- Make sure you created `.env.local` (not just `.env`)
- Verify your API key is correct and starts with `sk-`
- Restart the development server after adding the key

### Domain availability checks seem inaccurate
- The free DNS-based check is a simple approximation
- For production, consider integrating a premium domain API like:
  - Namecheap API
  - GoDaddy API
  - Domain.com API

### SEO audit fails for some websites
- Some websites block automated requests
- CORS policies may prevent access
- Try different websites or add error handling

## Next Steps

- Customize the brand vibes in `components/generate-names.tsx`
- Add more SEO audit categories in `app/api/seo-audit/route.ts`
- Integrate a premium domain availability API
- Deploy to Vercel or your preferred hosting platform

## Need Help?

Check the main [README.md](./README.md) for detailed documentation.

