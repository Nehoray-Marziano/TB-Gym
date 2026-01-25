"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Show splash screen for 2.5 seconds to cover the initial load
        // This gives the "Opening Icon" effect the user wants
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 2200);

        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100] bg-[#0A0A0A] flex items-center justify-center pointer-events-none"
                    style={{ touchAction: "none" }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: "spring",
                            damping: 20,
                            stiffness: 100,
                            delay: 0.1
                        }}
                    >
                        <div className="w-48 h-48 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                            <img
                                src="/icon.jpg"
                                alt="Shared Vision"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
