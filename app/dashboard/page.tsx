import ChatClient from "../components/ChatClient";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h1 className="text-4xl font-bold">Chat IA Patrimoine</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Posez votre question sur la finance, transmission, succession ou fiscalité.
            Réponses courtes et claires basées sur des sources officielles (impots.gouv, BOFIP, CGI).
          </p>
        </div>

        <ChatClient />
      </section>
    </main>
  );
}
