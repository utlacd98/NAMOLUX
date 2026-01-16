# API Documentation

Complete documentation for all NamoLux API endpoints.

## Base URL

When running locally: `http://localhost:3000/api`

## Authentication

Currently, no authentication is required for API endpoints. For production deployment, consider adding:
- API key authentication
- Rate limiting
- CORS configuration

---

## 1. Generate Domain Names

Generate creative, AI-powered domain name suggestions.

### Endpoint
```
POST /api/generate-domains
```

### Request Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "keyword": "string (required)",
  "vibe": "string (optional)",
  "industry": "string (optional)",
  "maxLength": "number (optional, default: 10)"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| keyword | string | Yes | The main keyword or concept for domain generation |
| vibe | string | No | Brand vibe: "luxury", "futuristic", "playful", "trustworthy", "minimal" |
| industry | string | No | Target industry: "Technology", "Health & Wellness", "Finance", etc. |
| maxLength | number | No | Maximum domain name length (default: 10) |

### Response

**Success (200)**
```json
{
  "success": true,
  "domains": [
    {
      "name": "fitora",
      "reasoning": "Combines 'fit' with elegant suffix 'ora' for a luxury feel"
    },
    {
      "name": "gymevo",
      "reasoning": "Merges 'gym' with 'evolution' suggesting progress"
    }
  ]
}
```

**Error (400/500)**
```json
{
  "error": "Error message description"
}
```

### Example Usage

```javascript
const response = await fetch('/api/generate-domains', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    keyword: 'fitness',
    vibe: 'luxury',
    industry: 'Health & Wellness',
    maxLength: 10
  })
})

const data = await response.json()
console.log(data.domains)
```

---

## 2. Check Domain Availability

Check if domains are available and get quality scores.

### Endpoint
```
POST /api/check-domain
```

### Request Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "domains": ["string array (required)"]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| domains | string[] | Yes | Array of domain names to check (without .com extension) |

### Response

**Success (200)**
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

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| name | string | The domain name |
| available | boolean | Whether the .com domain is available |
| score | number | Overall quality score (1-10) |
| pronounceable | boolean | Whether the name is easy to pronounce |
| memorability | number | Memorability score (1-10) |
| length | number | Character count |

**Error (400/500)**
```json
{
  "error": "Error message description"
}
```

### Example Usage

```javascript
const response = await fetch('/api/check-domain', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    domains: ['fitora', 'gymevo', 'healthix']
  })
})

const data = await response.json()
console.log(data.results)
```

---

## 3. SEO Audit

Perform comprehensive SEO analysis on any website.

### Endpoint
```
POST /api/seo-audit
```

### Request Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "url": "string (required)"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | Full URL of the website to audit (with or without https://) |

### Response

**Success (200)**
```json
{
  "success": true,
  "url": "https://example.com",
  "categories": [
    {
      "name": "Meta Tags",
      "score": 85,
      "items": [
        {
          "title": "Title Tag",
          "status": "pass",
          "description": "Title tag is present and optimal length (45 chars)",
          "recommendation": null
        }
      ]
    }
  ],
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

### Audit Categories

The SEO audit checks the following categories:

1. **Meta Tags** - Title, description, Open Graph, Twitter Cards, canonical URL
2. **Images** - Alt text, lazy loading, optimization
3. **Mobile Friendliness** - Viewport, responsive design
4. **Security** - HTTPS, security headers
5. **Links** - Internal links, external link security

### Item Status Types

| Status | Description |
|--------|-------------|
| pass | Item meets SEO best practices |
| warning | Item needs improvement |
| fail | Critical issue that should be fixed |

**Error (400/500)**
```json
{
  "error": "Error message description"
}
```

### Example Usage

```javascript
const response = await fetch('/api/seo-audit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com'
  })
})

const data = await response.json()
console.log(`Overall score: ${data.categories.reduce((acc, cat) => acc + cat.score, 0) / data.categories.length}`)
```

---

## Rate Limiting

**Current Status**: No rate limiting implemented

**Recommendations for Production**:
- Implement rate limiting per IP address
- Consider API key authentication
- Set up monitoring for API usage
- Add caching for frequently checked domains

## Error Handling

All endpoints follow a consistent error format:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error

## Best Practices

### Domain Generation
- Keep keywords concise (1-2 words)
- Select appropriate vibe for your brand
- Generate multiple batches for variety

### Domain Checking
- Check domains in batches of 10-20 for optimal performance
- Results are sorted by availability and score

### SEO Audit
- Ensure URLs include protocol (https://)
- Some websites may block automated requests
- Results are cached for performance

## Future Enhancements

Planned API improvements:
- [ ] Bulk domain generation endpoint
- [ ] Historical SEO audit tracking
- [ ] Domain price estimation
- [ ] Premium domain availability APIs
- [ ] Webhook support for long-running audits
- [ ] GraphQL API option

## Support

For API issues or feature requests, please open an issue on GitHub.

