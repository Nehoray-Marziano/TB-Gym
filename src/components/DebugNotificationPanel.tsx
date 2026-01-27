"use client";

import { useState, useEffect } from "react";
import { Bell, RefreshCw, Send, Trash2 } from "lucide-react";

declare global {
    interface Window {
        OneSignal?: any;
        OneSignalDeferred?: Array<(OneSignal: any) => void>;
    }
}

export default function DebugNotificationPanel() {
    const [status, setStatus] = useState<any>({
        permission: "loading...",
        subscriptionId: "loading...",
        isOptedIn: "loading...",
        userId: "loading...",
        externalId: "finding..."
    });
    const [isVisible, setIsVisible] = useState(false);

    const checkStatus = async () => {
        if (typeof window === "undefined") return;

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal: any) {
            const permission = OneSignal.Notifications.permission;
            const subId = OneSignal.User.PushSubscription.id;
            const optedIn = OneSignal.User.PushSubscription.optedIn;
            const externalId = OneSignal.User.externalId;

            // Get internal OneSignal ID if possible
            const onesignalId = await OneSignal.User.getOnesignalId();

            setStatus({
                permission: permission ? permission.toString() : "undefined",
                subscriptionId: subId || "null",
                isOptedIn: optedIn ? "true" : "false",
                userId: onesignalId || "null",
                externalId: externalId || "null"
            });
        });
    };

    useEffect(() => {
        const interval = setInterval(checkStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleRequestPermission = async () => {
        if (window.OneSignal) {
            await window.OneSignal.Notifications.requestPermission();
            checkStatus();
        }
    };

    const handleClearCooldown = () => {
        localStorage.removeItem("talia_notification_cooldown_timestamp");
        alert("Cooldown cleared! Refresh to see the modal again.");
    };

    const handleSelfTest = async () => {
        // Simple client-side test if supported, or alert
        alert("To test: Go to Admin, grant tickets to YOURSELF. You should see a notification.");
    };

    if (process.env.NODE_ENV !== "development") return null;

    return (
        <div className="fixed bottom-4 left-4 z-[9999]">
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="bg-red-600 text-white p-2 rounded-full shadow-lg text-xs font-bold"
            >
                {isVisible ? "Hide Debug" : "Debug Push"}
            </button>

            {isVisible && (
                <div className="bg-black/90 text-white p-4 rounded-xl border border-white/20 mt-2 w-80 text-xs font-mono shadow-2xl">
                    <h3 className="font-bold text-[#E2F163] mb-2 flex justify-between">
                        OneSignal Debug
                        <button onClick={checkStatus}><RefreshCw className="w-3 h-3" /></button>
                    </h3>

                    <div className="space-y-1 mb-4">
                        <div className="flex justify-between">
                            <span className="text-white/50">Permission:</span>
                            <span className={status.permission === 'granted' ? 'text-green-400' : 'text-red-400'}>
                                {status.permission}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/50">Subscribed:</span>
                            <span className={status.isOptedIn === 'true' ? 'text-green-400' : 'text-red-400'}>
                                {status.isOptedIn}
                            </span>
                        </div>
                        <div className="flex justify-between flex-col">
                            <span className="text-white/50">Push ID:</span>
                            <span className="text-[10px] break-all text-blue-400">{status.subscriptionId}</span>
                        </div>
                        <div className="flex justify-between flex-col">
                            <span className="text-white/50">External ID (DB User ID):</span>
                            <span className="text-[10px] break-all text-yellow-400">{status.externalId}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleRequestPermission} className="bg-white/10 hover:bg-white/20 p-2 rounded flex items-center justify-center gap-1">
                            <Bell className="w-3 h-3" /> Req Perm
                        </button>
                        <button onClick={handleClearCooldown} className="bg-white/10 hover:bg-white/20 p-2 rounded flex items-center justify-center gap-1">
                            <Trash2 className="w-3 h-3" /> Clr Cool
                        </button>
                    </div>
                    <p className="mt-2 text-[10px] text-white/30 text-center">
                        Is "External ID" matching your DB User ID?
                    </p>
                </div>
            )}
        </div>
    );
}
