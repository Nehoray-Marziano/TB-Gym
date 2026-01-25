"use client";

import { useGymStore } from "@/providers/GymStoreProvider";
import OneSignalProvider from "@/providers/OneSignalProvider";
import { useEffect, useState } from "react";

export default function ConnectedOneSignalProvider() {
    const { profile } = useGymStore();
    // Optional: get auth user if profile is not yet loaded but we have a session? 
    // Actually GymStore handles fetching profile.

    // We only want to init OneSignal once we have at least entered the app.
    // However, OneSignalProvider handles init internally.
    // We just pass the current user details.

    return (
        <OneSignalProvider
            userId={profile?.id}
            // Default to "trainee" if role is missing but user is logged in (likely standard user)
            userRole={profile?.role || "trainee"}
            userEmail={profile?.email} // profile type doesn't have email in GymStore definition? Let's check.
        />
    );
}
