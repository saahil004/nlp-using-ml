import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';

// Emotion -> accent color mapping. Falls back to a neutral violet when unknown.
const EMOTION_COLORS = {
  joy: '#FFB84D',
  happy: '#FFB84D',
  happiness: '#FFB84D',
  sadness: '#5C8FFF',
  sad: '#5C8FFF',
  anger: '#FF5C5C',
  angry: '#FF5C5C',
  fear: '#B37FFF',
  surprise: '#4FD8C4',
  love: '#FF7AC6',
  disgust: '#8FBF4F',
  neutral: '#9A96C4',
};

const DEFAULT_COLOR = '#9A96C4';

function getColor(emotion) {
  if (!emotion) return DEFAULT_COLOR;
  return EMOTION_COLORS[emotion.toLowerCase()] || DEFAULT_COLOR;
}

export default function App() {
  const [sentence, setSentence] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canvasWrapRef = useRef(null);
  const sceneRef = useRef({});
  const targetColorRef = useRef(new THREE.Color(DEFAULT_COLOR));
  const pulseRef = useRef(0);

  // --- Three.js ambient particle field, set up once ---
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    wrap.appendChild(renderer.domElement);

    // Particle field: points scattered in a loose sphere volume
    const COUNT = 900;
    const positions = new Float32Array(COUNT * 3);
    const basePositions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 3.2 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(DEFAULT_COLOR),
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let frameId;
    let t = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      t += dt;

      // Gentle ambient rotation
      points.rotation.y += dt * 0.06;
      points.rotation.x = Math.sin(t * 0.15) * 0.08;

      // Pulse decays over time; spikes on new predictions
      pulseRef.current = Math.max(0, pulseRef.current - dt * 0.6);
      const pulse = pulseRef.current;

      const posAttr = geometry.attributes.position;
      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        const bx = basePositions[ix];
        const by = basePositions[ix + 1];
        const bz = basePositions[ix + 2];
        const wobble = 1 + 0.05 * Math.sin(t * 0.8 + i) + pulse * 0.35 * Math.sin(t * 3 + i);
        posAttr.array[ix] = bx * wobble;
        posAttr.array[ix + 1] = by * wobble;
        posAttr.array[ix + 2] = bz * wobble;
      }
      posAttr.needsUpdate = true;

      // Smoothly interpolate color toward target
      material.color.lerp(targetColorRef.current, dt * 2.5);
      material.size = 0.045 + pulse * 0.03;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    sceneRef.current = { renderer, wrap };

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      wrap.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
    };
  }, []);

  const handlePredict = async () => {
    if (!sentence.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setResult(data);
      targetColorRef.current = new THREE.Color(getColor(data.emotion));
      pulseRef.current = 1;
    } catch (err) {
      setError('Could not reach the classifier. Check that the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handlePredict();
  };

  const accent = getColor(result?.emotion);

  return (
    <div style={styles.page}>
      <div ref={canvasWrapRef} style={styles.canvasWrap} />

      <div style={styles.card}>
        <div style={styles.eyebrow}>MOOD READING</div>
        <h1 style={styles.title}>What's the feeling here?</h1>
        <p style={styles.subtitle}>
          Type a sentence and the field above will shift to match its emotion.
        </p>

        <div style={styles.inputRow}>
          <input
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="I finally finished the project and I'm exhausted but proud..."
            style={styles.input}
          />
          <button
            onClick={handlePredict}
            disabled={loading || !sentence.trim()}
            style={{
              ...styles.button,
              opacity: loading || !sentence.trim() ? 0.5 : 1,
              cursor: loading || !sentence.trim() ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Reading…' : 'Read it'}
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div
          style={{
            ...styles.resultWrap,
            maxHeight: result ? 160 : 0,
            opacity: result ? 1 : 0,
            marginTop: result ? 28 : 0,
          }}
        >
          {result && (
            <>
              <div style={{ ...styles.emotionLabel, color: accent }}>
                {result.emotion}
              </div>
              <div style={styles.confidenceRow}>
                <div style={styles.confidenceTrack}>
                  <div
                    style={{
                      ...styles.confidenceFill,
                      width: `${Math.round((result.confidence ?? 0) * 100)}%`,
                      background: accent,
                    }}
                  />
                </div>
                <span style={styles.confidenceLabel}>
                  {((result.confidence ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    background: 'radial-gradient(circle at 50% 20%, #1C1A38 0%, #0F0E22 60%, #0A0918 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflow: 'hidden',
  },
  canvasWrap: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'relative',
    zIndex: 2,
    width: 'min(90vw, 480px)',
    padding: '40px 36px',
    borderRadius: 20,
    background: 'rgba(20, 19, 43, 0.55)',
    border: '1px solid rgba(154, 150, 196, 0.25)',
    backdropFilter: 'blur(18px)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: '0.18em',
    color: '#9A96C4',
    fontWeight: 600,
    marginBottom: 10,
  },
  title: {
    fontFamily: "'Fraunces', Georgia, serif",
    fontSize: 30,
    color: '#F2F0FA',
    margin: '0 0 8px 0',
    lineHeight: 1.2,
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 14,
    color: '#B8B4DA',
    lineHeight: 1.5,
    margin: '0 0 28px 0',
  },
  inputRow: {
    display: 'flex',
    gap: 10,
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    fontSize: 15,
    borderRadius: 12,
    border: '1px solid rgba(154, 150, 196, 0.3)',
    background: 'rgba(255,255,255,0.04)',
    color: '#F2F0FA',
    outline: 'none',
  },
  button: {
    padding: '14px 22px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #6B67D6, #9A5FD6)',
    color: '#fff',
    transition: 'opacity 0.2s ease',
    whiteSpace: 'nowrap',
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    color: '#FF8A8A',
  },
  resultWrap: {
    overflow: 'hidden',
    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  emotionLabel: {
    fontFamily: "'Fraunces', Georgia, serif",
    fontSize: 34,
    fontWeight: 600,
    textTransform: 'capitalize',
    marginBottom: 14,
    transition: 'color 0.4s ease',
  },
  confidenceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  confidenceTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease',
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#B8B4DA',
    fontFamily: "'JetBrains Mono', monospace",
    minWidth: 48,
    textAlign: 'right',
  },
};