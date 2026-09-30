/** Only an actual app deployment should produce an update prompt. */
export async function checkPWAAppVersion(currentVersion: string, fetchVersion = fetch): Promise<boolean> {
    if (!currentVersion || currentVersion === "unknown") return false;
    const response = await fetchVersion("/api/app-version", { cache: "no-store" });
    if (!response.ok) return false;
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("version" in data)) return false;
    const version = data.version;
    return typeof version === "string" && version.length > 0 && version !== "unknown" && version !== currentVersion;
}
