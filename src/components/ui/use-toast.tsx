"use client"

import * as React from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { X, Check, AlertCircle, Info } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface Toast {
    id: string
    title: string
    description?: string
    type: ToastType
}

interface ToastContextType {
    toast: (props: Omit<Toast, "id">) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([])
    const reduceMotion = useReducedMotion()

    const toast = React.useCallback(({ title, description, type }: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts((prev) => [...prev, { id, title, description, type }])

        // Auto dismiss
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-lg flex-col gap-2 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            layout={!reduceMotion}
                            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: reduceMotion ? 0 : 12, transition: { duration: 0.2 } }}
                            className="pointer-events-auto"
                        >
                            <ToastItem toast={t} onDismiss={() => removeToast(t.id)} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const bgColors = {
        success: "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)] border-[#dce780]",
        error: "bg-[var(--studio-danger)] text-white border-[var(--studio-danger)]",
        info: "bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)] border-[#162218]"
    }

    const icons = {
        success: Check,
        error: AlertCircle,
        info: Info
    }

    const Icon = icons[toast.type]

    return (
        <div role="status" className={`${bgColors[toast.type]} relative flex items-start gap-3 overflow-hidden rounded-[1.5rem] border p-4 shadow-2xl`}>
            <div className="mt-1">
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-sm">{toast.title}</h3>
                {toast.description && <p className="text-xs opacity-90 mt-1">{toast.description}</p>}
            </div>
            <button type="button" onClick={onDismiss} aria-label="סגירה" className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity active:opacity-100">
                <X aria-hidden="true" className="h-4 w-4" />
            </button>
        </div>
    )
}

export function useToast() {
    const context = React.useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return context
}
