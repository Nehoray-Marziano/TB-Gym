import sharp from "sharp";

async function run() {
    const img = sharp("public/icon.jpg");
    const meta = await img.metadata();
    const { width, height } = meta;
    const { data } = await img.raw().toBuffer({ resolveWithObject: true });
    
    const bgR = 140, bgG = 144, bgB = 110;
    
    let minX = width, maxX = 0, minY = height, maxY = 0;
    
    // Ignore top 15 rows and bottom 15 rows
    for (let y = 15; y < height - 15; y++) {
        for (let x = 15; x < width - 15; x++) {
            const idx = (y * width + x) * 3;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
            if (dist > 35) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    console.log(`True emblem bounds: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}], w=${maxX - minX}, h=${maxY - minY}`);
}
run();
