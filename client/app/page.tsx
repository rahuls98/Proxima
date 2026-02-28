import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 text-zinc-900">
      <section className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Proxima</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Open the training agent example to test continuous two-way voice interaction.
        </p>
        <div className="mt-6">
          <Link
            className="inline-block rounded-md bg-black px-4 py-2 text-sm text-white"
            href="/training"
          >
            Open Training Agent
          </Link>
        </div>
      </section>
    </main>
  );
}
