const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Icon SVG (1024x1024) - Elegant Gold Shield & Key on Dark Charcoal
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1C19"/>
      <stop offset="100%" stop-color="#11100F"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C38C"/>
      <stop offset="50%" stop-color="#B08D57"/>
      <stop offset="100%" stop-color="#8C6834"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="224" fill="url(#bgGrad)"/>
  <rect width="1020" height="1020" x="2" y="2" rx="222" fill="none" stroke="#B08D57" stroke-width="4" stroke-opacity="0.3"/>

  <!-- Shield Shape -->
  <g filter="url(#glow)">
    <path d="M512 200 L740 280 C740 520 620 680 512 780 C404 680 284 520 284 280 Z"
          fill="none" stroke="url(#goldGrad)" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/>

    <!-- Inner Key Symbol -->
    <circle cx="512" cy="420" r="70" fill="none" stroke="url(#goldGrad)" stroke-width="32"/>
    <path d="M512 490 L512 640 M512 560 L560 560 M512 610 L550 610"
          stroke="url(#goldGrad)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

// 2. Icon Foreground (transparent background, just the shield)
const iconForegroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C38C"/>
      <stop offset="50%" stop-color="#B08D57"/>
      <stop offset="100%" stop-color="#8C6834"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <g filter="url(#glow)" transform="scale(0.85) translate(90, 90)">
    <path d="M512 200 L740 280 C740 520 620 680 512 780 C404 680 284 520 284 280 Z"
          fill="none" stroke="url(#goldGrad)" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="512" cy="420" r="70" fill="none" stroke="url(#goldGrad)" stroke-width="32"/>
    <path d="M512 490 L512 640 M512 560 L560 560 M512 610 L550 610"
          stroke="url(#goldGrad)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

// 3. Splash Screen SVG (2732x2732) - Centered shield with CUSTODIAN wordmark
const splashSvg = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A1816"/>
      <stop offset="100%" stop-color="#11100F"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C38C"/>
      <stop offset="50%" stop-color="#B08D57"/>
      <stop offset="100%" stop-color="#8C6834"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="40" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <rect width="2732" height="2732" fill="url(#splashBg)"/>

  <!-- Centered Logo Group -->
  <g transform="translate(1366, 1260) scale(1.4) translate(-512, -512)" filter="url(#glow)">
    <path d="M512 200 L740 280 C740 520 620 680 512 780 C404 680 284 520 284 280 Z"
          fill="none" stroke="url(#goldGrad)" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="512" cy="420" r="70" fill="none" stroke="url(#goldGrad)" stroke-width="32"/>
    <path d="M512 490 L512 640 M512 560 L560 560 M512 610 L550 610"
          stroke="url(#goldGrad)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Wordmark -->
  <text x="1366" y="1860"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="88"
        font-weight="700"
        letter-spacing="14"
        fill="#EDE9E3"
        text-anchor="middle">CUSTODIAN</text>

  <text x="1366" y="1930"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="32"
        font-weight="500"
        letter-spacing="6"
        fill="#B08D57"
        text-anchor="middle">ZERO-KNOWLEDGE CREDENTIAL VAULT</text>
</svg>
`;

async function main() {
  console.log('Generating high-resolution source assets in /assets...');

  // Generate icon.png (1024x1024)
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-only.png'));

  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  // Generate icon-foreground.png (1024x1024)
  await sharp(Buffer.from(iconForegroundSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-foreground.png'));

  // Generate icon-background.png (1024x1024) - solid #171615
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 23, g: 22, b: 21, alpha: 1 }
    }
  }).png().toFile(path.join(assetsDir, 'icon-background.png'));

  // Generate splash.png (2732x2732)
  await sharp(Buffer.from(splashSvg))
    .resize(2732, 2732)
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  await sharp(Buffer.from(splashSvg))
    .resize(2732, 2732)
    .png()
    .toFile(path.join(assetsDir, 'splash-dark.png'));

  console.log('Source assets created successfully in /assets!');
}

main().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
