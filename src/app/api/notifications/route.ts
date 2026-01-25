import { NextRequest, NextResponse } from "next/server";

const ONESIGNAL_APP_ID = "2e5776b6-3487-4a5d-bca0-04570c82d150";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

interface NotificationPayload {
    title: string;
    message: string;
    targetRole?: string; // e.g., "administrator"
    url?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: NotificationPayload = await request.json();
        const { title, message, targetRole = "administrator", url } = body;

        if (!ONESIGNAL_REST_API_KEY) {
            console.error("ONESIGNAL_REST_API_KEY not set");
            return NextResponse.json({ error: "Notification service not configured" }, { status: 500 });
        }

        const notificationPayload: any = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title, he: title },
            contents: { en: message, he: message },
            // Target users by tag
            filters: [
                { field: "tag", key: "role", relation: "=", value: targetRole }
            ],
        };

        if (url) {
            notificationPayload.url = url;
        }

        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(notificationPayload),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("OneSignal error:", result);
            return NextResponse.json({ error: "Failed to send notification", details: result }, { status: 500 });
        }

        console.log("Notification sent:", result);
        return NextResponse.json({ success: true, id: result.id });

    } catch (error: any) {
        console.error("Notification API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
