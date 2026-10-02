"use client";

import BookingExperience from "@/components/book/BookingExperience";
import { useTraineeUserId } from "@/components/TraineeIdentity";

export default function BookingPage() {
    return <BookingExperience userId={useTraineeUserId()} />;
}
