# Testing Guide

Complete guide to test all features of NamoLux.

## Prerequisites

Before testing, ensure you have:
- ✅ Installed all dependencies (`npm install`)
- ✅ Created `.env.local` with your OpenAI API key
- ✅ Started the development server (`npm run dev`)

## Test 1: Domain Name Generator

### Steps:
1. Navigate to `http://localhost:3000/generate`
2. Enter a keyword (e.g., "fitness", "tech", "food")
3. Select a brand vibe (e.g., "Luxury")
4. Optionally select an industry
5. Click "Generate Names"

### Expected Results:
- ✅ Loading spinner appears
- ✅ After 3-5 seconds, 10 domain suggestions appear
- ✅ Each domain shows:
  - Name with .com extension
  - Availability status (green checkmark or gray X)
  - Score (1-10)
  - Memorability score
  - Pronounceable badge (if applicable)
- ✅ Domains are sorted by availability first, then by score
- ✅ Hover over a domain to see action buttons (copy, bookmark, register)

### Test Actions:
- **Copy Domain**: Click copy icon, verify domain is copied to clipboard
- **Bookmark**: Click bookmark icon, verify domain appears in shortlist sidebar
- **Export**: Add multiple domains to shortlist, click "Export", verify .txt file downloads
- **Register**: Click external link icon on available domain, verify Namecheap opens

### Common Issues:
- **"Failed to generate"**: Check your OpenAI API key in `.env.local`
- **All domains show as taken**: DNS lookup may be slow, try again
- **No results**: Check browser console for errors

---

## Test 2: Domain Availability Checker

This is tested automatically when you generate domains, but you can also test it directly:

### Using Browser DevTools:
```javascript
// Open browser console (F12)
const response = await fetch('/api/check-domain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domains: ['google', 'thisisaveryunlikelydomainname123', 'fitora']
  })
})
const data = await response.json()
console.log(data)
```

### Expected Results:
- ✅ Returns array of domain results
- ✅ Each result has: name, available, score, pronounceable, memorability, length
- ✅ Known domains (like 'google') show as unavailable
- ✅ Unlikely domains show as available

---

## Test 3: SEO Audit Tool

### Steps:
1. Navigate to `http://localhost:3000/seo-audit`
2. Enter a website URL (try these):
   - `https://example.com`
   - `https://github.com`
   - `https://vercel.com`
   - Your own website
3. Click "Analyze"

### Expected Results:
- ✅ Loading spinner with progress message
- ✅ After 3-5 seconds, audit results appear
- ✅ Overall score displayed (0-100)
- ✅ 5 category cards shown:
  - Meta Tags
  - Images
  - Mobile Friendliness
  - Security
  - Links
- ✅ Each category shows:
  - Icon and name
  - Score (0-100)
  - Number of passed/warning/failed items
  - Expandable details

### Test Actions:
- **Expand Category**: Click on a category to see detailed items
- **Check Status Icons**: 
  - Green checkmark = Pass
  - Yellow warning = Warning
  - Red X = Fail
- **Read Recommendations**: Failed/warning items should have recommendations
- **Download Report**: Click "Download Report" button
- **Analyze Another**: Click "Analyze Another Site" to reset

### Test Different Websites:
- **Well-optimized site** (e.g., vercel.com): Should score 80+
- **Basic site** (e.g., example.com): Should score 60-80
- **Your own site**: Check for real SEO issues

### Common Issues:
- **"Failed to fetch"**: Some sites block automated requests
- **CORS errors**: Try a different website
- **Low scores**: This is normal for basic websites

---

## Test 4: API Endpoints Directly

### Test Generate Domains API:
```bash
curl -X POST http://localhost:3000/api/generate-domains \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "fitness",
    "vibe": "luxury",
    "industry": "Health & Wellness",
    "maxLength": 10
  }'
```

### Test Check Domain API:
```bash
curl -X POST http://localhost:3000/api/check-domain \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["fitora", "gymevo", "healthix"]
  }'
```

### Test SEO Audit API:
```bash
curl -X POST http://localhost:3000/api/seo-audit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'
```

---

## Performance Testing

### Domain Generation:
- **Expected time**: 3-5 seconds
- **Factors**: OpenAI API response time, domain checking
- **Optimization**: Results are processed in parallel

### SEO Audit:
- **Expected time**: 2-4 seconds
- **Factors**: Website response time, HTML size
- **Optimization**: Single fetch, efficient parsing

---

## Error Handling Tests

### Test Invalid Inputs:

1. **Empty keyword**: Should show validation error
2. **Invalid URL**: Should show "Invalid URL format"
3. **Missing API key**: Should show OpenAI error
4. **Network offline**: Should fallback to mock data

---

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

---

## Checklist

- [ ] Domain generator works with real API
- [ ] Domain availability checking is functional
- [ ] SEO audit analyzes websites correctly
- [ ] Shortlist and export features work
- [ ] All buttons and interactions respond
- [ ] Loading states display properly
- [ ] Error messages are clear
- [ ] Mobile responsive design works
- [ ] Dark/light theme switching works
- [ ] All links navigate correctly

---

## Reporting Issues

If you find bugs:
1. Check browser console for errors
2. Verify `.env.local` is configured
3. Check API key has credits
4. Try restarting the dev server
5. Clear browser cache

## Next Steps After Testing

Once all tests pass:
1. Deploy to Vercel or your preferred platform
2. Add your production OpenAI API key to environment variables
3. Consider adding analytics
4. Set up monitoring for API usage
5. Implement rate limiting for production

