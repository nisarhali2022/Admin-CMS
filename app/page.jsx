export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Rebuild workspace
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Single-admin multi-website CMS
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          This repo has been cleaned for the CMS rebuild. The implementation
          should start from the milestone plan in the docs and keep website CMS
          modules separate from any future global quiz work.
        </p>
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Start here</h2>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>1. Read docs/INDEX.md for the documentation flow.</li>
            <li>2. Follow docs/IMPLEMENTATION_MILESTONES.md sequentially.</li>
            <li>3. Keep ADMIN_SECRET auth and add CMS features by milestone.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
