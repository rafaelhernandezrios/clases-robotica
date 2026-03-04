/**
 * Cinemática directa e inversa para un robot planar 2R (2 grados de libertad).
 * Convención: ángulos en radianes, θ1 y θ2 respecto al eje X (sentido antihorario positivo).
 * Origen en la base del robot; eje Y hacia arriba en pantalla.
 */

const DEG2RAD = Math.PI / 180;

/**
 * Cinemática directa: dados (θ1, θ2) y longitudes L1, L2, devuelve (x, y) del efector final.
 * @param {number} theta1 - Ángulo de la articulación 1 (rad)
 * @param {number} theta2 - Ángulo de la articulación 2 (rad)
 * @param {number} L1 - Longitud del eslabón 1
 * @param {number} L2 - Longitud del eslabón 2
 * @returns {{ x: number, y: number }}
 */
export function forwardKinematics(theta1, theta2, L1 = 1, L2 = 1) {
  const x = L1 * Math.cos(theta1) + L2 * Math.cos(theta1 + theta2);
  const y = L1 * Math.sin(theta1) + L2 * Math.sin(theta1 + theta2);
  return { x, y };
}

/**
 * Cinemática inversa (configuración "codo arriba"): dado (x, y) devuelve (θ1, θ2).
 * Retorna null si el punto está fuera del espacio de trabajo.
 * @param {number} x
 * @param {number} y
 * @param {number} L1
 * @param {number} L2
 * @returns {{ theta1: number, theta2: number } | null}
 */
export function inverseKinematics(x, y, L1 = 1, L2 = 1) {
  const d = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (d < -1 || d > 1) return null; // Fuera de alcance

  const theta2 = Math.atan2(Math.sqrt(1 - d * d), d);
  const k1 = L1 + L2 * Math.cos(theta2);
  const k2 = L2 * Math.sin(theta2);
  const theta1 = Math.atan2(y, x) - Math.atan2(k2, k1);

  return { theta1, theta2 };
}

/**
 * Segunda solución de cinemática inversa (configuración "codo abajo").
 */
export function inverseKinematicsElbowDown(x, y, L1 = 1, L2 = 1) {
  const d = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (d < -1 || d > 1) return null;

  const theta2 = Math.atan2(-Math.sqrt(1 - d * d), d);
  const k1 = L1 + L2 * Math.cos(theta2);
  const k2 = L2 * Math.sin(theta2);
  const theta1 = Math.atan2(y, x) - Math.atan2(k2, k1);

  return { theta1, theta2 };
}

/**
 * Convierte grados a radianes.
 */
export function deg2rad(deg) {
  return deg * DEG2RAD;
}

/**
 * Convierte radianes a grados.
 */
export function rad2deg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Determinante del Jacobiano para el robot 2R (posición del efector).
 * J relaciona velocidades articulares con velocidad cartesiana: [ẋ, ẏ]ᵀ = J [θ̇₁, θ̇₂]ᵀ.
 * det(J) = L₁·L₂·sin(θ₂). Se anula cuando sin(θ₂)=0, es decir θ₂=0 (brazo extendido) o θ₂=±π (brazo plegado).
 * @param {number} theta2 - Ángulo de la articulación 2 (rad)
 * @param {number} L1
 * @param {number} L2
 * @returns {number}
 */
export function jacobianDeterminant(theta2, L1 = 1, L2 = 1) {
  return L1 * L2 * Math.sin(theta2);
}

/** |sin(θ₂)| por debajo de esto se considera "cerca" de singularidad (~15°) */
const NEAR_SINGULARITY_SIN = Math.sin((15 * Math.PI) / 180);

/**
 * Información de singularidad para la configuración actual.
 * @param {number} theta2 - Ángulo de la articulación 2 (rad)
 * @returns {{ isSingular: boolean, isNearSingular: boolean, type: 'extended'|'folded'|null, detJ: number, description: string }}
 */
export function getSingularityInfo(theta2) {
  const sinTheta2 = Math.sin(theta2);
  const cosTheta2 = Math.cos(theta2);

  const isSingular = Math.abs(sinTheta2) < 1e-6;
  const isNearSingular = Math.abs(sinTheta2) < NEAR_SINGULARITY_SIN && !isSingular;

  let type = null;
  let description = '';

  if (Math.abs(sinTheta2) < NEAR_SINGULARITY_SIN) {
    type = cosTheta2 > 0 ? 'extended' : 'folded';
    description = type === 'extended' ? 'Brazo extendido (θ₂ ≈ 0°)' : 'Brazo plegado (θ₂ ≈ ±180°)';
  }

  return {
    isSingular,
    isNearSingular,
    type,
    detJ: sinTheta2,
    description,
  };
}
