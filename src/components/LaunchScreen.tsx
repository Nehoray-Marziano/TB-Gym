import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LAUNCH_BACKGROUND, LAUNCH_INK, LAUNCH_MARK_RATIO, LAUNCH_MARK_TOP } from "@/lib/pwa-launch.mjs";

// Trusted repository artwork, embedded in the server response. No image request,
// client bundle, font, or stylesheet is needed to continue the native splash.
const source = readFileSync(join(process.cwd(), "public", "initials_logo.svg"), "utf8");
const artwork = source.slice(source.indexOf(">") + 1, source.lastIndexOf("</svg>"))
    .replaceAll('fill="#000000"', `fill="${LAUNCH_INK}"`);

export default function LaunchScreen() {
    return (
        <div
            data-studio-launch=""
            role="status"
            aria-label="טוענים את סטודיו טליה"
            style={{ position: "fixed", inset: 0, background: LAUNCH_BACKGROUND, overflow: "hidden", zIndex: 80 }}
        >
            <svg
                aria-hidden="true"
                viewBox="0 0 1024 1024"
                style={{
                    position: "absolute", left: "50%",
                    top: `var(--studio-launch-mark-top, ${LAUNCH_MARK_TOP * 100}svh)`,
                    width: `var(--studio-launch-mark-size, ${LAUNCH_MARK_RATIO * 100}svmin)`,
                    height: `var(--studio-launch-mark-size, ${LAUNCH_MARK_RATIO * 100}svmin)`,
                    transform: "translate(-50%, -50%)",
                }}
                dangerouslySetInnerHTML={{ __html: artwork }}
            />
        </div>
    );
}
