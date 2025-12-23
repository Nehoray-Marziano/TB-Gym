import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Fetch all data in parallel to avoid waterfalls
    const [profileRes, creditRes, healthRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_credits").select("balance").eq("user_id", user.id).single(),
        supabase.from("health_declarations").select("*").eq("id", user.id).single()
    ]);

    const profileData = profileRes.data;
    const creditData = creditRes.data;
    const healthData = healthRes.data;

    // Construct the profile object matching the client component's expected type
    const finalProfile = profileData ? {
        id: profileData.id,
        full_name: profileData.full_name,
        email: user.email || "",
        phone: profileData.phone,
        balance: creditData ? creditData.balance : 0,
        role: profileData.role,
    } : null;

    const finalHealth = healthData || { is_healthy: true, medical_conditions: "" };

    return <ProfileClient initialProfile={finalProfile} initialHealth={finalHealth} />;
}
