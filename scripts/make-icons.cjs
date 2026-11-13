// Builds the app icon set (public/) from one SVG design: mountains with a sun-coin on a teal gradient.
// Usage: npm i --no-save sharp && node scripts/make-icons.cjs public
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const out = process.argv[2]

function svg({ rounded }) {
  const bg = rounded ? '<rect width="512" height="512" rx="114" fill="url(#bg)"/>' : '<rect width="512" height="512" fill="url(#bg)"/>'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a9a78"/>
      <stop offset="0.5" stop-color="#0f6e56"/>
      <stop offset="1" stop-color="#083f31"/>
    </linearGradient>
    <radialGradient id="coin" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#fff7d6"/>
      <stop offset="0.45" stop-color="#fbbf24"/>
      <stop offset="1" stop-color="#c2780a"/>
    </radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#022c22" flood-opacity="0.35"/>
    </filter>
  </defs>
  ${bg}
  <!-- sun-coin -->
  <g filter="url(#shadow)"><circle cx="338" cy="170" r="66" fill="url(#coin)"/></g>
  <text x="338" y="194" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="66" fill="#8a4b06" fill-opacity="0.8">Rs</text>
  <!-- mountains -->
  <path d="M60 400 L196 214 L262 300 L314 236 L452 400 Z" fill="#e1f5ee" filter="url(#shadow)"/>
  <path d="M196 214 L232 263 L210 256 L190 274 L172 248 Z" fill="#ffffff"/>
  <path d="M314 236 L340 270 L322 266 L306 280 L294 262 Z" fill="#ffffff"/>
  <path d="M60 400 L196 214 L178 400 Z" fill="#b9e6d5" fill-opacity="0.6"/>
  <rect x="60" y="398" width="392" height="14" rx="7" fill="#e1f5ee" fill-opacity="0.5"/>
</svg>`
}

async function png(svgText, size, file, flatten) {
  let img = sharp(Buffer.from(svgText), { density: Math.max(72, ((72 * size) / 512) * 2) }).resize(size, size)
  if (flatten) img = img.flatten({ background: '#0f6e56' })
  await img.png({ compressionLevel: 9 }).toFile(path.join(out, file))
}

;(async () => {
  const rounded = svg({ rounded: true })
  const full = svg({ rounded: false })
  fs.writeFileSync(path.join(out, 'favicon.svg'), rounded)
  await png(rounded, 192, 'pwa-192x192.png')
  await png(rounded, 512, 'pwa-512x512.png')
  await png(full, 512, 'maskable-icon-512x512.png', true) // Android crops it to its own shape
  await png(full, 180, 'apple-touch-icon.png', true) // iOS rounds the corners itself; no transparency
  console.log('ok')
})()
