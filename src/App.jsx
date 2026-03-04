import Robot2R from './components/Robot2R';

export default function App() {
  const scrollToActivities = () => {
    document.getElementById('actividades')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200">
      <header className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 text-white shadow-header">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold uppercase tracking-wider border border-amber-400/30">
                Clase 3
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-3 tracking-tight text-white">
                Cinemática de robots: manipulador planar 2 GDL
              </h1>
              <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Aprende qué estudia la cinemática, el vector <strong className="text-white">q</strong>, 
                el problema fundamental (ángulos ↔ posición), el modelo geométrico paso a paso, cinemática inversa y singularidades.
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToActivities}
              className="shrink-0 px-4 py-2.5 rounded-card bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition shadow-card hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
            >
              Ir a Actividades ↓
            </button>
          </div>
        </div>
      </header>
      <main className="py-6 sm:py-8">
        <Robot2R />
      </main>
    </div>
  );
}
