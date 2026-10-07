"use client";

import { useRef, useState } from "react";
import { sendNotificationRequest } from "@/lib/notificationRequest";
import { X } from "lucide-react";
import { StudioModal } from "@/components/ui/StudioModal";
import { AdminBusyLabel, AdminError } from "@/components/admin/AdminFeedback";
import { CopyableInput } from "@/components/ui/copyable-field";
import { useToast } from "@/components/ui/use-toast";
import { AnimatePresence } from "framer-motion";

interface QuickBroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PRESETS = [
    {
        label: "לוח עודכן",
        title: "לוח האימונים התעדכן 🗓️",
        message: "האימונים לשבוע הקרוב כבר בלוח. בואי לתפוס לך מקום!",
    },
    {
        label: "מקום שהתפנה",
        title: "התפנה מקום באימון! ⚡",
        message: "התפנה מקום באימון הקרוב. הכנסי לאפליקציה ושרייני עכשיו.",
    },
    {
        label: "תזכורת הגעה",
        title: "תזכורת מהסטודיו 🧘",
        message: "מחכות לך בסטודיו! נא להגיע 5 דקות לפני תחילת האימון עם בקבוק מים ומגבת.",
    },
];

export default function QuickBroadcastModal({ isOpen, onClose }: QuickBroadcastModalProps) {
    return (
        <AnimatePresence>
            {isOpen && <QuickBroadcastSheet onClose={onClose} />}
        </AnimatePresence>
    );
}

function QuickBroadcastSheet({ onClose }: { onClose: () => void }) {
    const { toast } = useToast();
    const [title, setTitle] = useState(PRESETS[0].title);
    const [message, setMessage] = useState(PRESETS[0].message);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sendLock = useRef(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim() || isSending || sendLock.current) return;
        sendLock.current = true;
        setIsSending(true);
        setError(null);

        try {
            const res = await sendNotificationRequest("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    message: message.trim(),
                    targetRole: "trainee",
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }

            toast({ title: "ההתראה נשלחה לכל המתאמנות!", type: "success" });
            onClose();
        } catch (err) {
            console.error(err);
            setError("לא הצלחנו לשלוח את ההודעה כרגע. נסי שוב בעוד רגע.");
        } finally {
            sendLock.current = false;
            setIsSending(false);
        }
    };

    return (
        <StudioModal
            variant="admin"
            titleId="broadcast-title"
            descriptionId="broadcast-desc"
            busy={isSending}
            onClose={onClose}
            actions={
                <button
                    type="submit"
                    form="broadcast-form"
                    disabled={isSending || !title.trim() || !message.trim()}
                    className="studio-admin-action w-full"
                    aria-busy={isSending}
                >
                    <AdminBusyLabel busy={isSending} idle="שידור לכל המתאמנות" pending="שולחים התראה..." />
                </button>
            }
            header={
                <>
                    <button
                        type="button"
                        data-modal-cancel
                        disabled={isSending}
                        onClick={onClose}
                        aria-label="סגירת שידור הודעה"
                        className="studio-admin-modal-close"
                    >
                        <X aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <div className="studio-admin-modal-heading">
                        <p id="broadcast-desc" className="text-xs font-bold text-[var(--studio-subtle)]">
                            הודעת Push לטלפונים
                        </p>
                        <h2 id="broadcast-title" className="mt-1.5 text-[1.8rem] font-bold leading-tight">
                            שידור למתאמנות.
                        </h2>
                    </div>
                </>
            }
        >
            <form id="broadcast-form" noValidate onSubmit={handleSend} className="space-y-4">
                {/* Presets */}
                <div>
                    <span className="mb-2 block text-xs font-bold text-[var(--studio-ink)]">
                        תבניות מהירות
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                    setTitle(preset.title);
                                    setMessage(preset.message);
                                }}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                                    title === preset.title
                                        ? "border-[var(--studio-brand)] bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]"
                                        : "border-[#1b251c]/15 bg-[var(--studio-card)] text-[var(--studio-ink)] hover:bg-[#dfe4d0]"
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                    <label htmlFor="broadcast-title-input" className="block text-xs font-bold text-[var(--studio-ink)]">
                        כותרת ההתראה
                    </label>
                    <CopyableInput
                        id="broadcast-title-input"
                        copyLabel="העתקת כותרת"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="כותרת קצרה ומזמינה"
                        required
                        maxLength={120}
                        className="min-h-12 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-sm font-bold outline-none"
                    />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                    <label htmlFor="broadcast-message-input" className="block text-xs font-bold text-[var(--studio-ink)]">
                        תוכן ההודעה
                    </label>
                    <textarea
                        id="broadcast-message-input"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="כתבי כאן את פרטי ההודעה..."
                        required
                        maxLength={1000}
                        className="w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] p-3.5 text-sm font-medium outline-none resize-none focus:border-[var(--studio-accent-text)]"
                    />
                </div>

                {error && <AdminError message={error} />}
            </form>
        </StudioModal>
    );
}
