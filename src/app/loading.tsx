import LaunchScreen from "@/components/LaunchScreen";

// Continue the OS splash while auth resolves, including a streamed redirect
// from an older installation that still opens /dashboard. No minimum delay.
export default function Loading() {
    return <LaunchScreen />;
}
