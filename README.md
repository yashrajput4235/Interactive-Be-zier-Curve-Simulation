(The file `/Users/yashrajput/Desktop/Interactive Bézier Curve Simulation/README.md` exists, but is empty)
# Interactive Bézier Curve Simulation

A lightweight interactive Bézier curve simulator implemented as a React component. It visualizes a cubic Bézier curve whose control points are driven by simple spring physics, with optional mouse or device-gyroscope control. This repository contains the original React component (`beizure.js`) and a small quick-start `index.html` for local testing.

Key goals:
- Demonstrate cubic Bézier evaluation and tangent vectors (derivatives).
- Provide an interactive, physics-driven control point system (spring + damping).
- Offer both mouse and gyroscope (mobile) input modes.

---

## Quick Demo (Local)

1. Start a static server from the project root (macOS / Linux / WSL):

```bash
python3 -m http.server 8000
```

2. Open the demo in your browser:

```bash
open http://localhost:8000
```

This serves the included `index.html`, which mounts a browser-friendly copy of the React component for quick testing (uses CDN React + Babel; development-only).

---

## Files

- `beizure.js` — Original React component (ES module / JSX). Exports the `BezierPhysicsSimulation` component. Intended to be used inside a React application.
- `index.html` — Quick demo page that embeds a transpiled copy of the component via `babel-standalone` and CDN React for local testing.
- `README.md` — This documentation.

---

## Features

- Cubic Bézier curve drawing (100 sample steps by default).
- Tangent vector visualization (arrowheads) along the curve.
- Spring-based control point dynamics (spring constant and damping configured in code).
- Input modes:
	- Mouse mode: move the cursor to influence control points.
	- Gyro mode: (mobile devices) tilt to influence the curve (permission required on some platforms).
- Lightweight rendering using 2D Canvas and Path2D for performance.

---

## How it works (high level)

- The component creates a full-viewport layout with a Canvas element used for rendering.
- Math primitives:
	- `Vector2` for 2D vector operations (add, subtract, multiply, normalize).
	- `bezierPoint(t, p0, p1, p2, p3)` evaluates the cubic Bézier at parameter `t`.
	- `bezierTangent(t, ...)` computes the derivative (tangent) at `t`.
- Physics:
	- `SpringPoint` holds `position`, `velocity`, `target` and has `update(deltaTime)` implementing a simple spring-damper: acceleration = -k * displacement + -damping * velocity.
	- Two inner control points (P1, P2) are dynamic (spring physics); endpoints (P0, P3) are fixed.
- Rendering loop:
	- `requestAnimationFrame` drives `animate()` → `updatePhysics()` → `render()`.
	- Rendering draws a background, optional grid, the Bézier curve, tangents, and control points.

---

## Usage

Option A — Quick local test (no build system)

1. Run the static server and open `http://localhost:8000` (see Quick Demo above).

Option B — Integrate into a React app

1. Copy `beizure.js` into your React project (e.g. `src/components/BezierPhysicsSimulation.js`).
2. Import and render it:

```jsx
import BezierPhysicsSimulation from './components/BezierPhysicsSimulation';

function App() {
	return <BezierPhysicsSimulation />;
}

export default App;
```

3. Build/run your app as usual (Vite, CRA, Next.js, etc.).

Notes when embedding in a React app:
- `beizure.js` uses hooks (`useRef`, `useEffect`, `useState`) and expects to run in a browser (it uses `window`, `document`, and `DeviceOrientationEvent`).
- If your bundler supports JSX and ES modules (Vite / CRA) the file can be used unchanged. If using a different setup, ensure React is available and the file compiles.

---

## Configuration & Tuning

Parameters you may want to tune inside `beizure.js`:
- `SpringPoint.springConstant` (default `0.15`) — larger values make points snap faster to targets.
- `SpringPoint.damping` (default `0.85`) — larger values increase damping (less oscillation).
- `steps` in `drawCurve()` (default `100`) — higher value increases curve sampling accuracy at CPU cost.
- `tangentCount` / `tangentLength` in `drawTangents()` — controls how many and how long tangent arrows are.

---

## Troubleshooting

- Blank page / nothing visible:
	- Confirm you opened `index.html` via an HTTP server (some browsers block `deviceorientation` and some resources when opened via `file://`).
	- Check browser console for errors (open DevTools → Console).
- Gyroscope not working on iOS:
	- iOS requires explicit permission via `DeviceOrientationEvent.requestPermission()` (UI button is provided in the component).
	- Test on a physical device; most desktop browsers won’t provide orientation data.
- Component prints nothing to Node: this is a browser-only component and doesn't produce terminal output when run with Node.

---

## Development & Next Steps (suggestions)

- Convert the project to a proper React app using Vite or Create React App to get a production-ready build setup.
- Extract physics and math utilities into separate modules for easier unit testing.
- Add props to the component to make physics parameters configurable from the parent app.
- Add tests for math functions (`bezierPoint`, `bezierTangent`, `Vector2`) using Jest.

---

## License

This project does not include a license file. If you want this repository to be open-source, consider adding an `LICENSE` (for example, the MIT License).

---

If you'd like, I can:
- Convert this into a small Vite project with the component wired up as a module.
- Add a `package.json` and npm scripts for development and build.
- Add a short contributors and license file.

Tell me which next step you prefer and I will implement it.
