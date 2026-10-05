# Text selection and explicit value copying

The October 4, 2026 request disables text selection throughout the app and adds explicit value copying to every editable field. The follow-up adds independent name, email and phone copy actions to the admin trainee directory.

## Owners and behavior

- `src/app/globals.css` applies `user-select: none` and the Safari prefix to all document elements, including portalled overlays. The payment description's former selection exception is removed.
- `TextCopyPolicy` mounts once in the root layout and cancels native copy events. Clipboard API writes from explicit buttons remain available. This is a convenience policy, not a content-security boundary.
- `CopyableInput` and `CopyableTextarea` preserve native props, refs, validation, typing, paste and autofill. Buttons copy the current DOM value, retaining leading zeros and multiline content. Empty and disabled fields disable their copy action.
- `CopyButton` owns Hebrew accessible labels, 48px targets, keyboard activation, duplicate-click protection, pending feedback, success feedback and retryable failures. Success feedback fades and slides in/out over 900ms (previously 2500ms); reduced motion shows a static acknowledgement for the same short window. Errors retain 2500ms for reading and retry. Feedback never contains the copied value. Copy handlers do not log or transmit values, or persist them in application storage.
- Existing studio color tokens remain canonical. Logical trailing padding keeps copy buttons clear of RTL names and LTR emails/phones; centered number and OTP inputs reserve padding on both sides. Field height contains the copy target. Multiline feedback stays inside clipped disclosure containers.
- All 13 application-authored input/textarea declarations use the shared fields: login, onboarding, profile, trainee search, the trainee selector, class title and ticket adjustment. Admin date/time value triggers have copy actions beside their labels. Each trainee card copies name, email and phone separately, with missing values visibly unavailable. The existing receipt copy action remains available and its failure text now asks for a retry.

## Verification

Run against a local development server:

```text
node scripts/check-cleanup-smoke.mjs http://127.0.0.1:3120 scratch/copy --copy-check
node scripts/check-cleanup-smoke.mjs http://127.0.0.1:3120 scratch/copy/profile-feedback --copy-check --profile-only --viewport=320
```

The smoke suite grants clipboard permissions only to the local test origin and uses synthetic identities and mocked Supabase responses. It forbids database mutations and never sends real authentication emails, notifications or payments. Its temporary route is removed on exit. On Windows it terminates its own Chrome process tree.

The full copy run passed at 320×568, 375×667, 390×844 and 430×932, producing 88 screenshots. Assertions cover actual clipboard reads, unmodified application write values, native-copy suppression, empty field state, 48px targets, accessible labels, horizontal overflow, denied clipboard permission, retry, duplicate clicks, keyboard activation, profile/onboarding textareas, class date/time, the open clock dialog, trainee contact values, absent phone values, the trainee selector, ticket adjustment and the receipt action. Windows normalizes clipboard line endings to CRLF; the test normalizes only its read assertion and separately checks the exact text sent by the application.

The final profile feedback follow-up passed at 320×568 with three screenshots: a denied multiline copy remains visible inside the clipped disclosure and retry succeeds. Input minimum heights remain owned by their original classes; the two smaller profile inputs were raised from 44px to 48px to contain the copy target. Screenshots use synthetic data only and are kept under ignored `scratch/copy/`.

The shorter animated acknowledgement was checked in Chrome at 320×568. Frame sampling confirmed entry and exit fades, vertical motion, full contrast during the hold, dismissal at approximately 912ms and unchanged button geometry. Reduced motion disables the animation while retaining the short acknowledgement. Repeated copying, actual clipboard values, native-copy suppression and multiline error/retry containment passed. Evidence is under ignored `scratch/copy-motion/`; the temporary fixture was removed and the local preview stopped. The static audit retains the same five existing form/scrollbar findings.

TypeScript, source/script lint, the 6 PWA tests and 7 gym-data tests passed. Source lint retains four existing Next.js image advisories. `node node_modules/next/dist/bin/next build --webpack` passed, and its route inventory contains only the application routes. The temporary preview route and generated preview types were removed; validation artifacts were moved under ignored `scratch/copy/`, and the dev server's automatic `tsconfig.json` edits were restored.

The premium static audit reports five existing findings: three forms retain their established native validation, and two scrollbar rules are flagged. Those behaviors are outside this copy feature. The new textarea owner satisfies the audit's resize rule. An external documentation lint command was rejected by automatic approval review because it would download and execute an unverified npm package with possible data exposure; documentation was reviewed locally instead. No external package was installed.

Physical iOS/Android clipboard permission prompts were not tested; permission denial and retry were exercised in Chrome. CSS/clipboard API behavior follows [MDN user-select](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/user-select) and [MDN clipboard writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).
## Onboarding save recovery

If either declaration or profile saving fails, the onboarding form retains its entered details and announces: "לא הצלחנו לשמור את הפרטים. הפרטים שהזנת נשמרו כאן, ואפשר לנסות שוב." The finish action retries the save; a failed declaration cannot mark the profile complete.
