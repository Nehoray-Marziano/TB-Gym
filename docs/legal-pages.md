# Public legal pages

Routes: `/privacy` and `/terms`. Both load without signing in and are linked from Login, Account and each document's footer.

The publisher requested short, generic Hebrew documents on 8 October 2026 and supplied the public contact name נהוראי מרציאנו, phone 0534296069 and email nehoraymarziano@gmail.com. `src/lib/legal.ts` owns these values and the update date. Contact details use `mailto:` and an international-format `tel:` link. The pages identify the app and this person as its contact, without asserting that the contact is the studio's legal owner.

The documents use a simple text layout with the existing studio font, palette and logo. There are no draft banners, missing-detail placeholders, publication flags, section indexes or draft-specific indexing restrictions.

Privacy retains the actual categories of collected information, including health declarations, bookings and technical identifiers; their purposes; Supabase/Vercel/Google/OneSignal and external Bit payments; overseas processing; necessary local storage; notification permissions; retention for service/legal needs; and contact-based access/correction/deletion requests. No specific automatic retention/deletion schedule is invented or implemented. Terms retain correct-account use, capacity/credit-dependent bookings, the existing 10-hour cancellation rule, manually approved Bit payments, health guidance and rights under applicable law.

After deployment, append `/privacy` and `/terms` to the app's actual origin. The documented existing origin is `https://tb-gym.vercel.app`. Adding or updating these files does not itself deploy them.

## References

Reviewed 8 October 2026; wording is original and shortened to the app's actual behavior:

- [TermsFeed mobile app privacy policy examples](https://www.termsfeed.com/blog/sample-mobile-app-privacy-policy-template/).
- [Google Play user data policy](https://support.google.com/googleplay/android-developer/answer/10144311).
- [Apple app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy).

## Verification history

The 8 October revision passed scoped ESLint with zero warnings, TypeScript, a production webpack build and the scoped Frontend Design Premium strict audit with zero findings. Browser verification passed all nine combinations of Privacy, Terms and Login at 320×568, 390×844 and 1280×800. Anonymous server-rendered content, no draft markers/placeholders, correct name/phone/email, working contact URLs, natural document scrolling, no horizontal overflow, keyboard focus, back-to-top, cross-page navigation, print and reduced motion were checked. The 390px Privacy and Terms screenshots were inspected. Evidence is in `../legal-qa-20261008/`. No production deployment or production data mutation was performed.
