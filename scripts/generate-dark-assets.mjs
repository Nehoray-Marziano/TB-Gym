import sharp from "sharp";
import fs from "fs";

async function generateDarkAssets() {
    // 1. Generate studio_emblem_dark.png from icon.jpg
    const inputPath = "public/icon.jpg";
    const darkEmblemPath = "public/studio_emblem_dark.png";

    const image = sharp(inputPath);
    const meta = await image.metadata();
    const { width, height } = meta;
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });

    const bgR = 140, bgG = 144, bgB = 110;
    const minX = 299, maxX = 1237, minY = 373, maxY = 1120;
    const pad = 30;
    const cropLeft = Math.max(0, minX - pad);
    const cropTop = Math.max(0, minY - pad);
    const cropWidth = (maxX - minX) + pad * 2;
    const cropHeight = (maxY - minY) + pad * 2;

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
                a = t * t * (3 - 2 * t);
            }
            alphaMask[cy * cropWidth + cx] = a;
        }
    }

    const radius = 4.5;
    const rCeil = Math.ceil(radius);
    const dilatedMask = new Float32Array(cropWidth * cropHeight);

    const kernel = [];
    for (let dy = -rCeil; dy <= rCeil; dy++) {
        for (let dx = -rCeil; dx <= rCeil; dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= radius + 0.5) {
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

    // Write dark emblem (#162218: R=22, G=34, B=24)
    const outBuffer = Buffer.alloc(cropWidth * cropHeight * 4);
    for (let i = 0; i < cropWidth * cropHeight; i++) {
        const outIdx = i * 4;
        const a = Math.round(dilatedMask[i] * 255);
        outBuffer[outIdx] = 22;      // R #16
        outBuffer[outIdx + 1] = 34;  // G #22
        outBuffer[outIdx + 2] = 24;  // B #18
        outBuffer[outIdx + 3] = a;
    }

    await sharp(outBuffer, {
        raw: { width: cropWidth, height: cropHeight, channels: 4 }
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(darkEmblemPath);

    console.log(`Saved dark studio emblem to ${darkEmblemPath}`);

    // 2. Generate user_leaves_branch_dark.png from user_leaves_branch.png
    const branchMeta = await sharp("public/user_leaves_branch.png").metadata();
    const branchRaw = await sharp("public/user_leaves_branch.png").raw().toBuffer({ resolveWithObject: true });
    const bW = branchRaw.info.width;
    const bH = branchRaw.info.height;
    const bChannels = branchRaw.info.channels;
    const bData = branchRaw.data;

    const darkBranchBuf = Buffer.alloc(bW * bH * 4);
    for (let i = 0; i < bW * bH; i++) {
        const inIdx = i * bChannels;
        const outIdx = i * 4;
        let alpha = 0;
        if (bChannels === 4) {
            alpha = bData[inIdx + 3];
        } else {
            // grayscale / RGB
            alpha = bData[inIdx]; // brightness as alpha
        }

        // Color with deep forest green / ink: R=28, G=42, B=30
        darkBranchBuf[outIdx] = 28;
        darkBranchBuf[outIdx + 1] = 42;
        darkBranchBuf[outIdx + 2] = 30;
        darkBranchBuf[outIdx + 3] = alpha;
    }

    await sharp(darkBranchBuf, {
        raw: { width: bW, height: bH, channels: 4 }
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile("public/user_leaves_branch_dark.png");

    console.log(`Saved dark botanical branch to public/user_leaves_branch_dark.png (${bW}x${bH})`);
}

generateDarkAssets().catch(console.error);
