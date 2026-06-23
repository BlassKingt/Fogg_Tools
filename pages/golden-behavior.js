// pages/golden-behavior.js
import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';

const GOLDEN_STORAGE_KEY = 'fogg-tools-golden-behavior-state-v1';
const GOLDEN_TRANSFER_KEY = 'fogg-tools-transfer-golden-behaviors-v1';

function generateId() {
  return 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

const STEP_WISH = 0;
const STEP_CLUSTER = 1;
const STEP_IMPACT_SORT = 2;
const STEP_EASE_SORT = 3;
const STEP_RESULT = 4;
const TOTAL_STEPS = 5;

const FOCUS_WIDTH = 480;
const FOCUS_HEIGHT = 460;
const FOCUS_PAD_LEFT = 40;
const FOCUS_PAD_RIGHT = 40;
const FOCUS_PAD_TOP = 40;
const FOCUS_PAD_BOTTOM = 40;
const PLOT_W = FOCUS_WIDTH - FOCUS_PAD_LEFT - FOCUS_PAD_RIGHT;
const PLOT_H = FOCUS_HEIGHT - FOCUS_PAD_TOP - FOCUS_PAD_BOTTOM;

// 坐标系原点（交叉点）位于焦点图画布的正中央
const ORIGIN_X = FOCUS_PAD_LEFT + PLOT_W / 2;
const ORIGIN_Y = FOCUS_PAD_TOP + PLOT_H / 2;

export default function Home() {
  const [step, setStep] = useState(STEP_WISH);
  const [wish, setWish] = useState('');
  const [behaviors, setBehaviors] = useState([]);
  const [positions, setPositions] = useState({});
  const [placed, setPlaced] = useState(new Set());
  const [dragging, setDragging] = useState(null);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);

  const focusRef = useRef(null);
  const wishRef = useRef(null);
  const inputRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const hydratedRef = useRef(false);

  const showMsg = useCallback((msg, type = 'info') => {
    setMessage(msg);
    setMsgType(type);
    if (type === 'success' || type === 'warning') setTimeout(() => { setMessage(''); setMsgType(''); }, 4000);
  }, []);

  const confirmWish = useCallback(() => {
    const val = wish.trim() || '减轻压力';
    setWish(val);
    setStep(STEP_CLUSTER);
    showMsg('好！接下来请写下能帮你实现这个愿望的行为', 'success');
  }, [wish, showMsg]);

  const addBehavior = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text) { showMsg('请输入一个具体的行为', 'warning'); return; }
    if (behaviors.some(b => b.text === text)) { showMsg('这个行为已经存在啦', 'warning'); return; }
    setBehaviors(prev => [...prev, { id: generateId(), text }]);
    el.value = '';
    el.focus();
  }, [behaviors, showMsg]);

  const removeBehavior = useCallback((id) => setBehaviors(prev => prev.filter(b => b.id !== id)), []);

  const goToImpactSort = useCallback(() => {
    if (behaviors.length === 0) { showMsg('至少添加一个行为吧', 'warning'); return; }
    setPositions({});
    setPlaced(new Set());
    setStep(STEP_IMPACT_SORT);
    showMsg('右侧是待排序卡片，请先拖入焦点图（只能纵向移动）', 'info');
  }, [behaviors, showMsg]);

  const confirmCluster = useCallback(() => {
    if (behaviors.length < 10) showMsg('建议至少10个行为，不过您也可以先继续', 'warning');
    setPositions({});
    setPlaced(new Set());
    setStep(STEP_IMPACT_SORT);
    showMsg('右侧是待排序卡片，请先拖入焦点图（只能纵向移动）', 'info');
  }, [behaviors, showMsg]);

  const confirmImpact = useCallback(() => {
    const allPlaced = behaviors.every(b => placed.has(b.id));
    if (!allPlaced) { showMsg('请先把所有卡片都拖到焦点图中', 'warning'); return; }
    setStep(STEP_EASE_SORT);
    showMsg('现在可以横向拖动卡片了（只能左右移动）', 'info');
  }, [behaviors, placed, showMsg]);

  const showResult = useCallback(() => {
    setStep(STEP_RESULT);
    const gold = behaviors.filter(b => {
      const p = positions[b.id];
      // 第一象限：x > 原点 && y < 原点（注意画布上方y小）
      return p && placed.has(b.id) && p.x > ORIGIN_X && p.y < ORIGIN_Y;
    });
    if (gold.length === 0) showMsg('第一象限空空如也… 还没发现黄金行为，试试拖动卡片到右上区域', 'warning');
    else showMsg(`✨ 发现了 ${gold.length} 个黄金行为！高影响 + 易做到 = 最佳路径`, 'success');
  }, [behaviors, positions, placed, showMsg]);

  const restartCluster = () => { setStep(STEP_CLUSTER); setPositions({}); setPlaced(new Set()); showMsg('重新收集行为吧', 'info'); };
  const restartAll = () => { setStep(STEP_WISH); setWish(''); setBehaviors([]); setPositions({}); setPlaced(new Set()); setDragging(null); setMessage(''); };

  const getCoords = useCallback((clientX, clientY) => {
    const el = focusRef.current?.querySelector('.focus-inner');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(FOCUS_WIDTH - FOCUS_PAD_RIGHT, Math.max(FOCUS_PAD_LEFT, clientX - r.left)),
      y: Math.min(FOCUS_HEIGHT - FOCUS_PAD_BOTTOM, Math.max(FOCUS_PAD_TOP, clientY - r.top))
    };
  }, []);

  const onFocusMouseDown = useCallback((id, e) => {
    if (step !== STEP_IMPACT_SORT && step !== STEP_EASE_SORT) return;
    if (!placed.has(id)) return;
    e.preventDefault();
    const pos = positions[id];
    if (!pos) return;
    const coords = getCoords(e.clientX, e.clientY);
    if (!coords) return;
    offsetRef.current = { x: coords.x - pos.x, y: coords.y - pos.y };
    setDragging({ id, type: 'focus' });
  }, [step, placed, positions, getCoords]);

  const onPoolMouseDown = useCallback((id, e) => {
    if (step !== STEP_IMPACT_SORT) return;
    if (placed.has(id)) return;
    e.preventDefault();
    const coords = getCoords(e.clientX, e.clientY);
    if (!coords) return;
    const initX = ORIGIN_X; // 拖入时卡片先放在原点
    const initY = coords.y;
    offsetRef.current = { x: initX - coords.x, y: initY - coords.y };
    setPositions(prev => ({ ...prev, [id]: { x: initX, y: initY } }));
    setPlaced(prev => new Set([...prev, id]));
    setDragging({ id, type: 'focus' });
  }, [step, placed, getCoords]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const coords = getCoords(e.clientX, e.clientY);
      if (!coords) return;
      setPositions(prev => {
        const cur = prev[dragging.id];
        if (!cur) return prev;
        let nx = cur.x, ny = cur.y;
        if (step === STEP_IMPACT_SORT) ny = coords.y - offsetRef.current.y;
        else if (step === STEP_EASE_SORT) nx = coords.x - offsetRef.current.x;
        return { ...prev, [dragging.id]: { x: nx, y: ny } };
      });
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, step, getCoords]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(GOLDEN_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.step === 'number') setStep(saved.step);
        if (typeof saved.wish === 'string') setWish(saved.wish);
        if (Array.isArray(saved.behaviors)) setBehaviors(saved.behaviors);
        if (saved.positions && typeof saved.positions === 'object') setPositions(saved.positions);
        if (Array.isArray(saved.placed)) setPlaced(new Set(saved.placed));
      }
    } catch {
      window.localStorage.removeItem(GOLDEN_STORAGE_KEY);
    } finally {
      hydratedRef.current = true;
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydrated) return;
    const payload = {
      step,
      wish,
      behaviors,
      positions,
      placed: [...placed],
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(GOLDEN_STORAGE_KEY, JSON.stringify(payload));
  }, [hasHydrated, step, wish, behaviors, positions, placed]);

  const getClusterPos = (count) => {
    const cx = 300, cy = 300, r = 120 + Math.min(30, count * 5);
    return Array.from({ length: count }, (_, i) => {
      const angle = (2 * Math.PI / count) * i - Math.PI / 2;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  };

  const CloudSVG = ({ text, small }) => (
    <svg viewBox="0 0 200 120" width={small ? 180 : 240} style={{ filter: 'drop-shadow(0 10px 20px rgba(108,92,231,0.15))' }}>
      <path d="M55 85 Q30 85 25 65 Q10 60 10 45 Q10 25 35 25 Q40 10 65 10 Q85 5 100 20 Q120 5 140 15 Q165 15 175 35 Q195 40 190 60 Q185 80 160 85 Z" fill="white" />
      <text x="100" y={text ? 62 : 60} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize={small ? "14" : "18"} fill="#4b3e6d">
        {text || '🎯 愿望'}
      </text>
    </svg>
  );

  const StepDots = () => (
    <div className="step-dots">
      {[...Array(TOTAL_STEPS)].map((_, i) => (
        <div key={i} className={`dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
      ))}
    </div>
  );

  // 用于轴标签的样式（因需要在轴上精确定位）
  const axisLabelYStyle = (top) => ({ position: 'absolute', left: ORIGIN_X + 8 + 'px', top: top + 'px', fontSize: '0.75rem', color: '#6c5ce7', fontWeight: 600, whiteSpace: 'nowrap', transform: 'translateY(-50%)' });
  const axisLabelXStyle = (left) => ({ position: 'absolute', left: left + 'px', top: ORIGIN_Y + 8 + 'px', fontSize: '0.75rem', color: '#6c5ce7', fontWeight: 600, whiteSpace: 'nowrap', transform: 'translateX(-50%)' });
  const goldenBehaviors = behaviors.filter(b => {
    const p = positions[b.id];
    return step === STEP_RESULT && p && placed.has(b.id) && p.x > ORIGIN_X && p.y < ORIGIN_Y;
  });
  const goldenBehaviorQuery = JSON.stringify(goldenBehaviors.map(b => b.text));

  const transferAllGoldenBehaviors = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GOLDEN_TRANSFER_KEY, JSON.stringify({
      source: 'golden-behavior',
      createdAt: new Date().toISOString(),
      behaviors: goldenBehaviors.map(b => ({ id: b.id, text: b.text })),
    }));
  };

  return (
    <div className="shell">
      <nav className="tool-nav" aria-label="工具导航">
        <Link href="/">返回工具箱</Link>
        <Link href="/ability-chain">能力链设计器</Link>
      </nav>

      <header className="header">
        <div className="brand">
          <span className="brand-icon">🧭</span>
          <h1 className="brand-title">福格焦点图：探索你实现愿望的黄金行为</h1>
        </div>
        <StepDots />
      </header>

      <main className="stage">
        {step === STEP_WISH && (
          <div className="wish-step">
            <div className="cloud-container"><CloudSVG text={wish} /></div>
            <div className="wish-form">
              <label>✨ 你的愿望是什么？</label>
              <input ref={wishRef} value={wish} onChange={e => setWish(e.target.value)} placeholder='例如“减轻压力”' onKeyDown={e => e.key === 'Enter' && confirmWish()} autoFocus />
              <p className="hint">如果一时想不出，就用“减轻压力”</p>
            </div>
            <button className="btn primary large" onClick={confirmWish}>确定愿望</button>
          </div>
        )}

        {step === STEP_CLUSTER && (
          <div className="cluster-step">
            <div className="cluster-canvas">
              <svg className="arrow-svg" viewBox="0 0 600 600">
                <defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#9b8ec4" /></marker></defs>
                {behaviors.map((b, i) => {
                  const pos = getClusterPos(behaviors.length)[i];
                  const dx = 300 - pos.x, dy = 300 - pos.y, len = Math.sqrt(dx*dx+dy*dy);
                  if (len < 5) return null;
                  return <line key={b.id} x1={pos.x+dx/len*35} y1={pos.y+dy/len*20} x2={300-dx/len*80} y2={300-dy/len*50} stroke="#9b8ec4" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow)" />;
                })}
              </svg>
              {behaviors.map((b, i) => (
                <div key={b.id} className="bubble" style={{ left: getClusterPos(behaviors.length)[i].x, top: getClusterPos(behaviors.length)[i].y }} onClick={() => removeBehavior(b.id)} title="点击删除">
                  <span className="bubble-num">{i + 1}</span>{b.text}
                </div>
              ))}
              <div className="center-cloud"><CloudSVG text={wish} small /></div>
            </div>
            <div className="add-bar">
              <input ref={inputRef} placeholder="输入一个能帮你实现愿望的行为" onKeyDown={e => e.key === 'Enter' && addBehavior()} />
              <button className="btn primary small" onClick={addBehavior}>+ 添加</button>
            </div>
            <div className="cluster-actions">
              <span className="count">已收集 <strong>{behaviors.length}</strong> 个行为</span>
              <div className="btn-group">
                {behaviors.length >= 10 && <button className="btn primary" onClick={confirmCluster}>确认集群，进入焦点图</button>}
                {behaviors.length > 0 && <button className="btn secondary" onClick={goToImpactSort}>想不出来了，先这样吧</button>}
                {behaviors.length > 0 && <button className="btn outline small" onClick={() => setBehaviors([])}>清空</button>}
              </div>
            </div>
          </div>
        )}

        {(step === STEP_IMPACT_SORT || step === STEP_EASE_SORT || step === STEP_RESULT) && (
          <div className="focus-layout">
            <div className="focus-map" ref={focusRef}>
              <div className="focus-inner">
                {/* 纵轴（始终显示） */}
                <div className="axis-y" style={{ left: ORIGIN_X + 'px', top: FOCUS_PAD_TOP + 'px', bottom: FOCUS_PAD_BOTTOM + 'px' }} />
                {/* 横轴（仅在步骤3以后显示） */}
                {step >= STEP_EASE_SORT && (
                  <div className="axis-x visible" style={{ top: ORIGIN_Y + 'px', left: FOCUS_PAD_LEFT + 'px', right: FOCUS_PAD_RIGHT + 'px' }} />
                )}
                {/* 纵轴标签 */}
                <div style={axisLabelYStyle(FOCUS_PAD_TOP)}>影响大 ↑</div>
                <div style={axisLabelYStyle(FOCUS_HEIGHT - FOCUS_PAD_BOTTOM)}>影响小 ↓</div>
                {/* 纵轴中点标记（仅在只有纵轴时显示） */}
                {step === STEP_IMPACT_SORT && (
                  <div style={{ position: 'absolute', left: ORIGIN_X - 5 + 'px', top: ORIGIN_Y - 5 + 'px', width: 10, height: 10, background: '#6c5ce7', borderRadius: '50%', zIndex: 10 }} title="中点" />
                )}
                {/* 横轴标签（步骤3后显示） */}
                {step >= STEP_EASE_SORT && (
                  <>
                    <div style={axisLabelXStyle(FOCUS_PAD_LEFT)}>← 难做到</div>
                    <div style={axisLabelXStyle(FOCUS_WIDTH - FOCUS_PAD_RIGHT)}>容易做到 →</div>
                  </>
                )}

                {/* 卡片 */}
                {behaviors.filter(b => placed.has(b.id)).map(b => {
                  const p = positions[b.id];
                  if (!p) return null;
                  const isGold = step === STEP_RESULT && p.x > ORIGIN_X && p.y < ORIGIN_Y;
                  const isDragging = dragging?.id === b.id;
                  // 图层逻辑：结果步骤高亮黄金卡片，压暗非黄金卡片
                  let zIndex = 5;
                  if (isDragging) zIndex = 100;
                  else if (step === STEP_RESULT) zIndex = isGold ? 20 : 2;

                  return (
                    <div key={b.id} className={`focus-card ${isGold ? 'golden' : ''} ${isDragging ? 'dragging' : ''}`}
                      style={{ left: p.x, top: p.y, zIndex }}
                      onMouseDown={e => onFocusMouseDown(b.id, e)}
                      onTouchStart={e => onFocusMouseDown(b.id, e.touches[0])}>
                      {b.text}
                    </div>
                  );
                })}

                {/* 黄金行为高亮（整个第一象限） */}
                {step === STEP_RESULT && (
                  <>
                    <div className="golden-zone" style={{
                      left: ORIGIN_X + 'px',
                      top: FOCUS_PAD_TOP + 'px',
                      width: (FOCUS_WIDTH - FOCUS_PAD_RIGHT - ORIGIN_X) + 'px',
                      height: (ORIGIN_Y - FOCUS_PAD_TOP) + 'px'
                    }}>
                      <span className="zone-tag">⭐ 黄金行为</span>
                    </div>
                    <div className="dim" />
                  </>
                )}
              </div>
            </div>

            <div className="side-pool">
              {step === STEP_IMPACT_SORT && (
                <>
                  <h3>待排序卡片</h3>
                  <p className="pool-tip">拖到左边焦点图中 · 只能纵向移动</p>
                  {behaviors.filter(b => !placed.has(b.id)).map(b => (
                    <div key={b.id} className="pool-card" onMouseDown={e => onPoolMouseDown(b.id, e)} onTouchStart={e => onPoolMouseDown(b.id, e.touches[0])}>{b.text}</div>
                  ))}
                </>
              )}
              {(step === STEP_EASE_SORT || step === STEP_RESULT) && (
                <>
                  <h3>全部行为</h3>
                  {behaviors.filter(b => placed.has(b.id)).map(b => {
                    const p = positions[b.id];
                    const impact = p ? (p.y < ORIGIN_Y ? '高影响' : '低影响') : '';
                    const ease = p ? (p.x > ORIGIN_X ? '易做到' : '难做到') : '';
                    const isGold = step === STEP_RESULT && p && p.x > ORIGIN_X && p.y < ORIGIN_Y;
                    return (
                      <div key={b.id} className={`summary-card ${isGold ? 'golden' : ''}`}>
                        <strong>{b.text}</strong>
                        <span>{impact} · {ease}</span>
                        {isGold && <span className="gold-tag">🌟 黄金行为</span>}
                        {isGold && (
                          <Link
                            className="continue-link"
                            href={{ pathname: '/ability-chain', query: { behavior: b.text } }}
                          >
                            继续到突破设计
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {message && <div className={`toast ${msgType}`}>{message}</div>}

      <div className="action-bar">
        {step === STEP_IMPACT_SORT && <button className="btn primary" onClick={confirmImpact}>✅ 确认影响度，显示横轴</button>}
        {step === STEP_EASE_SORT && <button className="btn gold" onClick={showResult}>🏆 完成！查看黄金行为</button>}
        {step === STEP_RESULT && (
          <>
            {goldenBehaviors.length > 1 && (
              <Link
                className="btn gold"
                href={{ pathname: '/ability-chain', query: { from: 'golden', behaviors: goldenBehaviorQuery } }}
                onClick={transferAllGoldenBehaviors}
              >
                全部黄金行为送到突破设计
              </Link>
            )}
            {behaviors.filter(b => placed.has(b.id) && positions[b.id]?.x > ORIGIN_X && positions[b.id]?.y < ORIGIN_Y).length === 0 && (
              <button className="btn danger" onClick={restartCluster}>🔄 重新调整</button>
            )}
            <button className="btn outline" onClick={restartAll}>重新寻找黄金行为</button>
          </>
        )}
        {step === STEP_CLUSTER && behaviors.length > 0 && <button className="btn outline small" onClick={restartAll}>重新开始</button>}
      </div>

      <footer className="footer">💡 黄金行为 = 高影响 + 容易做到 · 福格行为模型</footer>

      <style jsx>{`
        :global(body) { margin: 0; font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif; background: #f5f3fa; color: #2d2b3a; }
        .shell { max-width: 1100px; margin: 0 auto; padding: 20px 24px 36px; min-height: 100vh; display: flex; flex-direction: column; }
        .tool-nav { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
        .tool-nav :global(a) { color: #5a4b9e; text-decoration: none; font-size: 0.86rem; font-weight: 700; background: #fff; border: 1px solid #e8e2f5; border-radius: 999px; padding: 9px 14px; box-shadow: 0 4px 14px rgba(70, 55, 130, 0.06); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-icon { font-size: 32px; }
        .brand-title { font-size: 1.4rem; font-weight: 700; background: linear-gradient(135deg, #5a4b9e, #8b7ac5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        .step-dots { display: flex; gap: 10px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: #dcd6f0; transition: 0.3s; }
        .dot.active { background: #6c5ce7; box-shadow: 0 0 10px rgba(108,92,231,0.6); }
        .dot.done { background: #00b894; }
        .stage { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 520px; }

        .wish-step { display: flex; flex-direction: column; align-items: center; gap: 24px; }
        .cloud-container { animation: float 5s ease-in-out infinite; }
        @keyframes float { 0%,100% { transform: translateY(0); } 30% { transform: translateY(-12px); } 60% { transform: translateY(-4px); } 85% { transform: translateY(-16px); } }
        .wish-form { text-align: center; }
        .wish-form label { display: block; font-size: 1rem; color: #5a4b9e; margin-bottom: 10px; font-weight: 500; }
        .wish-form input { border: 2px solid #e0d8f0; border-radius: 40px; padding: 14px 24px; font-size: 1.1rem; width: 280px; text-align: center; outline: none; transition: 0.3s; background: white; }
        .wish-form input:focus { border-color: #8b7ac5; box-shadow: 0 0 0 4px rgba(108,92,231,0.1); }
        .hint { font-size: 0.8rem; color: #9b8ec4; margin-top: 8px; }

        .cluster-step { display: flex; flex-direction: column; align-items: center; gap: 20px; width: 100%; }
        .cluster-canvas { position: relative; width: 600px; height: 600px; max-width: 90vw; max-height: 90vw; }
        .arrow-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
        .bubble { position: absolute; background: white; border-radius: 24px; padding: 12px 20px; font-size: 0.9rem; font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.06); cursor: pointer; border: 1px solid #ece4f7; transform: translate(-50%, -50%); transition: all 0.2s; max-width: 160px; text-align: center; }
        .bubble:hover { box-shadow: 0 8px 24px rgba(108,92,231,0.15); border-color: #b9a9e8; }
        .bubble-num { position: absolute; top: -10px; right: -8px; background: #6c5ce7; color: white; width: 22px; height: 22px; border-radius: 50%; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .center-cloud { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2; }
        .add-bar { display: flex; gap: 10px; }
        .add-bar input { border: 2px solid #e0d8f0; border-radius: 30px; padding: 12px 20px; font-size: 0.95rem; width: 280px; outline: none; background: white; }
        .add-bar input:focus { border-color: #8b7ac5; }
        .cluster-actions { text-align: center; }
        .count { font-size: 0.9rem; color: #5a4b9e; display: block; margin-bottom: 12px; }
        .btn-group { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

        .btn { border: none; border-radius: 30px; padding: 12px 28px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.3s; display: inline-flex; align-items: center; gap: 6px; background: white; color: #5a4b9e; }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .action-bar :global(a.btn) { text-decoration: none; }
        .btn.primary { background: #6c5ce7; color: white; box-shadow: 0 6px 18px rgba(108,92,231,0.3); }
        .btn.primary:hover { background: #5a4bd1; transform: translateY(-2px); }
        .btn.secondary { background: white; color: #6c5ce7; border: 2px solid #d0c8f0; }
        .btn.secondary:hover { background: #f8f6ff; }
        .btn.outline { background: transparent; border: 2px solid #d0c8f0; color: #5a4b9e; }
        .btn.gold { background: linear-gradient(135deg, #ffd54f, #ffb300); color: #4a3500; box-shadow: 0 6px 18px rgba(255,179,0,0.4); }
        .btn.danger { background: #fff5f5; color: #e17055; border: 2px solid #fab1a0; }
        .btn.small { padding: 8px 20px; font-size: 0.85rem; }
        .btn.large { padding: 14px 40px; font-size: 1.1rem; }

        .focus-layout { display: flex; gap: 24px; width: 100%; max-width: 1000px; }
        .focus-map { flex: 1; background: white; border-radius: 32px; box-shadow: 0 12px 40px rgba(0,0,0,0.08); position: relative; min-height: 520px; border: 2px solid #f0ecf8; }
        .focus-inner { position: relative; width: 480px; height: 460px; margin: 20px; }
        .axis-y { position: absolute; width: 2px; background: #b9a9e8; z-index: 1; }
        .axis-x { position: absolute; height: 2px; background: #b9a9e8; opacity: 0; transition: opacity 0.3s; z-index: 1; }
        .axis-x.visible { opacity: 1; }

        .focus-card { position: absolute; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-radius: 18px; padding: 14px 20px; font-size: 0.88rem; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.02); border: 1px solid rgba(255,255,255,0.8); cursor: grab; transform: translate(-50%, -50%); white-space: nowrap; transition: all 0.2s ease; user-select: none; }
        .focus-card:hover { background: white; box-shadow: 0 12px 28px rgba(0,0,0,0.1); border-color: #b9a9e8; transform: translate(-50%, -50%) scale(1.03); }
        .focus-card.dragging { box-shadow: 0 16px 36px rgba(108,92,231,0.25); border-color: #6c5ce7; z-index: 100 !important; cursor: grabbing; transform: translate(-50%, -50%) scale(1.05); }
        .focus-card.golden { border-color: #ffb300; box-shadow: 0 0 24px rgba(255,179,0,0.4), 0 4px 12px rgba(0,0,0,0.06); background: #fffef5; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 20px rgba(255,179,0,0.3); } 50% { box-shadow: 0 0 40px rgba(255,179,0,0.7); } }
        .golden-zone { position: absolute; border: 3px dashed #ffb300; border-radius: 20px; background: rgba(255, 240, 200, 0.75); pointer-events: none; z-index: 9; box-shadow: 0 0 30px rgba(255,179,0,0.4); }
        .zone-tag { position: absolute; top: -28px; left: 50%; transform: translateX(-50%); background: #ffb300; color: white; padding: 4px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; white-space: nowrap; }
        .dim { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.15); border-radius: 32px; pointer-events: none; z-index: 6; }
        .side-pool { width: 240px; background: white; border-radius: 28px; box-shadow: 0 8px 30px rgba(0,0,0,0.06); padding: 20px 14px; display: flex; flex-direction: column; gap: 10px; max-height: 520px; overflow-y: auto; }
        .side-pool h3 { font-size: 0.9rem; color: #5a4b9e; margin: 0 0 4px; text-align: center; }
        .pool-tip { font-size: 0.7rem; color: #9b8ec4; text-align: center; margin: 0; }
        .pool-card { background: #faf8ff; border-radius: 14px; padding: 12px 16px; font-size: 0.85rem; cursor: grab; border: 1px solid #e8e2f5; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
        .pool-card:hover { border-color: #b9a9e8; box-shadow: 0 4px 12px rgba(0,0,0,0.06); background: white; }
        .summary-card { background: #faf8ff; border-radius: 14px; padding: 12px 16px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px; border: 1px solid #e8e2f5; }
        .summary-card strong { font-size: 0.85rem; }
        .summary-card span { color: #6c5ce7; font-size: 0.7rem; }
        .summary-card.golden { border-color: #ffb300; background: #fffef5; }
        .gold-tag { color: #ffb300; font-weight: 700; }
        .continue-link { display: inline-flex; align-items: center; justify-content: center; margin-top: 6px; color: #4a3500; background: linear-gradient(135deg, #ffd54f, #ffb300); border-radius: 999px; padding: 7px 10px; font-size: 0.72rem; font-weight: 800; text-decoration: none; }

        .toast { text-align: center; margin: 16px 0 0; font-size: 0.9rem; font-weight: 500; }
        .toast.success { color: #00b894; }
        .toast.warning { color: #e17055; }
        .action-bar { display: flex; justify-content: center; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
        .footer { text-align: center; font-size: 0.7rem; color: #bbb; margin-top: 24px; }
        @media (max-width: 768px) {
          .brand-title { font-size: 1rem; }
          .cluster-canvas { width: 340px; height: 340px; }
          .focus-layout { flex-direction: column; }
          .focus-map { min-height: 400px; }
          .focus-inner { width: 300px; height: 300px; margin: 10px; }
          .side-pool { width: 100%; flex-direction: row; flex-wrap: wrap; max-height: 150px; }
          .btn { padding: 10px 20px; font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
}
