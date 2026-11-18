// Builds the app icons (public/) from SVG designs.
//   Home screen / install icon: "teen pattiyan" — day, sunset and night side by side over one mountain range.
//   In-app tab icon + login logo: one per theme (favicon-glacier/sunset/night.svg), swapped by the clock
//   in src/theme/theme.ts.
// Usage: npm i --no-save sharp && node scripts/make-icons.cjs public
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const out = process.argv[2]

// Sun / moon sit inside the maskable safe zone (circle of radius 205 around the centre).
const scenes = {
  stripes: `
  <rect width="171" height="512" fill="#B9D9F1"/>
  <rect x="171" width="171" height="512" fill="#F39466"/>
  <rect x="342" width="170" height="512" fill="#141A42"/>
  <circle cx="112" cy="160" r="32" fill="#FFF7D6"/>
  <circle cx="256" cy="150" r="44" fill="#FFE2B8"/>
  <circle cx="398" cy="150" r="30" fill="#E6EBFF"/>
  <circle cx="413" cy="140" r="26" fill="#141A42"/>
  <circle cx="372" cy="98" r="5" fill="#fff"/>
  <circle cx="452" cy="196" r="4" fill="#fff"/>
  <circle cx="430" cy="92" r="3.5" fill="#fff"/>
  <path d="M0 360 L110 250 L180 310 L270 200 L370 300 L440 250 L512 290 L512 512 L0 512Z" fill="#3A1A40" fill-opacity="0.88"/>
  <path d="M270 200 L302 238 L284 234 L268 252 L250 234 L238 238Z" fill="#FFFFFF"/>
  <path d="M0 440 L150 380 L300 420 L512 370 L512 512 L0 512Z" fill="#0C2A47"/>`,

  glacier: `
  <rect width="512" height="512" fill="#B9D9F1"/>
  <rect y="300" width="512" height="212" fill="#D7EAF8"/>
  <circle cx="340" cy="170" r="54" fill="#FFF7D6"/>
  <path d="M0 340 L110 230 L180 290 L270 170 L370 280 L440 230 L512 270 L512 512 L0 512Z" fill="#8BBBE0"/>
  <path d="M270 170 L304 214 L286 208 L268 228 L250 208 L236 214Z" fill="#FFFFFF"/>
  <path d="M110 230 L132 256 L94 254Z" fill="#FFFFFF"/>
  <path d="M0 410 L140 350 L270 395 L400 345 L512 380 L512 512 L0 512Z" fill="#3F7FB6"/>
  <path d="M0 470 L170 430 L330 460 L512 425 L512 512 L0 512Z" fill="#1F5C91"/>`,

  sunset: `
  <rect width="512" height="512" fill="#E46F4F"/>
  <rect y="150" width="512" height="362" fill="#F39466"/>
  <rect y="250" width="512" height="262" fill="#F8B98C"/>
  <circle cx="340" cy="200" r="70" fill="#FFE2B8"/>
  <path d="M0 330 L110 220 L190 290 L290 170 L400 280 L512 210 L512 512 L0 512Z" fill="#C45577"/>
  <path d="M290 170 L322 208 L304 204 L288 222 L270 204 L258 208Z" fill="#FFE2B8"/>
  <path d="M0 400 L130 320 L240 380 L360 300 L512 370 L512 512 L0 512Z" fill="#7A2F62"/>
  <path d="M0 470 L170 420 L330 455 L512 415 L512 512 L0 512Z" fill="#3A1A40"/>`,

  night: `
  <rect width="512" height="512" fill="#141A42"/>
  <path d="M0 170 Q130 100 260 160 T512 130 L512 200 Q380 180 250 220 T0 230Z" fill="#5DCAA5" fill-opacity="0.35"/>
  <circle cx="110" cy="96" r="6" fill="#fff"/>
  <circle cx="210" cy="70" r="4" fill="#fff"/>
  <circle cx="400" cy="90" r="7" fill="#fff"/>
  <circle cx="340" cy="124" r="4" fill="#fff"/>
  <circle cx="80" cy="170" r="3" fill="#fff"/>
  <path d="M0 400 L140 270 L210 330 L300 200 L420 330 L512 280 L512 512 L0 512Z" fill="#2A3378"/>
  <path d="M300 200 L340 250 L318 244 L298 266 L276 244 L262 250Z" fill="#E6EBFF"/>
  <path d="M0 470 L160 410 L320 450 L512 400 L512 512 L0 512Z" fill="#0E1330"/>`,
}

function svg(scene, { rounded }) {
  const body = scenes[scene]
  if (!rounded) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${body}\n</svg>\n`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><clipPath id="r"><rect width="512" height="512" rx="114"/></clipPath></defs>
  <g clip-path="url(#r)">${body}
  </g>
</svg>
`
}

async function png(svgText, size, file) {
  await sharp(Buffer.from(svgText), { density: Math.max(72, ((72 * size) / 512) * 2) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, file))
}

;(async () => {
  const rounded = svg('stripes', { rounded: true })
  const full = svg('stripes', { rounded: false })
  fs.writeFileSync(path.join(out, 'favicon.svg'), rounded)
  for (const theme of ['glacier', 'sunset', 'night']) {
    fs.writeFileSync(path.join(out, `favicon-${theme}.svg`), svg(theme, { rounded: true }))
  }
  await png(rounded, 192, 'pwa-192x192.png')
  await png(rounded, 512, 'pwa-512x512.png')
  await png(full, 512, 'maskable-icon-512x512.png') // Android crops it to its own shape
  await png(full, 180, 'apple-touch-icon.png') // iOS rounds the corners itself; no transparency
  console.log('ok')
})()
