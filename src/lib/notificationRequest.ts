// Notification failure must never roll back an already committed booking or credit update.
// Callers report delivery failure separately; retries remain explicit.
export async function sendNotificationRequest(path: string, options: RequestInit): Promise<Response> {
    const response = await fetch(path, { ...options, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Notification failed: ${response.status}`);
    const result = await response.clone().json();
    if (result.success !== true) throw new Error("Notification was not accepted");
    return response;
}
