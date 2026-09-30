// Remove runtime caches created by earlier workers that stored account data.
self.addEventListener("activate", (event) => {
  const obsolete = new Set([
    "start-url",
    "pages",
    "pages-rsc",
    "pages-rsc-prefetch",
    "apis",
    "next-data",
    "static-data-assets",
    "cross-origin",
    "auth-pages-no-cache",
    "supabase-api-no-cache",
    "supabase-auth-no-cache",
  ]);
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => obsolete.has(name)).map((name) => caches.delete(name)))
    )
  );
});
