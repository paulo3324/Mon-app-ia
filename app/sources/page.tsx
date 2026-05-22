export default function SourcesPage() {
  const sources = [
    "Pacte Dutreil",
    "Article 787 B du CGI",
    "BOFiP transmission d’entreprise",
    "Apport-cession article 150-0 B ter",
    "Donation avant cession",
    "Plus-values mobilières des dirigeants",
    "Report d’imposition",
    "Démembrement de titres sociaux",
    "Holding animatrice",
    "Mandat à effet posthume",
    "Mandat de protection future",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h1 className="text-4xl font-bold">Sources pré-enregistrées</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Voici les sources documentaires actuellement utilisées pour encadrer
            les réponses de l’assistant IA.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {sources.map((source) => (
              <div
                key={source}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <p className="font-semibold">{source}</p>
                <p className="mt-2 text-sm text-slate-400">
                  Source exploitable pour la recherche documentaire et les
                  réponses IA.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
