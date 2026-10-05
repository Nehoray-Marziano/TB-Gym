// Retain unresolved intent across retries and reloads in this tab. Different
// payloads and actions after acknowledged success receive new request IDs.
// Store a hash, never the form's member IDs, description, or ticket quantity.
const pending = new Map<string, { fingerprint: string; requestId: string }>();

export async function getAdminMutationRequestId(action: string, actorId: string, payload: object) {
    const key = `tb-gym:admin-mutation:${actorId}:${action}`;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    let previous = pending.get(key);
    try {
        const stored = sessionStorage.getItem(key);
        if (stored) previous = JSON.parse(stored);
    } catch { /* In-memory retry protection still works if storage is blocked. */ }
    if (previous?.fingerprint === fingerprint && typeof previous.requestId === "string"
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previous.requestId)) return previous.requestId;
    const intent = { fingerprint, requestId: crypto.randomUUID() };
    pending.set(key, intent);
    try { sessionStorage.setItem(key, JSON.stringify(intent)); } catch { /* Storage may be disabled. */ }
    return intent.requestId;
}

export function completeAdminMutationIntent(action: string, actorId: string, requestId: string) {
    const key = `tb-gym:admin-mutation:${actorId}:${action}`;
    if (pending.get(key)?.requestId === requestId) pending.delete(key);
    try {
        const stored = sessionStorage.getItem(key);
        if (stored && JSON.parse(stored).requestId === requestId) sessionStorage.removeItem(key);
    } catch { /* Nothing to clear when storage is unavailable. */ }
}
