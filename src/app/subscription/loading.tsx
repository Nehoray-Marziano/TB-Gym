export default function SubscriptionLoading() {
    return <main className="min-h-dvh bg-[var(--studio-canvas)] px-6 py-20 text-center text-[var(--studio-ink)]" role="status" aria-busy="true">
        <span aria-hidden="true" className="mx-auto mb-6 block h-9 w-9 animate-spin rounded-full border-2 border-[var(--studio-brand)] border-t-[var(--studio-deep)] motion-reduce:animate-none" />
        <p className="text-lg">המסלולים שלך בדרך…</p>
    </main>;
}
