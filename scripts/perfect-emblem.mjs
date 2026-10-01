import sharp from "sharp";

async function makeThickEmblem() {
    const inputPath = "public/icon.jpg";
    const outputPath = "public/studio_emblem_clean.png";

    const image = sharp(inputPath);
    const meta = await image.metadata();
    const { width, height } = meta;
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });

    const bgR = 140, bgG = 144, bgB = 110;

    // True bounds inside icon.jpg
    const minX = 299, maxX = 1237, minY = 373, maxY = 1120;
    const pad = 30;
    const cropLeft = Math.max(0, minX - pad);
    const cropTop = Math.max(0, minY - pad);
    const cropWidth = (maxX - minX) + pad * 2;
    const cropHeight = (maxY - minY) + pad * 2;

    // Step 1: extract original high-res alpha mask
    const alphaMask = new Float32Array(cropWidth * cropHeight);

    for (let cy = 0; cy < cropHeight; cy++) {
        const y = cropTop + cy;
        for (let cx = 0; cx < cropWidth; cx++) {
            const x = cropLeft + cx;
            const inIdx = (y * width + x) * 3;
            const r = data[inIdx];
            const g = data[inIdx + 1];
            const b = data[inIdx + 2];

            const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);

            let a = 0;
            if (dist > 16) {
                const t = Math.min(1, Math.max(0, (dist - 16) / 120));
                a = t * t * (3 - 2 * t); // smoothstep
            }
            alphaMask[cy * cropWidth + cx] = a;
        }
    }

    // Step 2: Morphological circular dilation to thicken strokes
    // Dilation radius in source pixels: 4.5px (expands 5px line to ~14px line)
    const radius = 4.5;
    const rCeil = Math.ceil(radius);
    const dilatedMask = new Float32Array(cropWidth * cropHeight);

    // Precompute circular kernel
    const kernel = [];
    for (let dy = -rCeil; dy <= rCeil; dy++) {
        for (let dx = -rCeil; dx <= rCeil; dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= radius + 0.5) {
                // Smooth falloff at kernel boundary for anti-aliased edge
                const weight = Math.min(1, Math.max(0, radius + 0.5 - d));
                kernel.push({ dx, dy, weight });
            }
        }
    }

    for (let cy = 0; cy < cropHeight; cy++) {
        for (let cx = 0; cx < cropWidth; cx++) {
            let maxVal = 0;
            for (let k = 0; k < kernel.length; k++) {
                const { dx, dy, weight } = kernel[k];
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < cropWidth && ny >= 0 && ny < cropHeight) {
                    const val = alphaMask[ny * cropWidth + nx] * weight;
                    if (val > maxVal) maxVal = val;
                }
            }
            dilatedMask[cy * cropWidth + cx] = maxVal;
        }
    }

    // Step 3: Write out RGBA with bright ivory #FAFBF5 and dilated alpha
    const outBuffer = Buffer.alloc(cropWidth * cropHeight * 4);
    for (let i = 0; i < cropWidth * cropHeight; i++) {
        const outIdx = i * 4;
        const a = Math.round(dilatedMask[i] * 255);
        outBuffer[outIdx] = 252;     // R #FC
        outBuffer[outIdx + 1] = 252; // G #FC
        outBuffer[outIdx + 2] = 247; // B #F7 (warm bright ivory)
        outBuffer[outIdx + 3] = a;
    }

    await sharp(outBuffer, {
        raw: { width: cropWidth, height: cropHeight, channels: 4 }
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath);

    console.log(`Saved thickened, high-contrast studio emblem to ${outputPath} (${cropWidth}x${cropHeight})`);
}

makeThickEmblem().catch(console.error);
