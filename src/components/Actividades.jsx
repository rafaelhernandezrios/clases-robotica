import { useState } from 'react';
import { forwardKinematics, deg2rad } from '../utils/kinematics';

const TOLERANCIA_POSICION = 12;
const TOLERANCIA_NUMERICA = 3;

const EJERCICIO_1 = {
  theta1Deg: 60,
  theta2Deg: 30,
  L1: 120,
  L2: 100,
};

const EJERCICIO_2_TARGET = { x: 150, y: 80 };

const TESTS_PROGRAMACION = [
  { theta1: 0, theta2: 0, L1: 120, L2: 100 },
  { theta1: Math.PI / 2, theta2: 0, L1: 120, L2: 100 },
  { theta1: deg2rad(60), theta2: deg2rad(30), L1: 120, L2: 100 },
  { theta1: deg2rad(-45), theta2: deg2rad(90), L1: 100, L2: 80 },
];

const PLANTILLA_CODIGO = `function directa(theta1, theta2, L1, L2) {
  // theta1, theta2 en radianes. Completa con las fórmulas de cinemática directa.
  const x = 0;  // completar: L1*Math.cos(theta1) + ...
  const y = 0;  // completar: L1*Math.sin(theta1) + ...
  return { x, y };
}`;

export default function Actividades({ endEffector, L1, L2 }) {
  const [ex1X, setEx1X] = useState('');
  const [ex1Y, setEx1Y] = useState('');
  const [ex1Result, setEx1Result] = useState(null); // null | 'ok' | 'error'

  const [ex2Result, setEx2Result] = useState(null);

  const [ex3Code, setEx3Code] = useState(PLANTILLA_CODIGO);
  const [ex3Result, setEx3Result] = useState(null); // null | 'ok' | { error: string }

  const verificarEjercicio1 = () => {
    const correcto = forwardKinematics(
      deg2rad(EJERCICIO_1.theta1Deg),
      deg2rad(EJERCICIO_1.theta2Deg),
      EJERCICIO_1.L1,
      EJERCICIO_1.L2
    );
    const x = Number(ex1X);
    const y = Number(ex1Y);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      setEx1Result('error');
      return;
    }
    const dx = Math.abs(x - correcto.x);
    const dy = Math.abs(y - correcto.y);
    setEx1Result(dx <= TOLERANCIA_NUMERICA && dy <= TOLERANCIA_NUMERICA ? 'ok' : 'error');
  };

  const verificarEjercicio2 = () => {
    const d = Math.hypot(endEffector.x - EJERCICIO_2_TARGET.x, endEffector.y - EJERCICIO_2_TARGET.y);
    setEx2Result(d <= TOLERANCIA_POSICION ? 'ok' : 'error');
  };

  const verificarEjercicio3 = () => {
    try {
      const getDirecta = new Function(`${ex3Code}; return typeof directa === "function" ? directa : null;`);
      const directaUser = getDirecta();
      if (!directaUser) {
        setEx3Result({ error: 'Debes definir una función llamada directa(theta1, theta2, L1, L2).' });
        return;
      }
      for (const t of TESTS_PROGRAMACION) {
        const esperado = forwardKinematics(t.theta1, t.theta2, t.L1, t.L2);
        const obtenido = directaUser(t.theta1, t.theta2, t.L1, t.L2);
        if (!obtenido || typeof obtenido.x !== 'number' || typeof obtenido.y !== 'number') {
          setEx3Result({ error: 'La función debe devolver un objeto { x, y } con números.' });
          return;
        }
        const dx = Math.abs(obtenido.x - esperado.x);
        const dy = Math.abs(obtenido.y - esperado.y);
        if (dx > TOLERANCIA_NUMERICA || dy > TOLERANCIA_NUMERICA) {
          setEx3Result({
            error: `En el test (θ₁=${(t.theta1 * 180 / Math.PI).toFixed(0)}°, θ₂=${(t.theta2 * 180 / Math.PI).toFixed(0)}°) se esperaba (${esperado.x.toFixed(1)}, ${esperado.y.toFixed(1)}), obtuviste (${obtenido.x.toFixed(1)}, ${obtenido.y.toFixed(1)}).`,
          });
          return;
        }
      }
      setEx3Result('ok');
    } catch (err) {
      setEx3Result({ error: err.message || 'Error de sintaxis al ejecutar el código.' });
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 mt-10 pb-10">
      <h2 className="text-xl font-bold text-slate-800 border-b-2 border-emerald-500 pb-2 mb-6">
        Actividades
      </h2>
      <p className="text-slate-600 text-sm mb-6">
        Practica lo visto en clase: calcula posiciones, lleva el robot a un punto y programa la cinemática directa.
      </p>

      <div className="space-y-8">
        {/* Ejercicio 1 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm">1</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 mb-2">Calcular la posición (x, y)</h3>
              <p className="text-sm text-slate-600 mb-3">
                Con <strong>L₁={EJERCICIO_1.L1}</strong>, <strong>L₂={EJERCICIO_1.L2}</strong>, <strong>θ₁={EJERCICIO_1.theta1Deg}°</strong> y <strong>θ₂={EJERCICIO_1.theta2Deg}°</strong>, calcula la posición del efector final. Puedes usar la simulación (pon esos ángulos en los sliders) o la fórmula a mano.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-slate-600">
                  x = <input
                    type="number"
                    value={ex1X}
                    onChange={(e) => { setEx1X(e.target.value); setEx1Result(null); }}
                    className="w-20 font-mono text-sm border border-slate-300 rounded px-2 py-1 ml-1"
                    step="0.1"
                    placeholder="0"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  y = <input
                    type="number"
                    value={ex1Y}
                    onChange={(e) => { setEx1Y(e.target.value); setEx1Result(null); }}
                    className="w-20 font-mono text-sm border border-slate-300 rounded px-2 py-1 ml-1"
                    step="0.1"
                    placeholder="0"
                  />
                </label>
                <button
                  type="button"
                  onClick={verificarEjercicio1}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
                >
                  Verificar
                </button>
                {ex1Result === 'ok' && <span className="text-emerald-600 font-medium text-sm">✓ Correcto</span>}
                {ex1Result === 'error' && <span className="text-red-600 text-sm">Revisa el cálculo (tolerancia ±{TOLERANCIA_NUMERICA})</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Ejercicio 2 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm">2</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 mb-2">Llevar el efector a un punto</h3>
              <p className="text-sm text-slate-600 mb-3">
                Usa la simulación (sliders o cinemática inversa) para colocar el efector en <strong>({EJERCICIO_2_TARGET.x}, {EJERCICIO_2_TARGET.y})</strong>. Cuando creas que está en el punto, pulsa Verificar.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={verificarEjercicio2}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
                >
                  Verificar posición actual
                </button>
                <span className="text-slate-500 text-sm">Tu efector está en ({endEffector.x.toFixed(0)}, {endEffector.y.toFixed(0)})</span>
                {ex2Result === 'ok' && <span className="text-emerald-600 font-medium text-sm">✓ ¡Objetivo alcanzado!</span>}
                {ex2Result === 'error' && <span className="text-red-600 text-sm">Aún no. Acerca más el efector al punto.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Ejercicio 3 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm">3</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 mb-2">Programar la cinemática directa</h3>
              <p className="text-sm text-slate-600 mb-3">
                Completa o escribe la función <code className="bg-slate-100 px-1 rounded">directa(theta1, theta2, L1, L2)</code> en JavaScript. Los ángulos vienen en <strong>radianes</strong>. Debe devolver <code className="bg-slate-100 px-1 rounded">&#123; x, y &#125;</code>. Usa solo <code className="bg-slate-100 px-1 rounded">Math.cos</code>, <code className="bg-slate-100 px-1 rounded">Math.sin</code> y las variables dadas.
              </p>
              <textarea
                value={ex3Code}
                onChange={(e) => { setEx3Code(e.target.value); setEx3Result(null); }}
                className="w-full h-36 font-mono text-xs border border-slate-300 rounded-lg p-3 bg-slate-50"
                spellCheck="false"
              />
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={verificarEjercicio3}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  Ejecutar y verificar
                </button>
                <button
                  type="button"
                  onClick={() => { setEx3Code(PLANTILLA_CODIGO); setEx3Result(null); }}
                  className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                >
                  Restaurar plantilla
                </button>
                {ex3Result === 'ok' && <span className="text-emerald-600 font-medium text-sm">✓ ¡Correcto! Tu función pasa todos los tests.</span>}
                {ex3Result?.error && <span className="text-red-600 text-sm max-w-md">{ex3Result.error}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
