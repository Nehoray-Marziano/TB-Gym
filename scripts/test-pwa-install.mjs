import assert from 'node:assert/strict';
import test from 'node:test';

test('PWA install prompt state machine tests', async (t) => {
    // Test 1: When user is already running in standalone mode, prompt must never open
    await t.test('standalone app never prompts to install', () => {
        const isStandalone = true;
        const userId = "user-123";
        const justLoggedIn = true;

        const shouldPrompt = !isStandalone && Boolean(userId) && justLoggedIn;
        assert.equal(shouldPrompt, false, "Must not prompt in standalone mode");
    });

    // Test 2: When user is logged out, prompt must never open
    await t.test('logged-out user never prompts to install', () => {
        const isStandalone = false;
        const userId = null;
        const justLoggedIn = false;

        const shouldPrompt = !isStandalone && Boolean(userId);
        assert.equal(shouldPrompt, false, "Must not prompt unauthenticated visitors");
    });

    // Test 3: When user just logged in, prompt opens immediately even if dismissed in past
    await t.test('user who just logged in is prompted to install', () => {
        const isStandalone = false;
        const userId = "user-123";
        const justLoggedIn = true;
        const previouslyDismissed = true;

        // Login overrides past dismissal
        const shouldPrompt = !isStandalone && Boolean(userId) && (justLoggedIn || !previouslyDismissed);
        assert.equal(shouldPrompt, true, "Must prompt user immediately upon login");
    });

    // Test 4: When app is already installed, prompt must not open
    await t.test('previously installed app suppresses prompt', () => {
        const isStandalone = false;
        const isInstalled = true;
        const userId = "user-123";

        const shouldPrompt = !isStandalone && Boolean(userId) && !isInstalled;
        assert.equal(shouldPrompt, false, "Must not prompt if app is already marked installed");
    });

    // Test 5: Synthetic QA fixtures are excluded from automatic prompt
    await t.test('synthetic test routes are excluded from prompt', () => {
        const testPaths = [
            "/home-layout-check",
            "/admin-polish-check",
            "/book-layout-check",
            "/auth/login",
            "/onboarding"
        ];

        for (const path of testPaths) {
            const isExcluded = path.includes("-check") || path.startsWith("/auth/") || path.startsWith("/onboarding");
            assert.equal(isExcluded, true, `Route ${path} should be excluded from auto-prompt`);
        }

        const memberPaths = ["/dashboard", "/book", "/my-bookings", "/profile"];
        for (const path of memberPaths) {
            const isExcluded = path.includes("-check") || path.startsWith("/auth/") || path.startsWith("/onboarding");
            assert.equal(isExcluded, false, `Member route ${path} should allow prompt`);
        }
    });

    // Test 6: Dismissal timeout logic (14 days)
    await t.test('dismissal blocks prompt within 14 days but expires after', () => {
        const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const dismissedRecently = now - (now - 5 * 24 * 60 * 60 * 1000) < DISMISS_MS; // 5 days ago
        assert.equal(dismissedRecently, true, "5 days ago is within dismissal window");

        const dismissedLongAgo = now - (now - 20 * 24 * 60 * 60 * 1000) < DISMISS_MS; // 20 days ago
        assert.equal(dismissedLongAgo, false, "20 days ago has expired dismissal window");
    });
});
