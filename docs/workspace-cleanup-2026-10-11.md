# Workspace cleanup — 11 October 2026

The initial production scan cleaned the application tree but left older QA output and copied checkouts in the surrounding `Talia` workspace. This follow-up addresses that visible clutter.

## Completed

| Item | Result |
| --- | --- |
| Generated build folders and Chrome profiles | Removed 131 cache directories across old QA copies, retired worktrees and ignored app test output. |
| Shared dependency folders | Safely unlinked five junctions pointing at `TB-Gym/node_modules`; the active dependency installation remains intact. |
| Retired worktrees | Removed `admin-polish-20261004`, `final-correctness-20261005` and `launch-release-20261004`. All commits were verified included in `main`; tracked files were clean. Branches/history remain. |
| Worktree-specific data | Preserved nine extra items, including private environment files, reports and the two untracked launch-analysis files, alongside commit/branch metadata. |
| Older workspace output | Moved 21 folders and 61 root files into `.archive/2026-10-11-workspace-cleanup/`, preserving unique old source, screenshots, reports, patches and setup SQL. |
| Empty QA folders | Removed two folders containing only discarded Chrome profiles. |
| Stale TypeScript output | Removed the unused `TB-Gym/tsconfig.qa.tsbuildinfo`. |
| Orphaned Git worktree metadata | Preserved four `ORIG_HEAD` records and removed metadata directories with no `HEAD` or `gitdir`. |
| Local npm toolchain | Relocated to `.tools/npm`; npm 10.9.2 remains usable. |

The root now contains the active `TB-Gym` app, agent instructions/skills, local tooling, one historical archive and a short workspace README. Archive manifests preserve original paths. Windows long-path support was used for deep Chrome profiles; dependency junctions were unlinked without traversing their targets.

## Preventing new clutter

`scripts/lib/browser-check.mjs` now closes its own Chrome process and removes its generated profile on normal teardown and failed startup. It validates that deletion stays within the allocated output directory. Reports and screenshots remain. Profile cleanup errors cannot prevent a caller from removing database fixtures. Closed connections also reject pending browser requests and clear their timers.

Three actual browser teardown checks pass: normal close removes the profile including paths longer than 260 characters; reports/screenshots survive; failed browser startup leaves no profile behind. The modified helper passes lint.

## Retained intentionally

The application source/import inventory has no orphaned modules, empty maintained directories or zero-byte maintained files. MUI's Emotion peer dependencies remain required. The current `.next` build and `node_modules`, application environment files, dummy-account registry used by maintenance scripts, SQL migrations, tests, design context, original artwork and older installed-client PWA assets retain active or compatibility purposes.

No application behavior or live database data changed during this filesystem cleanup. Current source/assets, package declarations, installed dependencies, the production build and Git branches are checked after archival. The full live correctness result remains 595/595, as recorded in the separate correctness report.

Final verification: all 92 archived/tool destinations exist; none of the 136 planned caches/links remain; only `TB-Gym` is registered as a worktree; the retired branches remain. The active dependency installation still contains 433 package directories. The application source/assets match production build hash `43d65a5b629ad7a230e9f818fd1408e5b16943d5df22fc173a5c67f1b4b43b01`. All 150 unit/regression checks pass; repository lint checks 159 files with zero errors/warnings; Git whitespace checks pass. Main application environment files, the dummy-account registry and production artifact remain present. All four preserved `ORIG_HEAD` commits are already included in `main`.
