"use client";

import TraineeDashboard from "@/components/home/TraineeDashboard";
import { useTraineeUserId } from "@/components/TraineeIdentity";

export default function DashboardPage() {
    return <TraineeDashboard userId={useTraineeUserId()} />;
}
