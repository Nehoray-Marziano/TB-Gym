import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (!userId) redirect("/auth/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    if (profile?.role !== "administrator") redirect("/dashboard");

    return <AdminShell>{children}</AdminShell>;
}
