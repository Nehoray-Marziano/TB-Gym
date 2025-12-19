"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Profile = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    role: string;
};

type UserCredit = {
    user_id: string;
    balance: number;
};

type Trainee = Profile & {
    balance: number;
};

export default function TraineesPage() {
    const supabase = createClient();
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
    const [creditChange, setCreditChange] = useState(0); // How much to add/remove

    useEffect(() => {
        fetchTrainees();
    }, []);

    const fetchTrainees = async () => {
        setLoading(true);
        // 1. Fetch Profiles
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("*")
        // .neq("role", "administrator"); // Valid to show admins too, they might workout!

        if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
            alert("שגיאה בטעינת משתמשים: " + profilesError.message);
            setLoading(false);
            return;
        }

        // 2. Fetch Credits
        const { data: credits, error: creditsError } = await supabase
            .from("user_credits")
            .select("*");

        if (creditsError) {
            console.error("Error fetching credits:", creditsError);
            // Don't fail completely, just show 0
        }

        // 3. Merge
        const merged = profiles.map(profile => {
            const credit = credits?.find(c => c.user_id === profile.id);
            const balanceVal = credit ? credit.balance : 0;
            return {
                ...profile,
                balance: isNaN(balanceVal) ? 0 : balanceVal
            };
        });

        // Filter out those without names if you want, or just show email
        setTrainees(merged);
        setLoading(false);
    };

    const handleUpdateCredits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTrainee) return;

        const newBalance = selectedTrainee.balance + creditChange;

        try {
            // Upsert mechanism to handle if row doesn't exist (though it should from triggers)
            const { error } = await supabase
                .from("user_credits")
                .upsert({
                    user_id: selectedTrainee.id,
                    balance: newBalance
                });

            if (error) throw error;

            alert("היתרה עודכנה בהצלחה! 💰");
            setSelectedTrainee(null);
            setCreditChange(0);
            fetchTrainees(); // Refresh list

        } catch (err: any) {
            console.error("Error updating credits:", err);
            alert("שגיאה בעדכון: " + err.message);
        }
    };

    const filteredTrainees = trainees.filter(t => {
        const full = `${t.first_name || ""} ${t.last_name || ""} ${t.email || ""}`.toLowerCase();
        return full.includes(searchQuery.toLowerCase());
    });

    return (
        <div className="pb-20">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">ניהול מתאמנות</h1>
                    <p className="text-neutral-400 text-sm">צפייה וניהול יתרת אימונים</p>
                </div>
                {/* Search Bar */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="חיפוש מתאמנת..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 pl-10 text-white focus:outline-none focus:border-primary w-64"
                    />
                    <span className="absolute left-3 top-2.5 text-neutral-500">🔍</span>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center mt-20 text-primary">טוען נתונים...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-neutral-900 text-neutral-400 font-medium border-b border-neutral-800">
                                <tr>
                                    <th className="p-5">שם מלא</th>
                                    <th className="p-5">אימייל</th>
                                    <th className="p-5">יתרה נוכחית</th>
                                    <th className="p-5">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {filteredTrainees.map((trainee) => (
                                    <tr key={trainee.id} className="hover:bg-neutral-800/50 transition-colors group">
                                        <td className="p-5 font-bold text-white">
                                            {trainee.first_name} {trainee.last_name}
                                            {trainee.role === 'administrator' && <span className="mr-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">מנהלת</span>}
                                        </td>
                                        <td className="p-5 text-neutral-400">{trainee.email}</td>
                                        <td className="p-5">
                                            <span className={`font-mono font-bold text-lg ${trainee.balance > 0 ? "text-green-400" : "text-red-400"}`}>
                                                {trainee.balance}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <button
                                                onClick={() => {
                                                    setSelectedTrainee(trainee);
                                                    setCreditChange(0);
                                                }}
                                                className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm transition-colors"
                                            >
                                                ניהול יתרה ✏️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredTrainees.length === 0 && (
                            <div className="p-10 text-center text-neutral-500">
                                לא נמצאו מתאמנות תואמות לחיפוש
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manage Credits Modal */}
            <AnimatePresence>
                {selectedTrainee && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedTrainee(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 50, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 50, opacity: 0 }}
                            className="bg-[#131512] border border-neutral-700/50 p-8 rounded-[2rem] w-full max-w-sm relative z-10 shadow-2xl"
                        >
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-white mb-2">עדכון יתרה</h2>
                                <p className="text-neutral-400">
                                    עבור {selectedTrainee.first_name} {selectedTrainee.last_name}
                                </p>
                            </div>

                            <div className="bg-neutral-900 rounded-2xl p-6 mb-6 text-center border border-neutral-800">
                                <span className="text-sm text-neutral-500 block mb-1">יתרה נוכחית</span>
                                <span className="text-4xl font-bold text-white">{selectedTrainee.balance}</span>

                                <div className="flex items-center justify-center gap-2 mt-2 text-neutral-400">
                                    <span>➡️</span>
                                    <span className={`font-bold ${creditChange > 0 ? "text-green-400" : creditChange < 0 ? "text-red-400" : "text-white"}`}>
                                        {selectedTrainee.balance + creditChange}
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateCredits}>
                                <div className="flex items-center justify-center gap-4 mb-8">
                                    <button
                                        type="button"
                                        onClick={() => setCreditChange(prev => prev - 1)}
                                        className="w-14 h-14 bg-red-500/20 text-red-500 rounded-2xl text-2xl hover:bg-red-500/30 transition-colors"
                                    >
                                        -
                                    </button>
                                    <div className="w-20 text-center">
                                        <span className={`text-2xl font-bold ${creditChange > 0 ? "text-green-500" : creditChange < 0 ? "text-red-500" : "text-neutral-500"}`}>
                                            {creditChange > 0 ? "+" : ""}{creditChange}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCreditChange(prev => prev + 1)}
                                        className="w-14 h-14 bg-green-500/20 text-green-500 rounded-2xl text-2xl hover:bg-green-500/30 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-[#8B9A76] transition-colors"
                                    >
                                        שמירת שינויים
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTrainee(null)}
                                        className="w-full py-4 bg-transparent text-neutral-500 hover:text-white transition-colors"
                                    >
                                        ביטול
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
