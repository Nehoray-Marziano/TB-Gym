"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, User, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Profile = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
};

type UserCredit = {
    balance: number;
};

type Trainee = Profile & {
    credits: UserCredit | null;
};

export default function AdminTraineesPage() {
    const supabase = createClient();
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [editingCredit, setEditingCredit] = useState<{ userId: string; balance: number } | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchTrainees();
    }, []);

    const fetchTrainees = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("No user logged in");
            return;
        }

        setCurrentUserId(user.id);

        // Debug: Check my own role
        const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        console.log("My Role:", myProfile?.role);
        if (myProfile?.role !== 'administrator') {
            // Show visible warning
            const debugDiv = document.createElement('div');
            debugDiv.style.cssText = "position:fixed;top:100px;left:20px;background:red;color:white;padding:20px;z-index:9999;font-weight:bold;font-size:20px;";
            debugDiv.innerText = "WARNING: YOU ARE NOT DETECTED AS 'administrator'. Your role is: " + (myProfile?.role || 'null');
            document.body.appendChild(debugDiv);
        }

        const { data: profiles, error } = await supabase
            .from("profiles")
            .select(`
                *,
                credits:user_credits(balance)
            `)
            .order("full_name", { ascending: true });

        if (error) {
            console.error(error);
            toast({ title: "שגיאה בטעינה", description: error.message, type: "error" });
        } else {
            const formatted = profiles.map((p: any) => ({
                ...p,
                credits: Array.isArray(p.credits) ? (p.credits[0] || { balance: 0 }) : (p.credits || { balance: 0 }),
            }));
            setTrainees(formatted);
        }
        setLoading(false);
    };

    const handleUpdateBalance = async (userId: string, newBalance: number) => {
        try {
            const { error } = await supabase
                .from("user_credits")
                .upsert({ user_id: userId, balance: newBalance });

            if (error) throw error;

            setTrainees(prev => prev.map(t =>
                t.id === userId ? { ...t, credits: { balance: newBalance } } : t
            ));
            setEditingCredit(null);
            toast({ title: "היתרה עודכנה", type: "success" });
        } catch (err: any) {
            toast({ title: "שגיאה בעדכון יתרה", type: "error" });
        }
    };

    const filteredTrainees = trainees.filter(t =>
        (t.full_name && t.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.phone && t.phone.includes(searchTerm))
    );

    return (
        <div className="pb-20 font-sans text-neutral-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">ניהול מתאמנות</h1>
                    <p className="text-neutral-400 font-medium">{trainees.length} מתאמנות רשומות במערכת</p>
                </div>

                {/* Glass Search Bar */}
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-neutral-500 group-focus-within:text-[#E2F163] transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="חיפוש לפי שם, אימייל או טלפון..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E2F163]/50 focus:bg-neutral-900 transition-all shadow-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center mt-20">
                    <div className="w-10 h-10 border-4 border-[#E2F163] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredTrainees.map((trainee, i) => (
                        <motion.div
                            key={trainee.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-neutral-900/40 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-neutral-900/60 hover:border-white/10 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform border ${trainee.id === currentUserId ? "bg-[#E2F163] text-black border-[#E2F163]" : "bg-neutral-800 text-white border-white/5 bg-gradient-to-br from-neutral-800 to-neutral-900"}`}>
                                    {trainee.full_name ? trainee.full_name[0] : <User className="w-6 h-6 opacity-50" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-lg font-bold mb-1 transition-colors ${trainee.id === currentUserId ? "text-[#E2F163]" : "text-white group-hover:text-[#E2F163]"}`}>
                                            {trainee.full_name || "ללא שם"}
                                        </h3>
                                        {trainee.id === currentUserId && (
                                            <span className="bg-[#E2F163]/20 text-[#E2F163] text-[10px] px-2 py-0.5 rounded-full font-bold border border-[#E2F163]/30">
                                                את
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-neutral-500 font-medium">
                                        <span>{trainee.phone}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span>{trainee.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/5">
                                <div className="px-4 text-right">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest block mb-1">יתרה</span>
                                    {editingCredit?.userId === trainee.id ? (
                                        <input
                                            type="number"
                                            autoFocus
                                            className="w-16 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-center text-white font-bold focus:outline-none focus:border-[#E2F163]"
                                            value={editingCredit.balance}
                                            onChange={(e) => setEditingCredit({ ...editingCredit, balance: parseInt(e.target.value) || 0 })}
                                            onBlur={() => handleUpdateBalance(trainee.id, editingCredit.balance)}
                                            onKeyDown={(e) => e.key === "Enter" && handleUpdateBalance(trainee.id, editingCredit.balance)}
                                        />
                                    ) : (
                                        <span
                                            onClick={() => setEditingCredit({ userId: trainee.id, balance: trainee.credits?.balance || 0 })}
                                            className="text-xl font-bold text-white hover:text-[#E2F163] cursor-pointer"
                                        >
                                            {trainee.credits?.balance || 0}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleUpdateBalance(trainee.id, (trainee.credits?.balance || 0) + 1)}
                                    className="w-10 h-10 bg-[#E2F163] text-black rounded-xl hover:bg-[#d4e450] flex items-center justify-center transition-colors shadow-lg shadow-[#E2F163]/20"
                                >
                                    <CreditCard className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    {filteredTrainees.length === 0 && (
                        <div className="text-center py-20 text-neutral-500">
                            לא נמצאו מתאמנות תואמות לחיפוש 🔍
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
