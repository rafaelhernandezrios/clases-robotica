# Clases robótica — Cinemática 2 GDL

Página web didáctica (Clase 3) para que los estudiantes aprendan **cinemática directa e inversa** de un robot planar de 2 grados de libertad (2R), con visualización, singularidades y actividades (cálculo, llevar al punto, programar en JS).

## Cómo ejecutar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Clase 3: cinemática 2R, simulación y actividades"
git branch -M main
git remote add origin https://github.com/rafaelhernandezrios/clases-robotica.git
git push -u origin main
```

## Deploy en Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (con tu cuenta de GitHub si quieres).
2. **Add New** → **Project** y importa el repo `rafaelhernandezrios/clases-robotica`.
3. Vercel detecta Vite solo: **Build Command** `npm run build`, **Output Directory** `dist`. No hace falta cambiar nada.
4. **Deploy**. La URL quedará tipo `clases-robotica-xxx.vercel.app`.

## Contenido

- **Teoría**: fórmulas de cinemática directa (x, y en función de θ₁, θ₂) e inversa.
- **Cinemática directa**: sliders para θ₁ y θ₂; se actualiza la posición (x, y) del efector final.
- **Cinemática inversa**: introduces (x, y) objetivo, eliges codo arriba/abajo y calculas los ángulos para alcanzar ese punto.
- **Longitudes L₁ y L₂** ajustables para ver cómo cambia el espacio de trabajo.

## Tecnologías

- **React** + **Vite**
- **Tailwind CSS**
- SVG para la visualización del robot (sin dependencias 3D)

## Estructura

- `src/utils/kinematics.js`: cinemática directa e inversa 2R.
- `src/components/Robot2R.jsx`: visualización SVG y controles.
