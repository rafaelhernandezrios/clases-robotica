import Robot2R from './components/Robot2R';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <span className="text-amber-300 text-sm font-medium">Clase 3</span>
          <h1 className="text-2xl font-bold font-sans tracking-tight mt-0.5">
            Cinemática de robots: manipulador planar 2 GDL
          </h1>
          <p className="text-slate-300 text-sm mt-2 max-w-2xl">
            En esta sesión aprenderás qué estudia la cinemática, cómo se describe el estado del robot con el vector <strong className="text-white">q</strong>, 
            el problema fundamental de relacionar ángulos con la posición del efector, el modelo geométrico paso a paso y los conceptos de cinemática inversa y singularidades.
          </p>
        </div>
      </header>
      <main className="py-6">
        <Robot2R />
      </main>
    </div>
  );
}
