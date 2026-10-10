export default function SetupIncomplete({ missingVariables }: { missingVariables: string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4 py-10 text-stone-900">
      <section className="w-full max-w-lg border border-stone-900 bg-white p-7 shadow-[5px_5px_0px_0px_#1C1917]">
        <div className="mb-2 font-serif text-2xl font-bold tracking-tight">NEXUS</div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32]">Business Operating Platform</p>
        <h1 className="mt-5 font-serif text-2xl font-bold">Setup incomplete</h1>
        <p className="mt-2 text-sm text-stone-600">Supabase authentication is selected, but these environment variables are missing:</p>
        <ul className="mt-4 list-inside list-disc space-y-1 border border-amber-300 bg-amber-50 p-4 font-mono text-sm text-amber-950">
          {missingVariables.map((name) => <li key={name}>{name}</li>)}
        </ul>
        <p className="mt-4 text-xs text-stone-500">Add them to your local environment and restart the app, or set <code>AUTH_MODE=local</code> to use the development accounts.</p>
      </section>
    </main>
  );
}
