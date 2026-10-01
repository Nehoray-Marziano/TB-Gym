import sharp from "sharp";
import path from "path";
import fs from "fs";

async function processBranch() {
    const inputPath = "C:/Users/U6071035/.gemini/antigravity/brain/672d7f39-fa4f-41ce-bdf0-e103627cedbc/.user_uploaded/media_1790841462951.png";
    const outputPath = "C:/Users/U6071035/OneDrive - Clarivate Analytics/Desktop/Talia/TB-Gym/public/user_leaves_branch.png";

    const image = sharp(inputPath);
    const { width, height } = await image.metadata();
    const rawBuffer = await image.raw().toBuffer();

    // Create RGBA buffer where black lines become opaque white, and white background becomes transparent
    const outputBuffer = Buffer.alloc(width * height * 4);

    let minX = width, maxX = 0, minY = height, maxY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = rawBuffer[idx];
            const g = rawBuffer[idx + 1];
            const b = rawBuffer[idx + 2];

            // Calculate luminance
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;

            // Threshold: smooth anti-aliasing between luma 180 and 245
            let alpha = 0;
            if (luma < 240) {
                alpha = Math.min(255, Math.round(((240 - luma) / 180) * 255));
            }

            if (alpha > 20) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }

            // RGBA: white color with calculated alpha mask
            outputBuffer[idx] = 255;
            outputBuffer[idx + 1] = 255;
            outputBuffer[idx + 2] = 255;
            outputBuffer[idx + 3] = alpha;
        }
    }

    console.log(`Bounding box: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);

    // Add 10px margin around bounding box
    const pad = 12;
    const cropLeft = Math.max(0, minX - pad);
    const cropTop = Math.max(0, minY - pad);
    const cropWidth = Math.min(width - cropLeft, (maxX - minX) + pad * 2);
    const cropHeight = Math.min(height - cropTop, (maxY - minY) + pad * 2);

    await sharp(outputBuffer, {
        raw: { width, height, channels: 4 }
    })
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toFile(outputPath);

    console.log(`Saved transparent branch asset to ${outputPath} (${cropWidth}x${cropHeight})`);
}

processBranch().catch(console.error);
