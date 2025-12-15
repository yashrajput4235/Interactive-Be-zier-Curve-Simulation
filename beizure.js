import React, { useRef, useEffect, useState } from 'react';

const BezierPhysicsSimulation = () => {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('mouse'); // 'mouse' or 'gyro'
  const [showTangents, setShowTangents] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [gyroSupported, setGyroSupported] = useState(false);
  const [gyroPermission, setGyroPermission] = useState('unknown');
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ============ MATH MODULE ============
    class Vector2 {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }

      add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
      }

      subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
      }

      multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
      }

      length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
      }

      normalize() {
        const len = this.length();
        if (len === 0) return new Vector2(0, 0);
        return new Vector2(this.x / len, this.y / len);
      }
    }

    // Cubic Bézier curve computation
    const bezierPoint = (t, p0, p1, p2, p3) => {
      const t1 = 1 - t;
      const t1_2 = t1 * t1;
      const t1_3 = t1_2 * t1;
      const t_2 = t * t;
      const t_3 = t_2 * t;

      const x = t1_3 * p0.x + 3 * t1_2 * t * p1.x + 3 * t1 * t_2 * p2.x + t_3 * p3.x;
      const y = t1_3 * p0.y + 3 * t1_2 * t * p1.y + 3 * t1 * t_2 * p2.y + t_3 * p3.y;

      return new Vector2(x, y);
    };

    // Tangent vector computation (derivative of Bézier)
    const bezierTangent = (t, p0, p1, p2, p3) => {
      const t1 = 1 - t;
      const t1_2 = t1 * t1;
      const t_2 = t * t;

      const dx = 3 * t1_2 * (p1.x - p0.x) + 6 * t1 * t * (p2.x - p1.x) + 3 * t_2 * (p3.x - p2.x);
      const dy = 3 * t1_2 * (p1.y - p0.y) + 6 * t1 * t * (p2.y - p1.y) + 3 * t_2 * (p3.y - p2.y);

      return new Vector2(dx, dy);
    };

    // ============ PHYSICS MODULE ============
    class SpringPoint {
      constructor(x, y, fixed = false) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.target = new Vector2(x, y);
        this.fixed = fixed;
        
        // Spring physics parameters
        this.springConstant = 0.15;
        this.damping = 0.85;
      }

      update(deltaTime = 1) {
        if (this.fixed) return;

        // Spring force: F = -k * displacement
        const displacement = this.position.subtract(this.target);
        const springForce = displacement.multiply(-this.springConstant);

        // Damping force: F = -damping * velocity
        const dampingForce = this.velocity.multiply(-this.damping);

        // Total acceleration
        const acceleration = springForce.add(dampingForce);

        // Update velocity and position
        this.velocity = this.velocity.add(acceleration.multiply(deltaTime));
        this.position = this.position.add(this.velocity.multiply(deltaTime));
      }

      setTarget(x, y) {
        this.target = new Vector2(x, y);
      }
    }

    // ============ CONTROL POINTS ============
    const cw = canvas.width;
    const ch = canvas.height;
    
    const points = [
      new SpringPoint(cw * 0.2, ch * 0.5, true),  // P0 - fixed
      new SpringPoint(cw * 0.4, ch * 0.3, false), // P1 - dynamic
      new SpringPoint(cw * 0.6, ch * 0.7, false), // P2 - dynamic
      new SpringPoint(cw * 0.8, ch * 0.5, true)   // P3 - fixed
    ];

    // ============ INPUT HANDLING ============
    let mousePos = new Vector2(cw / 2, ch / 2);
    let gyroData = { beta: 0, gamma: 0, alpha: 0 };
    let gyroActive = false;

    // Mouse movement
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.x = e.clientX - rect.left;
      mousePos.y = e.clientY - rect.top;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    // Gyroscope handling
    const handleOrientation = (e) => {
      gyroData.beta = e.beta || 0;   // pitch (x-axis) -180 to 180
      gyroData.gamma = e.gamma || 0;  // roll (y-axis) -90 to 90
      gyroData.alpha = e.alpha || 0;  // yaw (z-axis) 0 to 360
      gyroActive = true;
    };

    // Check for gyroscope support
    if (window.DeviceOrientationEvent) {
      setGyroSupported(true);
      
      // iOS 13+ requires permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        setGyroPermission('needed');
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }

    // ============ RENDERING MODULE ============
    const drawCurve = () => {
      // Use path2D for better performance
      const path = new Path2D();
      const steps = 100;
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const point = bezierPoint(t, points[0].position, points[1].position, 
                                   points[2].position, points[3].position);
        
        if (i === 0) {
          path.moveTo(point.x, point.y);
        } else {
          path.lineTo(point.x, point.y);
        }
      }
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
      ctx.shadowBlur = 10;
      ctx.stroke(path);
      ctx.shadowBlur = 0;
    };

    const drawTangents = () => {
      const tangentCount = 12;
      const tangentLength = 40;

      for (let i = 0; i <= tangentCount; i++) {
        const t = i / tangentCount;
        const point = bezierPoint(t, points[0].position, points[1].position, 
                                   points[2].position, points[3].position);
        const tangent = bezierTangent(t, points[0].position, points[1].position,
                                       points[2].position, points[3].position);
        const normalized = tangent.normalize();

        const start = point.subtract(normalized.multiply(tangentLength / 2));
        const end = point.add(normalized.multiply(tangentLength / 2));

        // Tangent line
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Arrowhead
        const arrowSize = 8;
        const angle = Math.atan2(normalized.y, normalized.x);
        
        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - arrowSize * Math.cos(angle - Math.PI / 6),
          end.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          end.x - arrowSize * Math.cos(angle + Math.PI / 6),
          end.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawControlPoints = () => {
      points.forEach((point, i) => {
        // Control lines
        if (i === 1) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.moveTo(points[0].position.x, points[0].position.y);
          ctx.lineTo(point.position.x, point.position.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (i === 2) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.moveTo(points[3].position.x, points[3].position.y);
          ctx.lineTo(point.position.x, point.position.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Control point circles
        ctx.beginPath();
        ctx.fillStyle = point.fixed ? '#10b981' : '#f59e0b';
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.arc(point.position.x, point.position.y, point.fixed ? 8 : 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    };

    // ============ UPDATE LOOP ============
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = performance.now();

    const updatePhysics = () => {
      const currentTime = performance.now();
      const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2); // Cap at 2 frames
      lastTime = currentTime;

      // FPS calculation
      frameCount++;
      if (currentTime - fpsTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        fpsTime = currentTime;
      }

      if (mode === 'mouse') {
        // Mouse mode: control points follow mouse with offset
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const offsetX = (mousePos.x - centerX) * 0.3;
        const offsetY = (mousePos.y - centerY) * 0.3;

        points[1].setTarget(canvas.width * 0.4 + offsetX, canvas.height * 0.3 + offsetY);
        points[2].setTarget(canvas.width * 0.6 - offsetX, canvas.height * 0.7 - offsetY);
      } else if (mode === 'gyro' && gyroActive) {
        // Gyroscope mode: map device orientation to control points
        const offsetX = (gyroData.gamma / 90) * 150; // -90 to 90 degrees
        const offsetY = ((gyroData.beta - 90) / 90) * 150; // Centered around 90 degrees

        points[1].setTarget(canvas.width * 0.4 + offsetX, canvas.height * 0.3 + offsetY);
        points[2].setTarget(canvas.width * 0.6 - offsetX, canvas.height * 0.7 - offsetY);
      }

      // Update spring physics
      points.forEach(point => point.update(deltaTime));
    };

    const render = () => {
      // Clear canvas with solid fill (faster than clearRect)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid (only if needed, can be toggled for performance)
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 1;
      const gridSpacing = 50;
      
      // Vertical lines
      for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      // Horizontal lines
      for (let y = 0; y < canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw curve and tangents
      drawCurve();
      if (showTangents) drawTangents();
      if (showControls) drawControlPoints();
    };

    const animate = () => {
      updatePhysics();
      render();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(animationId);
    };
  }, [mode, showTangents, showControls]);

  const requestGyroPermission = async () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', (e) => {
            // Event handling is set up in the main effect
          });
          setGyroPermission('granted');
          setMode('gyro');
        } else {
          setGyroPermission('denied');
        }
      } catch (error) {
        console.error('Error requesting gyroscope permission:', error);
        setGyroPermission('denied');
      }
    }
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col">
      {/* Control Panel */}
      <div className="bg-slate-800 p-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">
            Interactive Bézier Curve Simulation
          </h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('mouse')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'mouse'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Mouse Mode
              </button>
              
              {gyroSupported && (
                gyroPermission === 'needed' ? (
                  <button
                    onClick={requestGyroPermission}
                    className="px-4 py-2 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                  >
                    Enable Gyro
                  </button>
                ) : gyroPermission === 'granted' ? (
                  <button
                    onClick={() => setMode('gyro')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      mode === 'gyro'
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Gyro Mode
                  </button>
                ) : null
              )}
            </div>

            {/* Toggle Options */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowTangents(!showTangents)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showTangents
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Tangents {showTangents ? 'ON' : 'OFF'}
              </button>
              
              <button
                onClick={() => setShowControls(!showControls)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showControls
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Controls {showControls ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Info Text */}
          <div className="mt-3 text-sm text-slate-400">
            {mode === 'mouse' && 'Move your mouse to control the curve'}
            {mode === 'gyro' && 'Tilt your device to control the curve'}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full"
      />

      {/* Info Panel */}
      <div className="bg-slate-800 p-3 text-xs text-slate-400 flex justify-between items-center">
        <div className="max-w-6xl mx-auto flex-1">
          <span className="text-blue-400">Blue curve:</span> Cubic Bézier with spring physics • 
          <span className="text-red-400"> Red arrows:</span> Tangent vectors (derivatives) • 
          <span className="text-green-400"> Green dots:</span> Fixed endpoints • 
          <span className="text-amber-400"> Orange dots:</span> Dynamic control points
        </div>
        <div className={`px-3 py-1 rounded font-mono font-bold ${
          fps >= 55 ? 'bg-green-900 text-green-300' : 
          fps >= 40 ? 'bg-yellow-900 text-yellow-300' : 
          'bg-red-900 text-red-300'
        }`}>
          {fps} FPS
        </div>
      </div>
    </div>
  );
};

export default BezierPhysicsSimulation;
