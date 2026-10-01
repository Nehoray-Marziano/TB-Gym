import fs from "fs";

const rawSvg = fs.readFileSync("public/initials_logo.svg", "utf8");

// Extract paths from initials_logo.svg, remove stroke="none", and add bold stroke dilation
const paths = rawSvg
    .replace(/<svg[^>]*>/, "")
    .replace("</svg>", "")
    .replaceAll('stroke="none"', '')
    .replaceAll('fill="#000000"', 'fill="#111a12" stroke="#111a12" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"');

// Create crisp, extra-bold SVG with prominent Hebrew studio branding
const crispSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="185 215 720 660" width="100%" height="100%" fill="none">
  <g fill="#111a12" stroke="#111a12">
${paths}
    <text x="545" y="865" text-anchor="middle" font-family="'Varela Round', sans-serif" font-size="80" font-weight="900" fill="#111a12" stroke="#111a12" stroke-width="2.5" letter-spacing="3">תזונה • אימונים</text>
  </g>
</svg>
`;

fs.writeFileSync("public/studio_logo_crisp.svg", crispSvg);
console.log("Updated public/studio_logo_crisp.svg with true stroke dilation");
