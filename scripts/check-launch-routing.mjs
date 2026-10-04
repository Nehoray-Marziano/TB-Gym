// Run against a production server: node scripts/check-launch-routing.mjs <baseUrl>
// A 200 splash + meta refresh commits a throwaway document before login. The
// auth decision must precede streaming, including on old installed start URLs.
import assert from "node:assert/strict";

const baseUrl = process.argv[2] || "http://127.0.0.1:3115";
assert(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
for (const path of ["/dashboard", "/book", "/my-bookings", "/profile"]) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
  assert.equal(response.status, 307, `${path}: redirect before painting a document`);
  assert.equal(new URL(response.headers.get("location"), baseUrl).pathname, "/auth/login");
  console.log(`PASS ${path}: HTTP redirect before first paint`);
}
for (const path of ["/", "/auth/login"]) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /class="studio-welcome /, `${path}: initial document is the login page`);
  assert.doesNotMatch(html, /<div data-studio-launch/, `${path}: no second in-app splash`);
  assert.doesNotMatch(html, /http-equiv="refresh"/i, `${path}: no document replacement`);
  console.log(`PASS ${path}: login in initial document, no splash or meta refresh`);
}
