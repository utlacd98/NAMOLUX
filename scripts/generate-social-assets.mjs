import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const outDir = path.resolve("public/social")

const palette = {
  ink: "#050505",
  panel: "#111111",
  panel2: "#181512",
  line: "#2b261a",
  gold: "#E7B83F",
  gold2: "#C9952D",
  white: "#F8F5EC",
  muted: "#AFA89B",
  blue: "#7EA7FF",
  green: "#63D39A",
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function base({ width, height, title, subtitle, eyebrow = "NAMOLUX", footer = "namolux.com/bulk-domain-check" }) {
  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${palette.gold}"/>
        <stop offset="1" stop-color="${palette.gold2}"/>
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${palette.panel}"/>
        <stop offset="1" stop-color="${palette.panel2}"/>
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
      <style>
        .brand { font: 800 34px Georgia, serif; fill: ${palette.white}; letter-spacing: 0; }
        .brandGold { fill: ${palette.gold}; }
        .eyebrow { font: 700 24px Arial, sans-serif; fill: ${palette.gold}; letter-spacing: 3px; }
        .h1 { font: 800 82px Arial, sans-serif; fill: ${palette.white}; letter-spacing: 0; }
        .h1Small { font: 800 66px Arial, sans-serif; fill: ${palette.white}; letter-spacing: 0; }
        .body { font: 400 34px Arial, sans-serif; fill: ${palette.muted}; letter-spacing: 0; }
        .bodyStrong { font: 700 34px Arial, sans-serif; fill: ${palette.white}; letter-spacing: 0; }
        .tiny { font: 600 24px Arial, sans-serif; fill: ${palette.muted}; letter-spacing: 0; }
        .metric { font: 800 58px Arial, sans-serif; fill: ${palette.white}; letter-spacing: 0; }
        .label { font: 700 24px Arial, sans-serif; fill: ${palette.muted}; letter-spacing: 0; }
      </style>
    </defs>
    <rect width="${width}" height="${height}" fill="${palette.ink}"/>
    <rect x="34" y="34" width="${width - 68}" height="${height - 68}" rx="34" fill="url(#panel)" stroke="${palette.line}" stroke-width="2"/>
    <g transform="translate(72 74)">
      <text class="brand">Namo<tspan class="brandGold">Lux</tspan></text>
    </g>
    <text x="72" y="${height - 72}" class="tiny">${esc(footer)}</text>
    <text x="${width - 72}" y="${height - 72}" text-anchor="end" class="tiny">Founder Signal&#8482;</text>
    <text x="72" y="190" class="eyebrow">${esc(eyebrow)}</text>
    <text x="72" y="292" class="h1">${title}</text>
    <text x="72" y="352" class="body">${subtitle}</text>`
}

function end() {
  return "\n  </svg>"
}

const assets = [
  {
    id: "scorecard-square",
    width: 1080,
    height: 1080,
    title: "Names with proof.",
    subtitle: "Compare a shortlist by score, fit, and availability.",
    svg: () => `${base({
      width: 1080,
      height: 1080,
      title: "Names with proof.",
      subtitle: "Compare a shortlist by score, fit, and availability.",
    })}
    <g filter="url(#softShadow)">
      <rect x="96" y="448" width="888" height="350" rx="28" fill="#0B0B0B" stroke="#302718" stroke-width="2"/>
      <text x="144" y="526" class="bodyStrong">vaulten.com</text>
      <text x="144" y="588" class="body">Trust signal. Clean two-syllable close.</text>
      <circle cx="846" cy="560" r="76" fill="url(#gold)"/>
      <text x="846" y="580" text-anchor="middle" font-family="Arial" font-size="58" font-weight="900" fill="#080808">94</text>
      <rect x="144" y="664" width="196" height="54" rx="27" fill="#102015" stroke="#245C3D"/>
      <text x="242" y="700" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="${palette.green}">.com live</text>
      <rect x="364" y="664" width="186" height="54" rx="27" fill="#131313" stroke="#2D2D2D"/>
      <text x="457" y="700" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="${palette.white}">.io checked</text>
      <rect x="574" y="664" width="172" height="54" rx="27" fill="#131313" stroke="#2D2D2D"/>
      <text x="660" y="700" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="${palette.white}">.ai checked</text>
    </g>
    <text x="96" y="890" class="bodyStrong">Stop guessing. Start scoring.</text>
  ${end()}`,
  },
  {
    id: "anti-vibes-square",
    width: 1080,
    height: 1080,
    title: "Not just vibes.",
    subtitle: "NamoLux turns naming into a sharper decision.",
    svg: () => `${base({
      width: 1080,
      height: 1080,
      title: "Not just vibes.",
      subtitle: "NamoLux turns naming into a sharper decision.",
      eyebrow: "FOR FOUNDERS",
    })}
    <g transform="translate(96 454)">
      <rect width="888" height="92" rx="22" fill="#0B0B0B" stroke="#2A2A2A"/>
      <text x="34" y="58" class="body">1. Paste your shortlist</text>
      <rect y="124" width="888" height="92" rx="22" fill="#0B0B0B" stroke="#2A2A2A"/>
      <text x="34" y="182" class="body">2. Compare signals and TLDs</text>
      <rect y="248" width="888" height="92" rx="22" fill="#0B0B0B" stroke="${palette.gold2}"/>
      <text x="34" y="306" class="bodyStrong">3. Pick the name worth building on</text>
    </g>
    <path d="M874 804l24 48 53 8-38 37 9 53-48-25-48 25 9-53-38-37 53-8 24-48z" fill="url(#gold)" opacity="0.95"/>
  ${end()}`,
  },
  {
    id: "pricing-story",
    width: 1080,
    height: 1920,
    title: "Free to start.",
    subtitle: "Pro gives you room to check, score, and decide.",
    svg: () => `${base({
      width: 1080,
      height: 1920,
      title: "Free to start.",
      subtitle: "Pro gives you room to check, score, and decide.",
      eyebrow: "3 CHECKS + 1 SCORE / MONTH",
      footer: "namolux.com/pricing",
    })}
    <g filter="url(#softShadow)">
      <rect x="92" y="512" width="896" height="730" rx="38" fill="#0B0B0B" stroke="${palette.gold2}" stroke-width="3"/>
      <text x="144" y="620" font-family="Arial" font-size="54" font-weight="800" fill="${palette.white}">Free tier includes</text>
      <text x="144" y="724" class="bodyStrong">3 Bulk Check runs / month</text>
      <text x="144" y="816" class="bodyStrong">1 Founder Signal run / month</text>
      <text x="144" y="908" class="bodyStrong">Up to 50 names per batch</text>
      <text x="144" y="1000" class="bodyStrong">Six domain extensions</text>
      <text x="144" y="1092" class="bodyStrong">Pro: 120 checks + 120 scores</text>
      <rect x="144" y="1340" width="792" height="122" rx="28" fill="url(#gold)"/>
      <text x="540" y="1418" text-anchor="middle" font-family="Arial" font-size="42" font-weight="900" fill="#080808">Upgrade for GBP 7.99/mo</text>
    </g>
    <text x="92" y="1598" class="h1Small">Bring the shortlist.</text>
    <text x="92" y="1676" class="h1Small">Make the call.</text>
  ${end()}`,
  },
  {
    id: "linkedin-banner",
    width: 1600,
    height: 900,
    title: "A better way to choose a domain.",
    subtitle: "Founder Signal scoring, live availability, and sharp naming logic in one workspace.",
    svg: () => `${base({
      width: 1600,
      height: 900,
      title: "A better way to",
      subtitle: "",
      eyebrow: "NAMING TOOL FOR BUILDERS",
    })}
    <text x="72" y="372" class="h1">choose a domain.</text>
    <text x="72" y="444" class="body">Founder Signal scoring and live availability.</text>
    <g transform="translate(920 196)" filter="url(#softShadow)">
      <rect width="560" height="470" rx="34" fill="#0B0B0B" stroke="#302718" stroke-width="2"/>
      <text x="48" y="90" class="bodyStrong">Shortlist score</text>
      <text x="48" y="176" class="metric">94</text>
      <text x="160" y="172" class="label">vaulten</text>
      <line x1="48" y1="228" x2="512" y2="228" stroke="#2A2A2A"/>
      <text x="48" y="292" class="metric">92</text>
      <text x="160" y="288" class="label">paynest</text>
      <line x1="48" y1="344" x2="512" y2="344" stroke="#2A2A2A"/>
      <text x="48" y="408" class="metric">88</text>
      <text x="160" y="404" class="label">clearbitx</text>
    </g>
    <rect x="72" y="640" width="330" height="74" rx="20" fill="url(#gold)"/>
    <text x="237" y="687" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900" fill="#080808">Try it free</text>
  ${end()}`,
  },
  {
    id: "bulk-check-square",
    width: 1080,
    height: 1080,
    title: "Check the shortlist.",
    subtitle: "See what is available before you fall in love.",
    svg: () => `${base({
      width: 1080,
      height: 1080,
      title: "Check the shortlist.",
      subtitle: "See what is available before you fall in love.",
      eyebrow: "BULK DOMAIN CHECK",
    })}
    <g transform="translate(96 448)" filter="url(#softShadow)">
      ${["nova", "vaulten", "paynest", "clearforge"].map((name, i) => `
      <rect y="${i * 98}" width="888" height="76" rx="20" fill="#0B0B0B" stroke="#2A2A2A"/>
      <text x="32" y="${i * 98 + 49}" class="bodyStrong">${name}</text>
      <text x="440" y="${i * 98 + 49}" class="label">.com</text>
      <text x="560" y="${i * 98 + 49}" class="label">.io</text>
      <text x="680" y="${i * 98 + 49}" class="label">.ai</text>
      <circle cx="806" cy="${i * 98 + 38}" r="16" fill="${i === 1 ? palette.green : palette.gold}"/>
      `).join("")}
    </g>
    <text x="96" y="912" class="bodyStrong">Multi-TLD checks in seconds.</text>
  ${end()}`,
  },
]

await fs.mkdir(outDir, { recursive: true })

for (const asset of assets) {
  const svg = asset.svg()
  const svgPath = path.join(outDir, `namolux-${asset.id}.svg`)
  const pngPath = path.join(outDir, `namolux-${asset.id}.png`)
  await fs.writeFile(svgPath, svg, "utf8")
  await sharp(Buffer.from(svg)).png().toFile(pngPath)
}

console.log(JSON.stringify(assets.map((asset) => ({
  id: asset.id,
  svg: path.join(outDir, `namolux-${asset.id}.svg`),
  png: path.join(outDir, `namolux-${asset.id}.png`),
})), null, 2))
