
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userId, amount } = await req.json();

        if (!userId || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const apiKey = process.env.ONESIGNAL_REST_API_KEY;
        const appId = "2e5776b6-3487-4a5d-bca0-04570c82d150";

        if (!apiKey) {
            console.error("ONESIGNAL_REST_API_KEY is not defined");
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const message = amount > 0
            ? `הופקדו ${amount} כרטיסים חדשים בחשבונך! 🎉`
            : `יתרת הכרטיסים שלך עודכנה.`;

        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${apiKey}`
            },
            body: JSON.stringify({
                app_id: appId,
                include_aliases: {
                    external_id: [userId]
                },
                target_channel: "push",
                headings: { en: "עדכון יתרה", he: "עדכון יתרה" },
                contents: { en: message, he: message },
                // High Priority for Heads-up Notification
                priority: 10,
                // Android: Use the URGENT channel created in OneSignal Dashboard
                android_channel_id: "4f8844c7-685b-40b0-ae58-48aa9d7c7530",
                channel_for_external_user_ids: "push",
            })
        });

        const data = await response.json();

        console.log("[Notification API] OneSignal Response:", JSON.stringify(data, null, 2));

        if (data.errors) {
            console.error("[Notification API] OneSignal Error:", data.errors);
            // If the error is "All included players are not subscribed", it means the userId is not found or unsubscribed.
            return NextResponse.json({ error: data.errors }, { status: 400 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("Notification API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
