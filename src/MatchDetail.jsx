import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { useParams, Link } from 'react-router-dom';
import Draggable from 'react-draggable';


// ピッチ論理サイズ（縦長）
const PITCH_W = 480;
const PITCH_H = 720;
const RADIUS  = 19;

const FRAME_COUNT = 5;  //フレーム数
const FRAME_DUR   = 800; // 再生速度（ms）

// カラーパレット
const C = {
  home:       '#00A0E9',
  homeDark:   '#005F8A',
  away:       '#E05555',
  awayDark:   '#8A2E2E',
  ball:       '#2e2d2d',
  ballDark:   '#000000',
  pitch:      '#2A6B32',
  pitchAlt:   '#306238',
  line:       'rgba(255,255,255,0.82)',
  bg:         '#0F172A',
  panel:      '#0A1120',
  border:     '#1A2E50',
  blue:       '#00A0E9',
  muted:      '#6B8CAE',
  text:       '#E8F4FF',
  green:      '#4ADE80',
  orange:     '#FB923C',
  editorBg:   '#0C1830',
};


// ヘルパー：% → px
const p = (xp, yp) => ({ x: xp / 100 * PITCH_W, y: yp / 100 * PITCH_H });


// 初期配置（4-2-3-1 vs 4-4-2）
const INIT_PIECES = (() => {
  const home = [
    { no: '1',  pos: p(67, 115) }, { no: '2',  pos: p(110, 105) },
    { no: '5',  pos: p(80, 105) }, { no: '4',  pos: p(54, 105) },
    { no: '3',  pos: p(25, 105) }, { no: '6',  pos: p(54, 95) },
    { no: '8',  pos: p(80, 95) }, { no: '7',  pos: p(106, 85) },
    { no: '10', pos: p(67, 85) }, { no: '11', pos: p(30, 85) },
    { no: '9',  pos: p(67, 75) },
  ].map((d, i) => ({ id: `home_${i}`, team: 'home', no: d.no, ...d.pos }));
  const away = [
    { no: '1',  pos: p(67, 20) }, { no: '2',  pos: p(110, 30) },
    { no: '5',  pos: p(80, 30) }, { no: '4',  pos: p(54, 30) },
    { no: '3',  pos: p(25, 30) }, { no: '7',  pos: p(110, 45) },
    { no: '8',  pos: p(80, 45) }, { no: '6',  pos: p(25, 45) },
    { no: '11', pos: p(54, 45) }, { no: '9',  pos: p(80, 58) },
    { no: '10', pos: p(54, 58) },
  ].map((d, i) => ({ id: `away_${i}`, team: 'away', no: d.no, ...d.pos }));

  return [
    ...home, ...away,
    { id: 'ball', team: 'ball', no: '', ...p(67, 67) },
  ];
})();

/** INIT_PIECES をフレームスナップショット形式に変換 */
const defaultSnapshot = () =>
  INIT_PIECES.map(({ id, team, no, x, y }) => ({ id, team, no, x, y }));
 
/** localStorage キー */
const storageKey = (matchId) => `jfro_match_${matchId}_scenes`;
 
/** localStorage から読み込み */
function loadScenes(matchId) {
  try {
    const raw = localStorage.getItem(storageKey(matchId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
 
/** localStorage へ保存 */
function saveScenes(matchId, scenes) {
  localStorage.setItem(storageKey(matchId), JSON.stringify(scenes));
}

// ============================================================
// サブコンポーネント：サッカーピッチ SVG
// ============================================================
function SoccerPitch() {
  const W = PITCH_W, H = PITCH_H, lc = C.line, sw = 1.8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
      {Array.from({ length:8 }, (_, i) => (
        <rect key={i} x={0} y={i*(H/8)} width={W} height={H/16} fill={C.pitchAlt} opacity={0.45}/>
      ))}
      <rect x={14} y={12} width={W-28} height={H-24} fill="none" stroke={lc} strokeWidth={sw}/>
      <line x1={14} y1={H/2} x2={W-14} y2={H/2} stroke={lc} strokeWidth={sw}/>
      <circle cx={W/2} cy={H/2} r={62} fill="none" stroke={lc} strokeWidth={sw}/>
      <circle cx={W/2} cy={H/2} r={4}  fill={lc}/>
      {/* ペナルティエリア（上） */}
      <rect x={W/2-110} y={12} width={220} height={100} fill="none" stroke={lc} strokeWidth={sw}/>
      <rect x={W/2-52}  y={12} width={104} height={44}  fill="none" stroke={lc} strokeWidth={sw}/>
      <rect x={W/2-32}  y={2}  width={64}  height={14}
        fill="rgba(255,255,255,0.07)" stroke={lc} strokeWidth={2.5}/>
      <circle cx={W/2} cy={64}    r={4} fill={lc}/>
      {/* ペナルティエリア（下） */}
      <rect x={W/2-110} y={H-112} width={220} height={100} fill="none" stroke={lc} strokeWidth={sw}/>
      <rect x={W/2-52}  y={H-56}  width={104} height={44}  fill="none" stroke={lc} strokeWidth={sw}/>
      <rect x={W/2-32}  y={H-16}  width={64}  height={14}
        fill="rgba(255,255,255,0.07)" stroke={lc} strokeWidth={2.5}/>
      <circle cx={W/2} cy={H-64} r={4} fill={lc}/>
      <text x={20} y={H/2-8}  fontSize={10} fill={lc} opacity={0.35} fontFamily="sans-serif" letterSpacing={1}>OPPONENT</text>
      <text x={20} y={H/2+20} fontSize={10} fill={lc} opacity={0.35} fontFamily="sans-serif" letterSpacing={1}>KAWASAKI</text>
    </svg>
  );
}

// ============================================================
// サブコンポーネント：駒（Draggable）
// ★ bounds を親要素基準（"parent"）に設定し、ピッチ全体を移動可能にする。
//   bounds を省略 or 数値で制限すると一部のエリアしか動けなくなる。
// ============================================================
function Piece({ piece, onDragStop, disabled }) {
  const nodeRef = useRef(null);
  const isBall  = piece.team === 'ball';
  const color   = isBall ? C.ball     : piece.team === 'home' ? C.home     : C.away;
  const dark    = isBall ? C.ballDark : piece.team === 'home' ? C.homeDark : C.awayDark;

  return (
    <Draggable
      nodeRef={nodeRef}
      disabled={disabled}
      bounds="parent"
      position={{ x: piece.x - RADIUS, y: piece.y - RADIUS }}
      onStop={(_, d) => onDragStop(piece.id, d.x + RADIUS, d.y + RADIUS)}
    >
      <div ref={nodeRef} title={`#${piece.no}`} style={{
        position:'absolute', width:RADIUS*2, height:RADIUS*2, borderRadius:'50%',
        cursor: disabled ? 'default' : 'grab', userSelect:'none',
        zIndex: isBall ? 30 : 20,
        background:`radial-gradient(circle at 35% 35%, ${color}, ${dark})`,
        border:'2px solid rgba(255,255,255,0.55)',
        boxShadow:'0 3px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: 14, fontWeight:700, color:'#fff', fontFamily:'sans-serif',
      }}>
        {isBall ? '⚽' : ''}
      </div>
    </Draggable>
  );
}

// ============================================================
// サブコンポーネント：アニメーション用 駒（CSS transition）
// ============================================================
function AnimPiece({ piece, duration }) {
  const isBall = piece.team === 'ball';
  const color  = isBall ? C.ball     : piece.team === 'home' ? C.home     : C.away;
  const dark   = isBall ? C.ballDark : piece.team === 'home' ? C.homeDark : C.awayDark;
  return (
    <div style={{
      position:'absolute',
      left: piece.x - RADIUS,
      top:  piece.y - RADIUS,
      width:  RADIUS*2,
      height: RADIUS*2,
      borderRadius:'50%',
      transition:`left ${duration}ms cubic-bezier(0.4,0,0.2,1), top ${duration}ms cubic-bezier(0.4,0,0.2,1)`,
      background:`radial-gradient(circle at 35% 35%, ${color}, ${dark})`,
      border:'2px solid rgba(255,255,255,0.55)',
      boxShadow:'0 3px 10px rgba(0,0,0,0.55)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: 14, fontWeight:700, color:'#fff', fontFamily:'sans-serif',
      zIndex: isBall ? 30 : 20,
      pointerEvents:'none',
    }}>
      {isBall ? '⚽' : ''}
    </div>
  );
}

// ============================================================
// サブコンポーネント：新規シーン作成フォーム
// ============================================================
function SceneForm({ onStart, onCancel }) {
  const [form, setForm] = useState({
    label: '', type: 'goal', team: 'home', pattern: 'セットプレー', scorer: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const labelStyle = { fontSize:11, color:C.muted, marginBottom:4, display:'block' };
  const inputStyle = {
    width:'100%', padding:'7px 10px', background:'#0A1628',
    border:`1px solid ${C.border}`, borderRadius:5,
    color:C.text, fontSize:13, outline:'none', marginBottom:12,
  };
  const selectStyle = { ...inputStyle };

  return (
    <div style={{ background:C.editorBg, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 14px 10px', marginTop:4 }}>
      <div style={{ fontSize:12, fontWeight:700, color:C.blue, marginBottom:12, letterSpacing:'.05em' }}>
        新規シーン作成
      </div>

      <label style={labelStyle}>時間</label>
      <input style={inputStyle} value={form.label} onChange={e => set('label', e.target.value)} placeholder="23分" />

      <label style={labelStyle}>得点or失点（川崎視点）</label>
      <select style={selectStyle} value={form.type} onChange={e => set('type', e.target.value)}>
        <option value="goal">得点</option>
        <option value="concede">失点</option>
      </select>

      <label style={labelStyle}>パターン</label>
      <select style={selectStyle} value={form.pattern} onChange={e => set('pattern', e.target.value)}>
        <option value="セットプレー">セットプレー</option>
        <option value="カウンター">カウンター</option>
        <option value="クロス">クロス</option>
        <option value="崩し">崩し</option>
        <option value="自陣ミス">自陣ミス</option>
        <option value="その他">その他</option>
      </select>

      <label style={labelStyle}>得点者</label>
      <input style={inputStyle} value={form.scorer} onChange={e => set('scorer', e.target.value)} placeholder="例：小林悠" />

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => { if (!form.label.trim()) return alert('時間を入力してください'); onStart(form); }}
          style={{ flex:1, padding:'8px 0', background:C.blue, border:'none', borderRadius:6, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          作成
        </button>
        <button onClick={onCancel}
          style={{ padding:'8px 14px', background:'#1A2E50', border:'none', borderRadius:6, color:C.muted, fontSize:12, cursor:'pointer' }}>
          キャンセル
        </button>
      </div>
    </div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function MatchDetail() {
  const { id: matchId } = useParams();

  const [scenes,       setScenes]       = useState([]);
  const [playSceneId,  setPlaySceneId]  = useState(null);
  const [playFrameIdx, setPlayFrameIdx] = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isAnimating,  setIsAnimating]  = useState(false);
  const [playPositions,setPlayPositions]= useState(null);
  const playTimerRef = useRef(null);
  const animTimerRef = useRef(null);

  const [editorMode,    setEditorMode]    = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [editingMeta,   setEditingMeta]   = useState(null);
  const [editSceneId,   setEditSceneId]   = useState(null);
  const [tempFrames,    setTempFrames]    = useState(null);
  const [editorFrame,   setEditorFrame]   = useState(0);
  const [visitedFrames, setVisitedFrames] = useState(new Set([0]));

  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setScenes(loadScenes(matchId));
  }, [matchId]);

  // ── 再生ロジック ─────────────────────────────────────────
  const activePlayScene = useMemo(
    () => scenes.find(s => s.id === playSceneId) ?? null,
    [scenes, playSceneId]
  );
  const totalPlayFrames = activePlayScene?.frames.length ?? 0;

  const applyPlayFrame = useCallback((scene, fi) => {
    const frame = scene.frames[fi];
    if (!frame) return;
    setIsAnimating(true);
    setPlayPositions(frame);
    clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => setIsAnimating(false), FRAME_DUR * 0.92);
  }, []);

  const handleSceneClick = useCallback((scene) => {
    if (editorMode) return;
    clearInterval(playTimerRef.current);
    setPlaySceneId(scene.id);
    setPlayFrameIdx(0);
    setIsPlaying(true);
    applyPlayFrame(scene, 0);
    let fi = 0;
    playTimerRef.current = setInterval(() => {
      fi++;
      if (fi >= scene.frames.length) {
        clearInterval(playTimerRef.current);
        setIsPlaying(false);
        return;
      }
      setPlayFrameIdx(fi);
      applyPlayFrame(scene, fi);
    }, FRAME_DUR);
  }, [editorMode, applyPlayFrame]);

  const handlePlayPause = useCallback(() => {
    if (!activePlayScene) return;
    if (isPlaying) { clearInterval(playTimerRef.current); setIsPlaying(false); }
    else           { handleSceneClick(activePlayScene); }
  }, [activePlayScene, isPlaying, handleSceneClick]);

  const handleSeek = useCallback((fi) => {
    if (!activePlayScene) return;
    clearInterval(playTimerRef.current);
    setIsPlaying(false);
    setPlayFrameIdx(fi);
    applyPlayFrame(activePlayScene, fi);
  }, [activePlayScene, applyPlayFrame]);

  const handleReset = useCallback(() => {
    clearInterval(playTimerRef.current);
    setPlaySceneId(null);
    setPlayFrameIdx(0);
    setIsPlaying(false);
    setIsAnimating(false);
    setPlayPositions(null);
  }, []);

  const playPieces = useMemo(() => {
    if (!playPositions) return INIT_PIECES.map(q => ({ ...q }));
    const map = Object.fromEntries(playPositions.map(q => [q.id, q]));
    return INIT_PIECES.map(q => ({ ...q, x: map[q.id]?.x ?? q.x, y: map[q.id]?.y ?? q.y }));
  }, [playPositions]);

  // ── エディタロジック ─────────────────────────────────────
  const buildEmptyFrames = () => {
    const frames = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      frames.push(i === 0
        ? defaultSnapshot()
        : frames[i - 1].map(piece => ({ ...piece }))
      );
    }
    return frames;
  };

  const handleNewScene = () => {
    clearInterval(playTimerRef.current);
    setPlaySceneId(null);
    setIsPlaying(false);
    setShowForm(true);
    setEditorMode(false);
  };

  const handleFormStart = (meta) => {
    setEditingMeta(meta);
    setEditSceneId(null);
    setTempFrames(buildEmptyFrames());
    setEditorFrame(0);
    setVisitedFrames(new Set([0]));
    setShowForm(false);
    setEditorMode(true);
  };

  const handleEditorFrameChange = useCallback((fi) => {
    setTempFrames(prev => {
      if (!prev || fi === 0) return prev;
      if (!visitedFrames.has(fi)) {
        return prev.map((frame, i) =>
          i === fi ? prev[fi - 1].map(piece => ({ ...piece })) : frame
        );
      }
      return prev;
    });
    setVisitedFrames(prev => new Set([...prev, fi]));
    setEditorFrame(fi);
  }, [visitedFrames]);

  // ★ clamp は bounds="parent" に委ねるためここでは行わない
  const handleEditorDragStop = useCallback((pieceId, nx, ny) => {
    setTempFrames(prev => {
      if (!prev) return prev;
      return prev.map((frame, fi) => {
        if (fi !== editorFrame) return frame;
        return frame.map(piece =>
          piece.id === pieceId ? { ...piece, x: nx, y: ny } : piece
        );
      });
    });
  }, [editorFrame]);

  const editorPieces = useMemo(() => {
    if (!tempFrames) return INIT_PIECES.map(q => ({ ...q }));
    return tempFrames[editorFrame] ?? INIT_PIECES.map(q => ({ ...q }));
  }, [tempFrames, editorFrame]);

  const handleRegisterScene = useCallback(() => {
    if (!editingMeta || !tempFrames) return;
    const newScene = {
      id:        editSceneId ?? Date.now(),
      label:     editingMeta.label,
      type:      editingMeta.type,
      team:      editingMeta.team,
      pattern:   editingMeta.pattern,
      scorer:    editingMeta.scorer,
      frames:    tempFrames,
      createdAt: new Date().toISOString(),
    };
    const updated = editSceneId
      ? scenes.map(s => s.id === editSceneId ? newScene : s)
      : [...scenes, newScene];
    setScenes(updated);
    saveScenes(matchId, updated);
    setSavedMsg(`「${newScene.label}」を登録しました`);
    setTimeout(() => setSavedMsg(''), 3000);
    setEditorMode(false);
    setEditingMeta(null);
    setTempFrames(null);
    setEditSceneId(null);
    setVisitedFrames(new Set([0]));
  }, [editingMeta, tempFrames, editSceneId, scenes, matchId]);

  const handleEditorCancel = useCallback(() => {
    setEditorMode(false);
    setShowForm(false);
    setEditingMeta(null);
    setTempFrames(null);
    setEditSceneId(null);
    setVisitedFrames(new Set([0]));
  }, []);

  const handleDeleteScene = useCallback((sceneId, e) => {
    e.stopPropagation();
    if (!window.confirm('このシーンを削除しますか？')) return;
    const updated = scenes.filter(s => s.id !== sceneId);
    setScenes(updated);
    saveScenes(matchId, updated);
    if (playSceneId === sceneId) handleReset();
  }, [scenes, matchId, playSceneId, handleReset]);

  useEffect(() => () => {
    clearInterval(playTimerRef.current);
    clearTimeout(animTimerRef.current);
  }, []);

  const displayPieces = editorMode ? editorPieces : playPieces;

  // ============================================================
  // レンダー
  // ============================================================
  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100vh',
      background:C.bg, color:C.text,
      fontFamily:"'Noto Sans JP','Helvetica Neue',sans-serif",
      overflow:'hidden',
    }}>

      {/* ヘッダー */}
      <div style={{
        padding:'8px 20px', borderBottom:`1px solid ${C.border}`,
        display:'flex', alignItems:'center', gap:12, flexShrink:0,
        background:'linear-gradient(90deg,#001020,#0F172A)',
      }}>
        <Link to="/" style={{ color:C.blue, textDecoration:'none', fontSize:13, opacity:.85 }}>
          試合一覧へ
        </Link>
        <span style={{ color:C.border }}>|</span>
        <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:C.blue, letterSpacing:'.05em' }}>
          {editorMode ? 'シーンエディタ' : '試合詳細・分析'}
        </h2>
        <span style={{ fontSize:11, color:C.muted }}>Match ID: {matchId}</span>

        {editorMode && editingMeta && (
          <>
            <span style={{ color:C.border }}>|</span>
            <span style={{ fontSize:12, color:C.orange, fontWeight:600 }}>
              {editingMeta.label || '新規シーン'} フレーム {editorFrame + 1} / {FRAME_COUNT}
            </span>
          </>
        )}

        {!editorMode && activePlayScene && (
          <>
            <span style={{ color:C.border }}>|</span>
            <span style={{ fontSize:12, fontWeight:600, color: activePlayScene.type === 'goal' ? C.home : C.away }}>
              {activePlayScene.label}
            </span>
          </>
        )}

        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          {savedMsg && <span style={{ fontSize:11, color:C.green }}>{savedMsg}</span>}
        </div>
      </div>

      {/* メイン（左右） */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* 左：サイドバー */}
        <div style={{
          width:220, borderRight:`2px solid ${C.border}`, padding:'12px 10px',
          overflowY:'auto', display:'flex', flexDirection:'column', gap:8,
          background:'linear-gradient(180deg,#080E1C,#0F172A)', flexShrink:0,
        }}>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:'.15em', textTransform:'uppercase' }}>
            Scenes
          </div>

          {scenes.length === 0 && !showForm && (
            <div style={{ fontSize:11, color:C.muted, padding:'8px 0', lineHeight:1.7 }}>
              シーンがありません。<br/>「＋ 新規シーン作成」から追加してください。
            </div>
          )}

          {scenes.map(scene => {
            const isActive = playSceneId === scene.id && !editorMode;
            const accent   = scene.type === 'goal' ? C.home : C.away;
            return (
              <div key={scene.id} style={{ position:'relative' }}>
                <div
                  onClick={() => handleSceneClick(scene)}
                  style={{
                    padding:'10px 28px 10px 12px', borderRadius:7,
                    background: isActive ? '#0D2040' : C.panel,
                    borderLeft:`4px solid ${isActive ? accent : C.border}`,
                    cursor: editorMode ? 'default' : 'pointer',
                    transition:'all .15s',
                    outline: isActive ? `1px solid ${C.border}` : 'none',
                    opacity: editorMode ? 0.5 : 1,
                  }}
                >
                  <div style={{ fontSize:12, fontWeight:600, lineHeight:1.3 }}>{scene.label}</div>
                  <div style={{ fontSize:9, color: scene.type==='goal' ? '#7EC8FF' : '#FCA5A5', marginTop:2, textTransform:'uppercase', letterSpacing:'.06em' }}>
                    {scene.type === 'goal' ? '得点' : '失点'}
                  </div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>パターン： {scene.pattern}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>得点者： {scene.scorer}</div>

                  {isActive && (
                    <div style={{ display:'flex', gap:4, marginTop:6, alignItems:'center' }}>
                      {scene.frames.map((_, fi) => (
                        <div key={fi} onClick={e => { e.stopPropagation(); handleSeek(fi); }}
                          style={{
                            width: fi === playFrameIdx ? 14 : 8, height:8,
                            borderRadius: fi === playFrameIdx ? 4 : '50%',
                            background: fi <= playFrameIdx ? accent : C.border,
                            cursor:'pointer', transition:'all .15s', flexShrink:0,
                          }}
                        />
                      ))}
                      {isPlaying && <span style={{ fontSize:9, color:C.green, marginLeft:2, fontWeight:700 }}>● 再生中</span>}
                    </div>
                  )}
                </div>

                <button onClick={e => handleDeleteScene(scene.id, e)} title="削除" style={{
                  position:'absolute', right:6, top:'50%', transform:'translateY(-50%)',
                  width:20, height:20, borderRadius:'50%',
                  background:'rgba(224,85,85,0.15)', border:'1px solid rgba(224,85,85,0.3)',
                  color:'#E05555', fontSize:11, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, padding:0,
                }}>×</button>
              </div>
            );
          })}

          {showForm ? (
            <SceneForm onStart={handleFormStart} onCancel={() => setShowForm(false)} />
          ) : (
            !editorMode && (
              <button onClick={handleNewScene} style={{
                padding:'9px 0', background:'transparent',
                border:`1px dashed ${C.border}`, borderRadius:7,
                color:C.blue, fontSize:12, fontWeight:600,
                cursor:'pointer', transition:'all .15s', letterSpacing:'.04em',
              }}>
                ＋ 新規シーン作成
              </button>
            )
          )}

          {!editorMode && !showForm && (
            <button onClick={handleReset} style={{
              marginTop:'auto', padding:'8px 0', background:'#1A2E50', border:'none',
              borderRadius:6, color:C.text, fontSize:11, cursor:'pointer',
            }}>
              ↺ 初期配置に戻す
            </button>
          )}

          <div style={{ padding:'10px 0 0', borderTop:`1px solid ${C.border}`, fontSize:10, color:C.muted }}>
            {[
              { color:C.home, label:'川崎フロンターレ' },
              { color:C.away, label:'相手チーム' },
              { color:C.ball, label:'ボール' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }}/>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* 右：ボードエリア */}
        <div style={{ flex:1, background:'#111B2E', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* エディタツールバー */}
          {editorMode && (
            <div style={{
              padding:'10px 16px', background:C.editorBg,
              borderBottom:`2px solid ${C.orange}40`,
              display:'flex', alignItems:'center', gap:10, flexShrink:0,
            }}>
              <span style={{ fontSize:11, color:C.orange, fontWeight:700, letterSpacing:'.05em', marginRight:4 }}>FRAME</span>
              {Array.from({ length: FRAME_COUNT }, (_, fi) => (
                <button key={fi} onClick={() => handleEditorFrameChange(fi)} style={{
                  width:36, height:36, borderRadius:6, border:'none',
                  cursor:'pointer', fontWeight:700, fontSize:13, transition:'all .15s',
                  background: fi === editorFrame ? C.orange : '#1A2E50',
                  color: fi === editorFrame ? '#fff' : C.muted,
                  boxShadow: fi === editorFrame ? `0 0 10px ${C.orange}60` : 'none',
                }}>
                  {fi + 1}
                </button>
              ))}
              <div style={{ fontSize:10, color:C.muted, marginLeft:4, lineHeight:1.6 }}>
                駒をドラッグして配置を設定
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                <button onClick={handleEditorCancel} style={{
                  padding:'7px 14px', background:'#1A2E50', border:'none',
                  borderRadius:6, color:C.muted, fontSize:12, cursor:'pointer',
                }}>キャンセル</button>
                <button onClick={handleRegisterScene} style={{
                  padding:'7px 18px', background:C.green, border:'none',
                  borderRadius:6, color:'#0A1628', fontSize:12,
                  fontWeight:700, cursor:'pointer', boxShadow:`0 0 12px ${C.green}50`,
                }}>✓ シーンを登録</button>
              </div>
            </div>
          )}

          {/* ピッチ */}
          <div style={{
            flex:1, overflow:'hidden', display:'flex',
            alignItems:'center', justifyContent:'center',
            padding: editorMode ? '10px 14px 0' : '14px 14px 0',
          }}>
            <div style={{
              position:'relative',
              height:'100%',
              aspectRatio:`${PITCH_W} / ${PITCH_H}`,
              maxWidth:'100%',
              background:C.pitch,
              borderRadius:6,
              boxShadow: editorMode
                ? `0 0 0 2px ${C.orange}60, 0 0 40px rgba(0,0,0,0.6)`
                : '0 0 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)',
              overflow:'hidden',
              flexShrink:0,
            }}>
              <SoccerPitch />

              {editorMode && (
                <div style={{
                  position:'absolute', top:10, right:12, zIndex:50,
                  background:'rgba(251,146,60,0.9)', borderRadius:6,
                  padding:'3px 12px', fontSize:12, fontWeight:700, color:'#fff',
                  letterSpacing:'.05em', pointerEvents:'none',
                }}>
                  FRAME {editorFrame + 1}
                </div>
              )}

              {editorMode ? (
                displayPieces.map(piece => (
                  <Piece key={piece.id} piece={piece} onDragStop={handleEditorDragStop} disabled={false} />
                ))
              ) : isAnimating ? (
                displayPieces.map(piece => (
                  <AnimPiece key={piece.id} piece={piece} duration={FRAME_DUR * 0.92} />
                ))
              ) : (
                displayPieces.map(piece => (
                  <Piece key={piece.id} piece={piece} onDragStop={() => {}} disabled={true} />
                ))
              )}
            </div>
          </div>

          {/* コントロールバー（再生モードのみ） */}
          {!editorMode && (
            <div style={{
              padding:'10px 18px 12px', display:'flex', alignItems:'center', gap:12,
              borderTop:`1px solid ${C.border}`, background:'rgba(6,10,22,0.95)', flexShrink:0,
            }}>
              <button onClick={handlePlayPause} disabled={!activePlayScene} style={{
                width:40, height:40, borderRadius:'50%',
                background: activePlayScene ? C.blue : C.border,
                border:'none', cursor: activePlayScene ? 'pointer' : 'default',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18, color:'#fff', flexShrink:0, transition:'all .15s',
                boxShadow: activePlayScene ? `0 0 12px ${C.blue}60` : 'none',
              }}>
                {isPlaying ? '⏸' : '▶'}
              </button>

              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  {activePlayScene ? (
                    activePlayScene.frames.map((_, fi) => (
                      <button key={fi} onClick={() => handleSeek(fi)} style={{
                        flex:1, height:8, borderRadius:4, border:'none', cursor:'pointer',
                        background: fi < playFrameIdx ? C.blue : fi === playFrameIdx ? C.home : C.border,
                        opacity: fi === playFrameIdx ? 1 : fi < playFrameIdx ? 0.65 : 0.3,
                        transition:'all .15s',
                      }}/>
                    ))
                  ) : (
                    <div style={{ flex:1, height:8, borderRadius:4, background:C.border, opacity:.2 }}/>
                  )}
                </div>
                <div style={{ fontSize:10, color:C.muted }}>
                  {activePlayScene
                    ? `フレーム ${playFrameIdx + 1} / ${totalPlayFrames}${isPlaying ? '  ● 再生中' : ''}`
                    : '左のシーンをクリックすると再生されます'}
                </div>
              </div>
            </div>
          )}

          {/* エディタフレーム案内バー */}
          {editorMode && (
            <div style={{
              padding:'10px 18px', borderTop:`1px solid ${C.border}`,
              background:'rgba(6,10,22,0.95)', flexShrink:0,
              display:'flex', alignItems:'center', gap:12,
            }}>
              <div style={{ display:'flex', gap:4, flex:1 }}>
                {Array.from({ length: FRAME_COUNT }, (_, fi) => (
                  <button key={fi} onClick={() => handleEditorFrameChange(fi)} style={{
                    flex:1, height:8, borderRadius:4, border:'none', cursor:'pointer',
                    background: fi === editorFrame ? C.orange : fi < editorFrame ? `${C.orange}60` : C.border,
                    opacity: fi === editorFrame ? 1 : fi < editorFrame ? 0.7 : 0.3,
                    transition:'all .15s',
                  }}/>
                ))}
              </div>
              <div style={{ fontSize:10, color:C.orange }}>
                フレーム {editorFrame + 1} / {FRAME_COUNT} を編集中
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}