import { useState, useMemo, useEffect } from 'react';
import {
  forwardKinematics,
  inverseKinematics,
  inverseKinematicsElbowDown,
  deg2rad,
  rad2deg,
  getSingularityInfo,
  jacobianDeterminant,
} from '../utils/kinematics';
import Actividades from './Actividades';

const L1_DEFAULT = 120;
const L2_DEFAULT = 100;
const CX = 400;
const CY = 400;
const VIEWBOX_SIZE = 800;

function toScreen(x, y) {
  return { x: CX + x, y: CY - y };
}

export default function Robot2R() {
  const [theta1Deg, setTheta1Deg] = useState(30);
  const [theta2Deg, setTheta2Deg] = useState(45);
  const [L1, setL1] = useState(L1_DEFAULT);
  const [L2, setL2] = useState(L2_DEFAULT);
  const [ikMode, setIkMode] = useState('forward'); // 'forward' | 'inverse'
  const [targetX, setTargetX] = useState(150);
  const [targetY, setTargetY] = useState(80);
  const [elbowUp, setElbowUp] = useState(true);
  const [viewStep, setViewStep] = useState('full'); // 'link1' | 'full' — paso del modelo geométrico
  const [showCalculoPasoAPaso, setShowCalculoPasoAPaso] = useState(false);

  const theta1 = deg2rad(theta1Deg);
  const theta2 = deg2rad(theta2Deg);

  const firstLinkEnd = useMemo(() => ({
    x: L1 * Math.cos(theta1),
    y: L1 * Math.sin(theta1),
  }), [theta1, L1]);

  const segundoEslabonContrib = useMemo(() => ({
    x: L2 * Math.cos(theta1 + theta2),
    y: L2 * Math.sin(theta1 + theta2),
  }), [theta1, theta2, L2]);

  const { joints, endEffector } = useMemo(() => {
    const fk = forwardKinematics(theta1, theta2, L1, L2);
    const x = fk.x;
    const y = fk.y;
    const j0 = toScreen(0, 0);
    const j1 = toScreen(firstLinkEnd.x, firstLinkEnd.y);
    const j2 = toScreen(x, y);
    return {
      joints: [j0, j1, j2],
      endEffector: { x, y },
    };
  }, [theta1, theta2, L1, L2, firstLinkEnd.x, firstLinkEnd.y]);

  const j0 = joints[0];
  const j1 = joints[1];
  const j2 = joints[2];

  const handleApplyInverse = () => {
    const ik = elbowUp
      ? inverseKinematics(targetX / L1, targetY / L1, 1, L2 / L1)
      : inverseKinematicsElbowDown(targetX / L1, targetY / L1, 1, L2 / L1);
    if (ik) {
      setTheta1Deg(Math.round(rad2deg(ik.theta1) * 10) / 10);
      setTheta2Deg(Math.round(rad2deg(ik.theta2) * 10) / 10);
    }
  };

  const inWorkspace = useMemo(() => {
    const r = L1 + L2;
    const d = Math.sqrt(targetX * targetX + targetY * targetY);
    const dMin = Math.abs(L1 - L2);
    return d <= r + 1 && d >= dMin - 1;
  }, [targetX, targetY, L1, L2]);

  const singularity = useMemo(() => getSingularityInfo(theta2), [theta2]);
  const detJ = useMemo(() => jacobianDeterminant(theta2, L1, L2), [theta2, L1, L2]);
  const isSingularOrNear = singularity.isSingular || singularity.isNearSingular;

  useEffect(() => {
    if (viewStep === 'link1') setIkMode('forward');
  }, [viewStep]);

  return (
    <>
      {/* Layout principal: 3 columnas en desktop, 1 columna en móvil */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* ——— Columna Izquierda (25–30%): Panel de Teoría ——— */}
        <section className="lg:w-[28%] lg:min-w-0 flex-shrink-0 flex flex-col max-h-[85vh] lg:max-h-[calc(100vh-6rem)]">
          <div className="sticky top-0 z-10 bg-gradient-to-b from-white to-white/95 backdrop-blur-sm pb-2 pt-0 -mt-0.5 shrink-0">
            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-amber-400 pb-2">
              Contenido Clase 3
            </h2>
          </div>
          <div className="overflow-y-auto pr-2 flex-1 min-h-0 space-y-5 text-sm text-slate-700 mt-2">
          <div className="bg-white rounded-card p-4 shadow-card border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-xs">1</span>
              <h3 className="font-bold text-slate-800">¿Qué estudia la cinemática?</h3>
            </div>
            <p>
              La cinemática estudia el <strong>movimiento</strong> sin considerar las fuerzas que lo causan. 
              El estado de un robot se describe mediante el <strong>vector de variables articulares</strong>:
            </p>
            <div className="bg-slate-100 rounded-lg p-2 font-mono text-xs mt-1.5">
              q = (θ₁, θ₂)ᵀ
            </div>
            <p className="mt-1.5 ml-0">
              Para nuestro robot 2R, <strong>q</strong> son los ángulos de las dos articulaciones. 
              En la simulación, al mover θ₁ y θ₂ estás cambiando <strong>q</strong>.
            </p>
          </div>

          <div className="bg-white rounded-card p-4 shadow-card border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-xs">2</span>
              <h3 className="font-bold text-slate-800">El problema fundamental de la robótica</h3>
            </div>
            <p>
              Consiste en <strong>relacionar los ángulos de las articulaciones con la posición del efector final</strong>. 
              Dos direcciones: <em>cinemática directa</em> (ángulos → posición) y <em>cinemática inversa</em> (posición → ángulos).
            </p>
          </div>

          <div className="bg-sky-50/80 border border-sky-200 rounded-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-sky-200 text-sky-800 font-bold text-xs">3</span>
              <h3 className="font-bold text-slate-800">Modelo geométrico paso a paso</h3>
            </div>
            <p>
              Con un robot planar de dos links se construye el modelo en dos pasos:
            </p>
            <p>
              <strong>Paso 1 — Extremo del primer link:</strong> Por trigonometría, la posición del extremo del primer eslabón es
            </p>
            <div className="bg-white rounded p-2 font-mono text-xs">
              x₁ = L₁·cos(θ₁), &nbsp; y₁ = L₁·sin(θ₁)
            </div>
            <p>
              Usa la vista <strong>“Solo primer eslabón”</strong> en la simulación y mueve θ₁ para verificarlo.
            </p>
            <p>
              <strong>Paso 2 — Incorporar el segundo link:</strong> El segundo eslabón se suma respecto al extremo del primero. La posición (x, y) del efector final queda:
            </p>
            <div className="bg-white rounded p-2 font-mono text-xs">
              x = L₁·cos(θ₁) + L₂·cos(θ₁+θ₂)<br />
              y = L₁·sin(θ₁) + L₂·sin(θ₁+θ₂)
            </div>
            <p>
              Estas son las <strong>ecuaciones de cinemática directa</strong>: (x, y) a partir de (θ₁, θ₂).
            </p>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-bold text-xs">4</span>
              <h3 className="font-bold text-slate-800">Cinemática inversa y singularidades</h3>
            </div>
            <p>
              <strong>Cinemática inversa:</strong> Dado un (x, y) deseado, hallar (θ₁, θ₂). Es más compleja: puede haber varias soluciones (codo arriba / codo abajo) o ninguna si el punto está fuera del alcance.
            </p>
            <p>
              <strong>Singularidades:</strong> Configuraciones donde el robot “pierde” un grado de libertad en el espacio cartesiano (det(J)=0). Implican que no puede mover el efector en ciertas direcciones sin velocidades articulares muy altas, y complican el <strong>control y la planeación del movimiento</strong>. En el 2R ocurren con brazo extendido (θ₂≈0°) o plegado (θ₂≈±180°).
            </p>
          </div>

          <div className="text-xs text-slate-500 pt-1 bg-slate-50 rounded-input px-3 py-2 border border-slate-100">
            Modo simulación: <strong>{ikMode === 'forward' ? 'Directa (mueve ángulos)' : 'Inversa (mueve objetivo)'}</strong>
          </div>
          <p className="text-sm text-emerald-700 font-medium pt-3 border-t border-slate-200 mt-4">
            ↓ <strong>Actividades</strong> más abajo: calcular (x,y), llevar el robot a un punto y programar la cinemática directa.
          </p>
          </div>
        </section>

        {/* ——— Columna Central (45–50%): Canvas/SVG ——— */}
        <div className="flex-1 lg:flex-[0_1_48%] min-w-0 flex flex-col justify-center">
          <div className="bg-white rounded-card border border-slate-200 shadow-card overflow-hidden flex flex-col min-h-0 w-full">
            <div className="relative flex flex-col items-center justify-center min-h-[320px] sm:min-h-[400px] w-full">
              {/* Controles de vista flotantes (esquina superior izquierda) */}
              <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setViewStep('link1')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium shadow-md transition backdrop-blur-sm ${viewStep === 'link1' ? 'bg-sky-600 text-white' : 'bg-white/90 text-slate-600 border border-slate-200 hover:border-sky-300 hover:bg-sky-50/90'}`}
                >
                  Solo primer eslabón
                </button>
                <button
                  type="button"
                  onClick={() => setViewStep('full')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium shadow-md transition backdrop-blur-sm ${viewStep === 'full' ? 'bg-sky-600 text-white' : 'bg-white/90 text-slate-600 border border-slate-200 hover:border-sky-300 hover:bg-sky-50/90'}`}
                >
                  Robot completo
                </button>
              </div>

              {/* Telemetría flotante (esquina superior derecha) */}
              <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-md px-4 py-3 font-mono text-sm space-y-1 min-w-[140px]">
                {viewStep === 'link1' ? (
                  <>
                    <div className="text-sky-700 font-semibold">(x₁, y₁)</div>
                    <div className="tabular-nums text-slate-800">{firstLinkEnd.x.toFixed(1)}, {firstLinkEnd.y.toFixed(1)}</div>
                  </>
                ) : (
                  <>
                    <div className="text-slate-700 font-semibold">(x, y)</div>
                    <div className="tabular-nums text-slate-800">{endEffector.x.toFixed(1)}, {endEffector.y.toFixed(1)}</div>
                    <div className="border-t border-slate-200 pt-1.5 mt-1.5" title="det(J) = L₁·L₂·sin(θ₂)">
                      <span className={isSingularOrNear ? 'text-amber-700' : 'text-slate-600'}>det(J):</span>{' '}
                      <span className="tabular-nums">{detJ.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <svg
                viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
                className="w-full max-w-[min(100%,560px)] aspect-square max-h-[50vh] md:max-h-[65vh] bg-gradient-to-b from-slate-50/80 to-slate-100/80 mx-auto"
                style={{ touchAction: 'none' }}
                aria-label="Robot planar de dos eslabones"
              >
            <defs>
              <marker
                id="arrow"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
              </marker>
            </defs>
            {/* Ejes */}
            <line x1={CX} y1={CY} x2={CX + 360} y2={CY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />
            <line x1={CX} y1={CY} x2={CX} y2={CY - 360} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />
            <text x={CX + 365} y={CY + 4} fill="#64748b" fontSize="12">x</text>
            <text x={CX - 10} y={CY - 365} fill="#64748b" fontSize="12">y</text>

            {/* Eslabón 1 */}
            <line
              x1={j0.x}
              y1={j0.y}
              x2={j1.x}
              y2={j1.y}
              stroke={isSingularOrNear ? '#ea580c' : '#0ea5e9'}
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Eslabón 2 — solo si vista "robot completo" */}
            {viewStep === 'full' && (
              <line
                x1={j1.x}
                y1={j1.y}
                x2={j2.x}
                y2={j2.y}
                stroke={isSingularOrNear ? '#c2410c' : '#8b5cf6'}
                strokeWidth="12"
                strokeLinecap="round"
              />
            )}
            {/* Articulaciones */}
            <circle cx={j0.x} cy={j0.y} r="12" fill="#1e293b" stroke="#fbbf24" strokeWidth="3" />
            <circle cx={j1.x} cy={j1.y} r="10" fill="#1e293b" stroke={isSingularOrNear ? '#ea580c' : '#fbbf24'} strokeWidth="2" />
            {viewStep === 'full' && (
              <circle cx={j2.x} cy={j2.y} r="10" fill="#dc2626" stroke={isSingularOrNear ? '#ea580c' : '#fbbf24'} strokeWidth="2" />
            )}
            {/* Etiqueta paso 1: extremo del primer link */}
            {viewStep === 'link1' && (
              <g>
                <text x={j1.x + 16} y={j1.y} fill="#0c4a6e" fontSize="12" fontWeight="600">(x₁, y₁)</text>
                <circle cx={j1.x} cy={j1.y} r="6" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="3" />
              </g>
            )}

            {/* Objetivo (modo inversa) */}
            {ikMode === 'inverse' && (
              <>
                <circle
                  cx={toScreen(targetX, targetY).x}
                  cy={toScreen(targetX, targetY).y}
                  r="14"
                  fill="none"
                  stroke={inWorkspace ? '#22c55e' : '#ef4444'}
                  strokeWidth="2"
                  strokeDasharray="5"
                />
                <text
                  x={toScreen(targetX, targetY).x + 18}
                  y={toScreen(targetX, targetY).y}
                  fill="#475569"
                  fontSize="11"
                >
                  (x, y)
                </text>
              </>
            )}
          </svg>
            </div>
          </div>
        </div>

        {/* ——— Columna Derecha (25–30%): Panel de Control ——— */}
        <aside className="lg:w-[28%] lg:min-w-0 flex-shrink-0 flex flex-col gap-4 max-h-[85vh] lg:max-h-[calc(100vh-6rem)] overflow-y-auto">
          {/* Pestañas: Modo Cinemática */}
          <div className="bg-white rounded-card border border-slate-200 shadow-card overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setIkMode('forward')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${ikMode === 'forward' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                Directa
              </button>
              <button
                type="button"
                onClick={() => setIkMode('inverse')}
                disabled={viewStep === 'link1'}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${viewStep === 'link1' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ikMode === 'inverse' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                Inversa
              </button>
            </div>
            <div className="p-4 space-y-4">
              {ikMode === 'forward' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">θ₁ (grados)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={theta1Deg}
                        onChange={(e) => setTheta1Deg(Number(e.target.value))}
                        className="flex-1 h-2.5 rounded-full bg-slate-200 accent-sky-500 focus:ring-2 focus:ring-sky-400 focus:ring-offset-1"
                      />
                      <span className="font-mono text-sm text-slate-800 w-14 tabular-nums">{theta1Deg.toFixed(1)}°</span>
                    </div>
                  </div>
                  <div className={viewStep === 'link1' ? 'opacity-60' : ''}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">θ₂ (grados) {viewStep === 'link1' && <span className="text-slate-400 font-normal">(no afecta x₁,y₁)</span>}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={theta2Deg}
                        onChange={(e) => setTheta2Deg(Number(e.target.value))}
                        className="flex-1 h-2.5 rounded-full bg-slate-200 accent-violet-500 focus:ring-2 focus:ring-violet-400 focus:ring-offset-1"
                        disabled={viewStep === 'link1'}
                      />
                      <span className="font-mono text-sm text-slate-800 w-14 tabular-nums">{theta2Deg.toFixed(1)}°</span>
                    </div>
                  </div>
                </>
              )}
              {ikMode === 'inverse' && (
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={elbowUp} onChange={(e) => setElbowUp(e.target.checked)} className="rounded accent-amber-500" />
                    Codo arriba
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-0.5">X</label>
                      <input type="number" value={targetX} onChange={(e) => setTargetX(Number(e.target.value))} className="w-full font-mono text-sm border border-slate-300 rounded-input px-2 py-1.5 focus:ring-2 focus:ring-sky-400 focus:border-sky-400" step="5" placeholder="x" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-0.5">Y</label>
                      <input type="number" value={targetY} onChange={(e) => setTargetY(Number(e.target.value))} className="w-full font-mono text-sm border border-slate-300 rounded-input px-2 py-1.5 focus:ring-2 focus:ring-sky-400 focus:border-sky-400" step="5" placeholder="y" />
                    </div>
                  </div>
                  <button type="button" onClick={handleApplyInverse} className="w-full px-4 py-2 bg-emerald-600 text-white rounded-input text-sm font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1">
                    Calcular θ₁, θ₂
                  </button>
                  {!inWorkspace && <p className="text-xs text-red-600">Punto fuera del espacio de trabajo</p>}
                </>
              )}
            </div>
          </div>

          {/* Panel: Geometría del Robot */}
          <div className="bg-white rounded-card border border-slate-200 shadow-card p-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Geometría del Robot</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">L₁</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="60" max="180" value={L1} onChange={(e) => setL1(Number(e.target.value))} className="flex-1 h-2 rounded-full bg-slate-200 accent-sky-500" />
                  <span className="font-mono text-sm w-10 tabular-nums">{L1}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">L₂</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="40" max="160" value={L2} onChange={(e) => setL2(Number(e.target.value))} className="flex-1 h-2 rounded-full bg-slate-200 accent-violet-500" />
                  <span className="font-mono text-sm w-10 tabular-nums">{L2}</span>
                </div>
              </div>
            </div>
          </div>

          {viewStep === 'full' && singularity.type && (
            <div className={`px-4 py-3 rounded-input text-sm font-medium ${singularity.isSingular ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
              {singularity.isSingular ? '⚠️ Singularidad: ' : '↳ Cerca de singularidad: '}
              {singularity.description}
              {singularity.isSingular && ' — det(J) = 0'}
            </div>
          )}

          {/* Cálculo paso a paso — tarjeta en columna derecha */}
          <div className="bg-white rounded-card border border-slate-200 shadow-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCalculoPasoAPaso((v) => !v)}
              className="w-full px-4 py-3 text-left flex items-center justify-between border-b border-slate-100 bg-amber-50/50 hover:bg-amber-50 transition"
              aria-expanded={showCalculoPasoAPaso}
            >
              <span className="text-sm font-semibold text-slate-800">Ver cómo se calcula (x, y)</span>
              <span className="text-slate-500 text-lg leading-none">{showCalculoPasoAPaso ? '−' : '+'}</span>
            </button>
            {showCalculoPasoAPaso && (
              <div className="p-4 space-y-4 border-t border-slate-100">
                <div className="rounded-input border border-sky-200 p-3 bg-sky-50/50">
                  <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-2">Paso 1 — Extremo del primer eslabón</p>
                  <p className="text-slate-600 text-xs mb-2">Por trigonometría, la posición del extremo del primer link es:</p>
                  <div className="font-mono text-xs space-y-1.5 bg-white rounded p-2.5 border border-slate-100">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span className="text-slate-600">x₁ = L₁·cos(θ₁)</span>
                      <span className="text-slate-400">=</span>
                      <span>{L1}·cos({theta1Deg.toFixed(1)}°)</span>
                      <span className="text-sky-700 font-semibold tabular-nums">= {firstLinkEnd.x.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span className="text-slate-600">y₁ = L₁·sin(θ₁)</span>
                      <span className="text-slate-400">=</span>
                      <span>{L1}·sin({theta1Deg.toFixed(1)}°)</span>
                      <span className="text-sky-700 font-semibold tabular-nums">= {firstLinkEnd.y.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs mt-1.5">
                    Mueve θ₁ en la simulación y observa cómo cambian x₁ e y₁.
                    {viewStep === 'link1' && (
                      <span className="block mt-1 text-amber-700 font-medium">→ Activa «Robot completo» para ver el Paso 2.</span>
                    )}
                  </p>
                </div>
                {viewStep === 'full' && (
                  <div className="rounded-input border border-violet-200 p-3 bg-violet-50/50">
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">Paso 2 — Segundo eslabón</p>
                    <p className="text-slate-600 text-xs mb-2">El segundo eslabón suma su contribución:</p>
                    <div className="font-mono text-xs space-y-1.5 bg-white rounded p-2.5 border border-slate-100">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span className="text-slate-600">x = x₁ + L₂·cos(θ₁+θ₂)</span>
                        <span className="tabular-nums text-violet-700 font-semibold">= {endEffector.x.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span className="text-slate-600">y = y₁ + L₂·sin(θ₁+θ₂)</span>
                        <span className="tabular-nums text-violet-700 font-semibold">= {endEffector.y.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs mt-1.5">Al mover θ₁ o θ₂ se actualizan todos los términos.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      <Actividades endEffector={endEffector} L1={L1} L2={L2} />
    </>
  );
}
