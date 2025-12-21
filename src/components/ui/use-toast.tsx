"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
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
            <div className="fixed bottom-0 left-0 p-6 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
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
        success: "bg-[#E2F163] text-black border-[#E2F163]",
        error: "bg-red-500 text-white border-red-500",
        info: "bg-neutral-800 text-white border-white/10"
    }

    const icons = {
        success: Check,
        error: AlertCircle,
        info: Info
    }

    const Icon = icons[toast.type]

    return (
        <div className={`${bgColors[toast.type]} border p-4 rounded-2xl shadow-2xl flex items-start gap-4 relative overflow-hidden`}>
            <div className="mt-1">
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-sm">{toast.title}</h3>
                {toast.description && <p className="text-xs opacity-90 mt-1">{toast.description}</p>}
            </div>
            <button onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
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
