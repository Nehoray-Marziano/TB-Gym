import assert from "node:assert/strict";
import test from "node:test";
import { loadModule, loadHandler } from "./lib/notification-test-runtime.mjs";

test("repeated email-code activation sends once and retains the address after failure", async () => {
    let release, requests = 0;
    const authLock = { current: false };
    const { invoke, state } = await loadHandler("src/components/home/LandingPage.tsx", "handleSendCode", {
        email: "member@example.invalid", authLock,
        supabase: { auth: { signInWithOtp: () => { requests++; return new Promise(resolve => { release = resolve; }); } } },
        emailInputRef: { current: null }, setTimeout() {}
    });
    const first = invoke();
    await invoke();
    assert.equal(requests, 1);
    release({ error: Error("offline") });
    await first;
    assert.equal(authLock.current, false);
    assert.equal(state.setIsLoading, false);
    assert.equal(typeof state.setAuthError, "string");
    assert.equal(state.setEmail, undefined);
});

test("a thrown OTP verification error releases busy state for retry", async () => {
    const authLock = { current: false };
    const { invoke, state } = await loadHandler("src/components/home/LandingPage.tsx", "handleVerifyCode", {
        email: "member@example.invalid", otpCode: "123456", authLock, isValidEmailOtp: value => /^\d{6,8}$/.test(value.trim()),
        supabase: { auth: { verifyOtp: async () => { throw Error("offline"); } } }
    });
    await invoke();
    assert.equal(authLock.current, false);
    assert.equal(state.setIsLoading, false);
    assert.equal(state.setOtpCode, undefined);
    assert.equal(typeof state.setAuthError, "string");
});

test("email OTP accepts the configured six-to-eight digits and rejects malformed input", async () => {
    const { api } = await loadModule("src/lib/emailOtp.ts");
    for (const code of ["012345", "0123456", "01234567", " 01234567 "]) assert.equal(api.isValidEmailOtp(code),true);
    for (const code of ["12345", "123456789", "12ab3456", "1234 5678", ""]) assert.equal(api.isValidEmailOtp(code),false);
});

test("eight-digit OTP reaches the actual SDK verification handler", async () => {
    let called = 0;
    const { invoke } = await loadHandler("src/components/home/LandingPage.tsx", "handleVerifyCode", {
        email: "member@example.invalid", otpCode: "01234567", authLock: {current:false},
        isValidEmailOtp: value => /^\d{6,8}$/.test(value.trim()),
        supabase: {auth:{verifyOtp: async payload => {called++; assert.equal(payload.token,"01234567"); return {data:null,error:Error("test rejection")};}}}
    });
    await invoke();
    assert.equal(called,1);
});

test("OAuth return URLs stay on the app origin after browser normalization", async () => {
    const { api } = await loadModule("src/lib/authRedirect.ts", { URL });
    const origin = "https://studio.example";
    for (const next of [
        null,
        "",
        "https://evil.example",
        "//evil.example",
        "/\\evil.example",
        "/%5Cevil.example",
        "/%2F%2Fevil.example",
        "/\n/evil.example",
        "/%"
    ]) {
        assert.equal(api.getAuthRedirect(next, origin), `${origin}/dashboard`, String(next));
    }
    assert.equal(api.getAuthRedirect("/book?day=tomorrow#schedule", origin), `${origin}/book?day=tomorrow#schedule`);
});

test("blocked optional session storage does not break committed actions", async () => {
    const unavailable = {
        getItem() {
            throw Error("blocked");
        },
        setItem() {
            throw Error("quota");
        },
        removeItem() {
            throw Error("blocked");
        }
    };
    const { api } = await loadModule("src/lib/sessionStorage.ts", { sessionStorage: unavailable });
    assert.equal(api.sessionCache.getItem("key"), null);
    assert.doesNotThrow(() => api.sessionCache.setItem("key", "value"));
    assert.doesNotThrow(() => api.sessionCache.removeItem("key"));
});

function query(result) {
    return {
        select() {
            return this;
        },
        eq() {
            return this;
        },
        in() {
            return this;
        },
        order() {
            return this;
        },
        abortSignal() {
            return this;
        },
        single: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        then: (ok, bad) => Promise.resolve(result).then(ok, bad)
    };
}

test("a failed health read cannot initialize a blank editable health declaration", async () => {
    const { invoke, state } = await loadHandler("src/app/(trainee)/profile/page.tsx", "fetchData", {
        active: true,
        AbortSignal,
        userId: "member",
        summary: { email: "member@example.invalid" },
        supabase: {
            from: (table) =>
                query(
                    table === "health_declarations"
                        ? { data: null, error: Error("network") }
                        : {
                              data: { id: "member", full_name: "Member", phone: "0500000000", role: "trainee" },
                              error: null
                          }
                ),
            rpc: () => query({ data: 4, error: null })
        }
    });
    await invoke();
    assert.equal(state.setLoadError, true);
    assert.equal(state.setLoading, false);
    assert.equal(state.setHealth, undefined);
    assert.equal(state.setProfile, undefined);
});

test("older booking responses cannot overwrite a newer booking list", async () => {
    const replies = [];
    const readVersion = { current: 0 };
    const { invoke, state } = await loadHandler("src/app/(trainee)/my-bookings/page.tsx", "fetchBookings", {
        useCallback: (callback) => callback,
        userId: "member",
        readVersion,
        AbortSignal,
        getSupabaseClient: () => ({ from: () => query(new Promise((resolve) => replies.push(resolve))) })
    });
    const old = invoke(),
        fresh = invoke();
    const session = (id) => ({ id, title: id, start_time: new Date(Date.now() + 86_400_000).toISOString() });
    replies[1]({ data: [{ id: "new", status: "confirmed", session: session("new") }], error: null });
    await fresh;
    replies[0]({ data: [{ id: "old", status: "confirmed", session: session("old") }], error: null });
    await old;
    assert.equal(state.setBookings[0].id, "new");
    assert.equal(state.setLoadError, false);
});

test("a rejected booking read exposes retry instead of a false empty result", async () => {
    const { invoke, state } = await loadHandler("src/app/(trainee)/my-bookings/page.tsx", "fetchBookings", {
        useCallback: (callback) => callback,
        userId: "member",
        readVersion: { current: 0 },
        AbortSignal,
        getSupabaseClient: () => ({ from: () => query({ data: null, error: Error("offline") }) })
    });
    await invoke();
    assert.equal(state.setLoadError, true);
    assert.equal(state.setLoading, false);
    assert.equal(state.setBookings, undefined);
});

test("rapid repeated booking activation commits and notifies only once", async () => {
    let release,
        mutations = 0,
        notifications = 0;
    const { invoke, state } = await loadHandler("src/components/book/BookingExperience.tsx", "handleBook", {
        bookingLock: { current: false },
        readVersion: { current: 0 },
        navigator: {},
        userId: "member",
        sessions: [{ id: "class", title: "Class" }],
        supabase: {
            rpc: () => {
                mutations++;
                return new Promise((resolve) => {
                    release = resolve;
                });
            }
        },
        sessionCache: { removeItem() {} },
        toast() {},
        bookingMessage: (value) => value,
        triggerCelebration() {},
        refreshData: async () => {},
        fetchSessions: async () => {},
        sendNotificationRequest: async () => {
            notifications++;
        }
    });
    const first = invoke("class");
    await invoke("class");
    assert.equal(mutations, 1);
    release({ data: { success: true }, error: null });
    await first;
    assert.equal(notifications, 1);
    assert.equal(state.setBookingId, null);
});

test("a thrown booking transport error releases the busy control for retry", async () => {
    const messages = [];
    const lock = { current: false };
    const { invoke, state } = await loadHandler("src/components/book/BookingExperience.tsx", "handleBook", {
        bookingLock: lock,
        readVersion: { current: 0 },
        navigator: {},
        supabase: {
            rpc: async () => {
                throw Error("offline");
            }
        },
        toast: (message) => messages.push(message)
    });
    await invoke("class");
    assert.equal(lock.current, false);
    assert.equal(state.setBookingId, null);
    assert.equal(messages[0].type, "error");
});
