import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { loadGymSnapshot, loadUpcomingSession } from "../src/lib/gym-data.ts";
import { getRelativeTimeHebrew } from "../src/lib/utils.ts";

const userId = "00000000-0000-0000-0000-000000000001";
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const client = fetch => createClient("https://fixture.supabase.co", "fixture-key", {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
});

test("profile, balance and subscription start in parallel and retain a real zero balance", async () => {
    const requests = [];
    let allStarted;
    const started = new Promise(resolve => { allStarted = resolve; });
    const supabase = client(url => new Promise(resolve => {
        requests.push({ url: new URL(url), resolve });
        if (requests.length === 3) allStarted();
    }));
    const snapshot = loadGymSnapshot(supabase, userId, "fixture@example.com");
    await started;
    assert.equal(requests.length, 3);
    for (const { url, resolve } of requests) {
        if (url.pathname.endsWith("profiles")) {
            assert.equal(url.searchParams.get("id"), `eq.${userId}`);
            resolve(response([{ id: userId, full_name: "נועה בדיקה", role: "trainee" }]));
        } else if (url.pathname.endsWith("get_available_tickets")) resolve(response(0));
        else resolve(response({ is_active: false }));
    }
    assert.deepEqual(await snapshot, { userId, profile: { id: userId, full_name: "נועה בדיקה", role: "trainee", email: "fixture@example.com" }, tickets: 0, subscription: null });
});

test("a failed balance request rejects instead of inventing zero tickets", async () => {
    const supabase = client(async url => {
        if (String(url).includes("get_available_tickets")) return response({ message: "Unavailable" }, 503);
        return response(null);
    });
    await assert.rejects(loadGymSnapshot(supabase, userId), error => error.message === "Unavailable");
});

test("a missing profile cannot mark an account ready", async () => {
    const supabase = client(async url => response(String(url).includes("get_available_tickets") ? 0 : null));
    await assert.rejects(loadGymSnapshot(supabase, userId), /Account profile is unavailable/);
});

test("a missing or invalid balance is not a real zero", async () => {
    for (const balance of [null, "12", -1]) {
        const supabase = client(async url => {
            if (String(url).includes("profiles")) return response([{ id: userId, full_name: "Fixture", role: "trainee" }]);
            return response(String(url).includes("get_available_tickets") ? balance : null);
        });
        await assert.rejects(loadGymSnapshot(supabase, userId), /Account balance is unavailable/);
    }
});

test("upcoming bookings are user-scoped, future-only and choose the earliest session", async () => {
    const early = { id: "early", title: "אימון כוח", start_time: "2099-10-03T09:00:00Z" };
    const late = { id: "late", title: "אימון כוח", start_time: "2099-10-04T09:00:00Z" };
    const supabase = client(async url => {
        const query = new URL(url).searchParams;
        assert.equal(query.get("user_id"), `eq.${userId}`);
        assert.equal(query.get("status"), "eq.confirmed");
        assert.match(query.get("select"), /gym_sessions!inner/);
        assert.match(query.get("session.start_time"), /^gt\./);
        return response([{ session: late }, { session: null }, { session: early }]);
    });
    assert.deepEqual(await loadUpcomingSession(supabase, userId), early);
});

test("an empty booking list and a failed request remain distinguishable", async () => {
    assert.equal(await loadUpcomingSession(client(async () => response([])), userId), null);
    await assert.rejects(loadUpcomingSession(client(async () => response({ message: "Unavailable" }, 503)), userId));
});

test("home relative dates agree across server and browser timezones near midnight", context => {
    context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-03T21:30:00Z") });
    assert.equal(getRelativeTimeHebrew("2026-10-04T19:00:00Z", "Asia/Jerusalem"), "היום");
    assert.equal(getRelativeTimeHebrew("2026-10-04T19:00:00Z", "UTC"), "מחר");
});
