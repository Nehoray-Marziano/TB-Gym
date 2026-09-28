import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ONESIGNAL_APP_ID = "2e5776b6-3487-4a5d-bca0-04570c82d150";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

interface NotificationPayload {
    title: string;
    message: string;
    targetRole?: string; // e.g., "administrator"
    targetUserIds?: string[]; // Array of UUIDs
    url?: string;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: NotificationPayload = await request.json();
        const { title, message, targetRole, targetUserIds, url } = body;
        if (typeof title !== "string" || !title.trim() || title.length > 120 ||
            typeof message !== "string" || !message.trim() || message.length > 1000 ||
            (targetRole && !["administrator", "trainee"].includes(targetRole)) ||
            (targetUserIds && (!Array.isArray(targetUserIds) || targetUserIds.length > 100 ||
                targetUserIds.some(id => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)))) ||
            (url && (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")))) {
            return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
        }

        if (targetUserIds?.length || targetRole === "trainee") {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            if (profile?.role !== "administrator") {
                return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
            }
        }

        if (!ONESIGNAL_REST_API_KEY) {
            console.error("ONESIGNAL_REST_API_KEY not set");
            return NextResponse.json({ error: "Notification service not configured" }, { status: 500 });
        }

        const notificationPayload: any = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title, he: title },
            contents: { en: message, he: message },
        };

        // Determine targeting strategy
        if (targetUserIds && targetUserIds.length > 0) {
            // Target specific users by their External ID (which is their Supabase UUID)
            notificationPayload.include_aliases = {
                external_id: targetUserIds
            };
            notificationPayload.target_channel = "push";
        } else if (targetRole) {
            // Target by Role Tag
            notificationPayload.filters = [
                { field: "tag", key: "role", relation: "=", value: targetRole }
            ];
        } else {
            // Fallback: Notify Admins if nothing specified
            notificationPayload.filters = [
                { field: "tag", key: "role", relation: "=", value: "administrator" }
            ];
        }

        if (url) {
            notificationPayload.url = new URL(url, request.url).toString();
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
        // Result typically contains { id: '...', recipients: N }
        return NextResponse.json({
            success: true,
            id: result.id,
            recipients: result.recipients || 0
        });

    } catch (error: any) {
        console.error("Notification API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
