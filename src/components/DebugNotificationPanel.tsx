"use client";

import { useState, useEffect } from "react";
import { Bell, RefreshCw, Send, Trash2, Power } from "lucide-react";

declare global {
    interface Window {
        OneSignal?: any;
        OneSignalDeferred?: Array<(OneSignal: any) => void>;
    }
}

export default function DebugNotificationPanel() {
    const [heartbeat, setHeartbeat] = useState(0);
    const [domStatus, setDomStatus] = useState("Init...");

    // Split status into 'raw' (immediate) and 'sdk' (async)
    const [sdkState, setSdkState] = useState({
        permission: "---",
        subId: "---",
        optedIn: "---",
        extId: "---"
    });

    const checkStatus = () => {
        setHeartbeat(h => h + 1);

        // 1. Immediate DOM Check
        if (typeof window === "undefined") return;

        const scriptTag = document.querySelector('script[src*="OneSignalSDK.page.js"]');
        const hasWindow = !!window.OneSignal;
        const hasDeferred = !!window.OneSignalDeferred;

        const statusStr = `Script: ${scriptTag ? "YES" : "NO"} | Win: ${hasWindow ? "YES" : "NO"} | Def: ${hasDeferred ? "YES" : "NO"}`;
        setDomStatus(statusStr);

        // 2. If Window Object exists, read directly (bypass queue for debug speed)
        if (window.OneSignal && window.OneSignal.User) {
            try {
                const p = window.OneSignal.Notifications.permission;
                const s = window.OneSignal.User.PushSubscription.id;
                const o = window.OneSignal.User.PushSubscription.optedIn;
                const e = window.OneSignal.User.externalId;

                setSdkState({
                    permission: p ? p.toString() : "falsy",
                    subId: s || "null",
                    optedIn: o ? "true" : "false",
                    extId: e || "null"
                });
            } catch (err) {
                console.error(err);
            }
        }
    };

    // Poll every 1s
    useEffect(() => {
        const timer = setInterval(checkStatus, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleForceInit = () => {
        // Manual injection attempt
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);
        alert("Injected script manually. Wait 5s and check status.");
    };

    const handleReqPerm = async () => {
        if (window.OneSignal) {
            await window.OneSignal.Notifications.requestPermission();
        } else {
            alert("OneSignal not ready");
        }
    };

    return (
        <div className="fixed top-24 left-4 z-[99999] pointer-events-auto">
            <div className="bg-black/90 text-white p-3 rounded-xl border border-white/20 shadow-2xl w-72 text-xs font-mono">

                {/* Header */}
                <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
                    <span className="font-bold text-[#E2F163]">OneSignal Probe</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/40">{heartbeat}</span>
                        <button onClick={checkStatus}><RefreshCw className="w-3 h-3" /></button>
                    </div>
                </div>

                {/* DOM Status (Immediate) */}
                <div className="mb-3 bg-white/5 p-2 rounded">
                    <div className="text-[9px] text-white/50 mb-1">DOM / GLOBAL STATUS</div>
                    <div className="font-bold text-cyan-300 break-words leading-tight">
                        {domStatus}
                    </div>
                </div>

                {/* SDK Values */}
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-white/50">Perm:</span>
                        <span className={sdkState.permission === 'granted' ? "text-green-400" : "text-red-400"}>
                            {sdkState.permission}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/50">Subscribed:</span>
                        <span className={sdkState.optedIn === 'true' ? "text-green-400" : "text-red-400"}>
                            {sdkState.optedIn}
                        </span>
                    </div>
                    <div className="flex justify-between flex-col">
                        <span className="text-white/50">Push ID:</span>
                        <span className="text-[10px] text-blue-300 break-all">{sdkState.subId}</span>
                    </div>
                    <div className="flex justify-between flex-col bg-yellow-900/20 p-1 rounded border border-yellow-500/20 mt-1">
                        <span className="text-yellow-500 font-bold">External ID:</span>
                        <span className="text-[10px] text-yellow-200 break-all">
                            {sdkState.extId}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                    <button onClick={handleReqPerm} className="bg-white/10 hover:bg-white/20 py-2 rounded flex justify-center items-center gap-1">
                        <Bell className="w-3 h-3" /> Grant
                    </button>
                    <button onClick={handleForceInit} className="bg-red-500/20 hover:bg-red-500/40 text-red-300 py-2 rounded flex justify-center items-center gap-1">
                        <Power className="w-3 h-3" /> Force Load
                    </button>
                </div>

            </div>
        </div>
    );
}
