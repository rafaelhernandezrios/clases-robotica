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
const CX = 280;
const CY = 280;

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

  const theta1 = deg2rad(theta1Deg);
  const theta2 = deg2rad(theta2Deg);

  const firstLinkEnd = useMemo(() => ({
    x: L1 * Math.cos(theta1),
    y: L1 * Math.sin(theta1),
  }), [theta1, L1]);

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
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-6xl mx-auto">
      {/* Panel de teoría — flujo Clase 3 */}
      <section className="lg:w-96 flex-shrink-0 space-y-4 max-h-[85vh] overflow-y-auto pr-2">
        <h2 className="text-xl font-bold text-slate-800 border-b border-amber-400 pb-2 sticky top-0 bg-white/95 backdrop-blur py-1 -mt-1">
          Contenido Clase 3
        </h2>

        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <h3 className="font-bold text-slate-800 mb-1">1. ¿Qué estudia la cinemática?</h3>
            <p>
              La cinemática estudia el <strong>movimiento</strong> sin considerar las fuerzas que lo causan. 
              El estado de un robot se describe mediante el <strong>vector de variables articulares</strong>:
            </p>
            <div className="bg-slate-100 rounded-lg p-2 font-mono text-xs mt-1.5">
              q = (θ₁, θ₂)ᵀ
            </div>
            <p className="mt-1.5">
              Para nuestro robot 2R, <strong>q</strong> son los ángulos de las dos articulaciones. 
              En la simulación, al mover θ₁ y θ₂ estás cambiando <strong>q</strong>.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-1">2. El problema fundamental de la robótica</h3>
            <p>
              Consiste en <strong>relacionar los ángulos de las articulaciones con la posición del efector final</strong>. 
              Dos direcciones: <em>cinemática directa</em> (ángulos → posición) y <em>cinemática inversa</em> (posición → ángulos).
            </p>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-2">
            <h3 className="font-bold text-slate-800">3. Modelo geométrico paso a paso</h3>
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

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <h3 className="font-bold text-slate-800">4. Cinemática inversa y singularidades</h3>
            <p>
              <strong>Cinemática inversa:</strong> Dado un (x, y) deseado, hallar (θ₁, θ₂). Es más compleja: puede haber varias soluciones (codo arriba / codo abajo) o ninguna si el punto está fuera del alcance.
            </p>
            <p>
              <strong>Singularidades:</strong> Configuraciones donde el robot “pierde” un grado de libertad en el espacio cartesiano (det(J)=0). Implican que no puede mover el efector en ciertas direcciones sin velocidades articulares muy altas, y complican el <strong>control y la planeación del movimiento</strong>. En el 2R ocurren con brazo extendido (θ₂≈0°) o plegado (θ₂≈±180°).
            </p>
          </div>

          <div className="text-xs text-slate-500 pt-1">
            Modo simulación: <strong>{ikMode === 'forward' ? 'Directa (mueve ángulos)' : 'Inversa (mueve objetivo)'}</strong>
          </div>
          <p className="text-sm text-emerald-700 font-medium pt-2 border-t border-slate-200 mt-4">
            ↓ Más abajo: <strong>Actividades</strong> para calcular, llevar el robot a un punto y programar la cinemática directa.
          </p>
        </div>
      </section>

      {/* Visualización y controles */}
      <div className="flex-1 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <svg
            viewBox="0 0 560 560"
            className="w-full h-auto max-h-[400px] bg-gradient-to-b from-slate-50 to-slate-100"
            style={{ touchAction: 'none' }}
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
            <line x1={CX} y1={CY} x2={CX + 180} y2={CY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />
            <line x1={CX} y1={CY} x2={CX} y2={CY - 180} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />
            <text x={CX + 185} y={CY + 4} fill="#64748b" fontSize="12">x</text>
            <text x={CX - 10} y={CY - 185} fill="#64748b" fontSize="12">y</text>

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

          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <span className="text-xs font-semibold text-slate-600">Vista del modelo:</span>
              <button
                type="button"
                onClick={() => setViewStep('link1')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewStep === 'link1' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                Solo primer eslabón
              </button>
              <button
                type="button"
                onClick={() => setViewStep('full')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewStep === 'full' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                Robot completo
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">θ₁ (grados)</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={theta1Deg}
                  onChange={(e) => setTheta1Deg(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none bg-slate-200 accent-sky-500"
                />
                <span className="font-mono text-sm text-slate-700 ml-2">{theta1Deg.toFixed(1)}°</span>
              </div>
              <div className={viewStep === 'link1' ? 'opacity-60' : ''}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">θ₂ (grados) {viewStep === 'link1' && '(no afecta x₁,y₁)'}</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={theta2Deg}
                  onChange={(e) => setTheta2Deg(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none bg-slate-200 accent-violet-500"
                  disabled={viewStep === 'link1'}
                />
                <span className="font-mono text-sm text-slate-700 ml-2">{theta2Deg.toFixed(1)}°</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">L₁ (px)</label>
                <input
                  type="range"
                  min="60"
                  max="180"
                  value={L1}
                  onChange={(e) => setL1(Number(e.target.value))}
                  className="w-24 h-2 rounded-lg bg-slate-200 accent-sky-500"
                />
                <span className="font-mono text-xs ml-1">{L1}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">L₂ (px)</label>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={L2}
                  onChange={(e) => setL2(Number(e.target.value))}
                  className="w-24 h-2 rounded-lg bg-slate-200 accent-violet-500"
                />
                <span className="font-mono text-xs ml-1">{L2}</span>
              </div>
              <div className="font-mono text-sm bg-white px-3 py-1.5 rounded border border-slate-200">
                {viewStep === 'link1' ? (
                  <><strong>(x₁, y₁):</strong> {firstLinkEnd.x.toFixed(1)}, {firstLinkEnd.y.toFixed(1)}</>
                ) : (
                  <><strong>Efector (x, y):</strong> {endEffector.x.toFixed(1)}, {endEffector.y.toFixed(1)}</>
                )}
              </div>
              {viewStep === 'full' && (
                <div className={`font-mono text-sm px-3 py-1.5 rounded border ${isSingularOrNear ? 'bg-amber-100 border-amber-400' : 'bg-white border-slate-200'}`} title="det(J) = L₁·L₂·sin(θ₂)">
                  <strong>det(J):</strong> {detJ.toFixed(2)}
                </div>
              )}
            </div>
            {viewStep === 'full' && singularity.type && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-medium ${singularity.isSingular ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                {singularity.isSingular ? '⚠️ Singularidad: ' : '↳ Cerca de singularidad: '}
                {singularity.description}
                {singularity.isSingular && ' — det(J) = 0'}
              </div>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={() => setIkMode('forward')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${ikMode === 'forward' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                Cinemática directa
              </button>
              <button
                type="button"
                onClick={() => setIkMode('inverse')}
                disabled={viewStep === 'link1'}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewStep === 'link1' ? 'opacity-50 cursor-not-allowed bg-slate-200' : ikMode === 'inverse' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                Cinemática inversa
              </button>
              {ikMode === 'inverse' && (
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={elbowUp}
                      onChange={(e) => setElbowUp(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    Codo arriba
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={targetX}
                      onChange={(e) => setTargetX(Number(e.target.value))}
                      className="w-16 font-mono text-sm border border-slate-300 rounded px-2 py-1"
                      step="5"
                    />
                    <input
                      type="number"
                      value={targetY}
                      onChange={(e) => setTargetY(Number(e.target.value))}
                      className="w-16 font-mono text-sm border border-slate-300 rounded px-2 py-1"
                      step="5"
                    />
                    <button
                      type="button"
                      onClick={handleApplyInverse}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                    >
                      Calcular θ₁, θ₂
                    </button>
                  </div>
                  {!inWorkspace && (
                    <span className="text-xs text-red-600">Punto fuera del espacio de trabajo</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    <Actividades endEffector={endEffector} L1={L1} L2={L2} />
    </>
  );
}
