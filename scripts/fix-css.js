// Post-build script to replace color-mix() with compatible CSS
// for Chrome 109 on Windows 7
const fs = require('fs');
const path = require('path');

// Color mappings for Tailwind v4 opacity modifiers
const colorMap = {
  'primary': '#1877f2',
  'primary-foreground': '#ffffff',
  'secondary': '#e4e6eb',
  'secondary-foreground': '#1c1e21',
  'muted': '#f0f2f5',
  'muted-foreground': '#65676b',
  'accent': '#e4e6eb',
  'accent-foreground': '#1c1e21',
  'destructive': '#e41e3f',
  'destructive-foreground': '#ffffff',
  'success': '#42b72a',
  'warning': '#f0ad4e',
  'foreground': '#1c1e21',
  'background': '#f0f2f5',
  'card': '#ffffff',
  'border': '#dddfe2',
  'input': '#dddfe2',
  'ring': '#1877f2',
};

function replaceColorMix(css) {
  // Replace color-mix(in srgb, color percent) with the color at that opacity
  return css.replace(
    /color-mix\(in\s+srgb,\s*var\(--color-([a-z-]+)\)\s+(\d+)%\)/g,
    (match, colorName, percent) => {
      const hex = colorMap[colorName];
      if (!hex) return match; // Keep original if we can't resolve
      // Convert hex to rgba
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const alpha = parseInt(percent) / 100;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  );
}

// Find all CSS files in .next/static/css/
const cssDir = path.join(__dirname, '..', '.next', 'static', 'css');
if (!fs.existsSync(cssDir)) {
  console.log('No .next/static/css/ directory found, skipping CSS fix');
  process.exit(0);
}

const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
for (const file of cssFiles) {
  const filePath = path.join(cssDir, file);
  let css = fs.readFileSync(filePath, 'utf8');
  const original = css;
  css = replaceColorMix(css);
  if (css !== original) {
    fs.writeFileSync(filePath, css, 'utf8');
    console.log(`Fixed color-mix() in ${file}`);
  }
}

console.log('Chrome 109 CSS compatibility fix complete');