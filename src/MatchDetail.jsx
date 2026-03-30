/**

# 依頼内容
J.FRO分析ボードの `MatchDetail.jsx` を、試合ごとに「スタメン（背番号）登録」と「シーン自作・保存」ができる実用的なツールへ大幅にアップデートしてください。

## 1. スタメン（背番号）マスター機能
- `INIT_PIECES` を直接使うのをやめ、試合ごとに `starters` (State) を管理するようにしてください。
- 左側サイドバーの一番上に「スタメン設定・基本配置」セクションを常設します。
- ここを選択している間、以下の操作を可能にします：
  - 各駒（選手）をクリックすると `window.prompt` 等で背番号を変更できる。
  - 駒をドラッグして「その試合のデフォルト陣形（4-4-2など）」を作成できる。
- 他のどのシーンを再生しても、ここで設定した「最新の背番号」が各駒に反映されるようにしてください。

## 2. シーンの動的追加・保存機能 (match_id 紐付け)
- 現在コードに直書きされている `SCENES` を削除し、`match_id` ごとに `localStorage` からデータを読み書きする仕組みに変更してください。
- 既存のシーンリストの下に「＋ シーンを追加」ボタンを作成します。
- ボタン押下で入力フォームを表示し、以下を登録可能にします：
  - ラベル（時間・タイトル）、チーム（自/相手）、タイプ（得点/失点）、得点者。
- 「保存」を押した瞬間の「ピッチ上の全駒の座標」を、そのシーンの `frames[0]`（開始位置）として記録します。

## 技術的要件
- 駒のデータ構造は `{ id, team, no, x, y }` を基本とし、シーンの `frames` 内にはその座標 snapshot を保持する形にしてください。
- `useEffect` を使い、ページ遷移時にその `match_id` に適したデータが読み込まれるようにしてください。
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { useParams, Link } from 'react-router-dom';
import Draggable from 'react-draggable';


// ピッチ論理サイズ（縦長）
const PITCH_W = 480;
const PITCH_H = 720;
const RADIUS  = 19;

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

function expandFrames(rawFrames) {
  const expanded = [];
  let cur = Object.fromEntries(INIT_PIECES.map(q => [q.id, { x: q.x, y: q.y }]));
  for (const frame of rawFrames) {
    cur = { ...cur, ...(frame.positions || {}) };
    expanded.push({ positions: { ...cur }, lines: frame.lines || [] });
  }
  return expanded;
}

const SCENES = [
  {
    id: 1, label: '【23分】先制ゴール', type: 'goal',
    scorer: '10番', comment: '右サイド崩し→クロス→中央で合わせた先制点',
    frameDuration: 920,
    frames: expandFrames([
      { positions: {} },
      {
        positions: {
          'home_7': p(88, 43),
          'ball':   p(88, 43),
          'away_1': p(76, 27),
        },
        lines: [],
      },
      {
        positions: {
          'home_7':  p(93, 31),
          'ball':    p(93, 31),
          'home_10': p(55, 37),
          'home_9':  p(46, 28),
          'away_2':  p(73, 27),
          'away_3':  p(61, 28),
        },
        lines: [],
      },
      {
        positions: {
          'home_10': p(55, 27),
          'ball':    p(55, 27),
        },
        lines: [{ from: p(93,31), to: p(55,27), type: 'pass' }],
      },
      {
        positions: { 'ball': p(50, 10) },
        lines: [{ from: p(55,27), to: p(50,10), type: 'shot' }],
      },
    ]),
  },
  {
    id: 2, label: '【55分】 失点', type: 'concede',
    scorer: '相手9番', comment: '中盤でのボールロスト→2vs1カウンター失点',
    frameDuration: 880,
    frames: expandFrames([
      { positions: {} },
      {
        positions: {
          'home_6': p(36, 58),
          'away_9': p(52, 52),
          'ball':   p(52, 52),
        },
        lines: [],
      },
      {
        positions: {
          'away_9':  p(54, 63),
          'away_10': p(40, 59),
          'ball':    p(54, 63),
          'home_5':  p(63, 69),
          'home_4':  p(44, 73),
        },
        lines: [],
      },
      {
        positions: {
          'away_10': p(46, 74),
          'ball':    p(46, 74),
          'home_5':  p(62, 76),
          'home_4':  p(42, 77),
        },
        lines: [{ from: p(54,63), to: p(46,74), type: 'pass' }],
      },
      {
        positions: { 'ball': p(50, 90) },
        lines: [{ from: p(46,74), to: p(50,90), type: 'shot' }],
      },
    ]),
  },
];

// ピッチ背景 SVG
function SoccerPitch() {
  const W = PITCH_W, H = PITCH_H, lc = C.line, sw = 1.8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={0} y={i*(H/8)} width={W} height={H/16} fill={C.pitchAlt} opacity={0.45}/>
      ))}
      <rect x={14} y={12} width={W-28} height={H-24} fill="none" stroke={lc} strokeWidth={sw}/>
      <line x1={14} y1={H/2} x2={W-14} y2={H/2} stroke={lc} strokeWidth={sw}/>
      <circle cx={W/2} cy={H/2} r={62} fill="none" stroke={lc} strokeWidth={sw}/>
      <circle cx={W/2} cy={H/2} r={4} fill={lc}/>
      <rect x={W/2-110} y={12} width={220} height={100} fill="none" stroke={lc} strokeWidth={sw}/>
      <rect x={W/2-52} y={12} width={104} height={44} fill="none" stroke={lc} strokeWidth={sw}/>
      <rect x={W/2-32} y={2} width={64} height={14} fill="rgba(255,255,255,0.07)" stroke={lc} strokeWidth={2.5}/>
      <circle cx={W/2} cy={64} r={4} fill={lc}/>
      <rect x={W/2-110} y={H-112} width={220} height={100} fill="none" stroke={lc} strokeWidth={sw}/>
      <rect x={W/2-52} y={H-56} width={104} height={44} fill="none" stroke={lc} strokeWidth={sw}/>
      <rect x={W/2-32} y={H-16} width={64} height={14} fill="rgba(255,255,255,0.07)" stroke={lc} strokeWidth={2.5}/>
      <circle cx={W/2} cy={H-64} r={4} fill={lc}/>

      <text x={20} y={H/2-8}  fontSize={10} fill={lc} opacity={0.35} fontFamily="sans-serif" letterSpacing={1}>OPPONENT</text>
      <text x={20} y={H/2+20} fontSize={10} fill={lc} opacity={0.35} fontFamily="sans-serif" letterSpacing={1}>KAWASAKI</text>
    </svg>
  );
}

function TrajectoryLines({ lines }) {
  if (!lines || lines.length === 0) return null;
  return (
    <svg viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:15 }}>
      <defs>
        {['pass','shot'].map(t => (
          <marker key={t} id={`arr-${t}`} viewBox="0 0 10 10" refX={8} refY={5}
            markerWidth={5} markerHeight={5} orient="auto-start-reverse">
            <path d="M1 2L8 5L1 8" fill="none"
              stroke={t==='shot'?'#F5C842':'rgba(255,255,255,.9)'}
              strokeWidth={2} strokeLinecap="round"/>
          </marker>
        ))}
      </defs>
      {lines.map((line, i) => {
        if (line.type === 'run') return null;
        const isShot = line.type === 'shot';
        const color  = isShot ? '#F5C842' : 'rgba(255,255,255,0.9)';
        const mx = (line.from.x + line.to.x) / 2 - (line.to.y - line.from.y) * 0.15;
        const my = (line.from.y + line.to.y) / 2 + (line.to.x - line.from.x) * 0.15;
        const d  = `M ${line.from.x} ${line.from.y} Q ${mx} ${my} ${line.to.x} ${line.to.y}`;

        const pathLen = Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y) * 1.2;
        const dur = isShot ? '0.38s' : '0.52s';

        return (
          <g key={i}>
            {isShot && (
              <path d={d} fill="none" stroke="#F5C84240" strokeWidth={14} strokeLinecap="round"/>
            )}
            <path d={d} fill="none"
              stroke={color}
              strokeWidth={isShot ? 2.8 : 2.4}
              strokeLinecap="round"
              markerEnd={`url(#arr-${line.type})`}
              style={{
                strokeDasharray: `${pathLen} ${pathLen}`,
                strokeDashoffset: pathLen,
                animation: `jfroLine ${dur} ease-out forwards`,
              }}
            />
          </g>
        );
      })}
      <style>{`
        @keyframes jfroLine {
          from { stroke-dashoffset: var(--len, 800); }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}

function Piece({ piece, onDragStop }) {
  const nodeRef = useRef(null);
  const isBall  = piece.team === 'ball';
  const color   = isBall ? C.ball  : piece.team === 'home' ? C.home  : C.away;
  const dark    = isBall ? C.ballDark : piece.team === 'home' ? C.homeDark : C.awayDark;

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: piece.x - RADIUS, y: piece.y - RADIUS }}
      onStop={(_, d) => onDragStop(piece.id, d.x + RADIUS, d.y + RADIUS)}
    >
      <div ref={nodeRef} title={`#${piece.no}`} style={{
        position:'absolute', width:RADIUS*2, height:RADIUS*2, borderRadius:'50%',
        cursor:'grab', userSelect:'none', zIndex: isBall ? 30 : 20,
        background:`radial-gradient(circle at 35% 35%, ${color}, ${dark})`,
        border:'2px solid rgba(255,255,255,0.55)',
        boxShadow:'0 3px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: isBall ? 14 : (piece.no.length > 1 ? 10 : 12),
        fontWeight:700, color:'#fff', fontFamily:'sans-serif',
      }}>
        {isBall ? '⚽' : piece.no}
      </div>
    </Draggable>
  );
}

export default function MatchDetail() {
  const { id } = useParams();

  const [activeSceneId, setActiveSceneId] = useState(null);
  const [frameIndex,     setFrameIndex]    = useState(0);
  const [isPlaying,      setIsPlaying]     = useState(false);
  const [isAnimating,    setIsAnimating]   = useState(false);
  const playTimerRef = useRef(null);
  const animTimerRef = useRef(null);

  const [positions, setPositions] = useState(
    Object.fromEntries(INIT_PIECES.map(q => [q.id, { x: q.x, y: q.y }]))
  );
  const [savedMsg, setSavedMsg] = useState('');

  const activeScene  = useMemo(() => SCENES.find(s => s.id === activeSceneId) ?? null, [activeSceneId]);
  const totalFrames  = activeScene?.frames.length ?? 0;
  const currentFrame = activeScene?.frames[frameIndex] ?? null;

  const applyFrame = useCallback((scene, fi) => {
    const frame = scene.frames[fi];
    if (!frame) return;
    setIsAnimating(true);
    setPositions(frame.positions);
    clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => setIsAnimating(false), scene.frameDuration * 0.92);
  }, []);

  const playScene = useCallback((scene, startFi = 0) => {
    clearInterval(playTimerRef.current);
    setActiveSceneId(scene.id);
    setIsPlaying(true);
    let fi = startFi;
    setFrameIndex(fi);
    applyFrame(scene, fi);

    playTimerRef.current = setInterval(() => {
      fi++;
      if (fi >= scene.frames.length) {
        clearInterval(playTimerRef.current);
        setIsPlaying(false);
        return;
      }
      setFrameIndex(fi);
      applyFrame(scene, fi);
    }, scene.frameDuration);
  }, [applyFrame]);

  const handleSceneClick = useCallback((scene) => {
    clearInterval(playTimerRef.current);
    playScene(scene, 0);
  }, [playScene]);

  const handlePlayPause = useCallback(() => {
    if (!activeScene) return;
    if (isPlaying) {
      clearInterval(playTimerRef.current);
      setIsPlaying(false);
    } else {
      const start = frameIndex >= totalFrames - 1 ? 0 : frameIndex;
      playScene(activeScene, start);
    }
  }, [activeScene, isPlaying, frameIndex, totalFrames, playScene]);

  const handleSeek = useCallback((fi) => {
    if (!activeScene) return;
    clearInterval(playTimerRef.current);
    setIsPlaying(false);
    setFrameIndex(fi);
    applyFrame(activeScene, fi);
  }, [activeScene, applyFrame]);

  const handleReset = useCallback(() => {
    clearInterval(playTimerRef.current);
    setActiveSceneId(null);
    setFrameIndex(0);
    setIsPlaying(false);
    setIsAnimating(true);
    setPositions(Object.fromEntries(INIT_PIECES.map(q => [q.id, { x: q.x, y: q.y }])));
    setTimeout(() => setIsAnimating(false), 700);
  }, []);

  const handleDragStop = useCallback((pieceId, nx, ny) => {
    setPositions(prev => ({
      ...prev,
      [pieceId]: {
        x: Math.max(RADIUS, Math.min(PITCH_W - RADIUS, nx)),
        y: Math.max(RADIUS, Math.min(PITCH_H - RADIUS, ny)),
      },
    }));
  }, []);

  const handleSave = useCallback(() => {
    const data = {
      match_id:  Number(id),
      scene_id:  activeSceneId,
      frame:     frameIndex,
      saved_at:  new Date().toISOString(),
      snapshot: INIT_PIECES.map(q => ({
        id: q.id, team: q.team, no: q.no,
        x: Math.round(positions[q.id]?.x ?? q.x),
        y: Math.round(positions[q.id]?.y ?? q.y),
      })),
    };
    console.log('=== J.FRO 保存データ ===', JSON.stringify(data, null, 2));
    setSavedMsg('✓ 保存完了');
    setTimeout(() => setSavedMsg(''), 3000);
  }, [id, activeSceneId, frameIndex, positions]);

  useEffect(() => () => {
    clearInterval(playTimerRef.current);
    clearTimeout(animTimerRef.current);
  }, []);

  const pieces = INIT_PIECES.map(q => ({
    ...q,
    x: positions[q.id]?.x ?? q.x,
    y: positions[q.id]?.y ?? q.y,
  }));
  const currentLines = currentFrame?.lines ?? [];

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100vh',
      background:C.bg, color:C.text,
      fontFamily:"'Noto Sans JP','Helvetica Neue',sans-serif",
      overflow:'hidden',
    }}>

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
          試合詳細・分析
        </h2>
        <span style={{ fontSize:11, color:C.muted }}>Match ID: {id}</span>
        {activeScene && (
          <>
            <span style={{ color:C.border }}>|</span>
            <span style={{ fontSize:12, color: activeScene.type==='goal' ? C.home : C.away, fontWeight:600 }}>
              {activeScene.label}
            </span>
          </>
        )}
        <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
          {savedMsg && <span style={{ fontSize:11, color:C.green }}>{savedMsg}</span>}
          <button onClick={handleSave} style={{
            padding:'5px 14px', background:C.blue, border:'none', borderRadius:6,
            color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer',
          }}>
            保存
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        <div style={{
          width:220, borderRight:`2px solid ${C.border}`, padding:'12px 10px',
          overflowY:'auto', display:'flex', flexDirection:'column', gap:8,
          background:'linear-gradient(180deg,#080E1C,#0F172A)', flexShrink:0,
        }}>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:2 }}>
              Scenes
          </div>

          {SCENES.map(scene => {
            const isActive = activeSceneId === scene.id;
            const accent   = scene.type === 'goal' ? C.home : C.away;
            return (
              <div key={scene.id} onClick={() => handleSceneClick(scene)} style={{
                padding:'10px 12px', borderRadius:7,
                background: isActive ? '#0D2040' : C.panel,
                borderLeft:`4px solid ${isActive ? accent : C.border}`,
                cursor:'pointer', transition:'all .15s',
                outline: isActive ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ fontSize:13, fontWeight:600, lineHeight:1.3 }}>{scene.label}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:3 }}> {scene.scorer}</div>
                {isActive && (
                  <div style={{ fontSize:10, color:'#7EC8FF', marginTop:4, lineHeight:1.5 }}>
                    {scene.comment}
                  </div>
                )}
                {isActive && (
                  <div style={{ display:'flex', gap:4, marginTop:7, alignItems:'center' }}>
                    {scene.frames.map((_, fi) => (
                      <div key={fi}
                        onClick={e => { e.stopPropagation(); handleSeek(fi); }}
                        style={{
                          width: fi === frameIndex ? 12 : 8,
                          height: fi === frameIndex ? 8 : 8,
                          borderRadius: fi === frameIndex ? 4 : '50%',
                          background: fi <= frameIndex ? accent : C.border,
                          cursor:'pointer', transition:'all .15s', flexShrink:0,
                        }}
                      />
                    ))}
                    {isPlaying && (
                      <span style={{ fontSize:9, color:C.green, marginLeft:4, fontWeight:700 }}>● 再生中</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={handleReset} style={{
            marginTop:'auto', padding:'8px 0', background:'#1A2E50', border:'none',
            borderRadius:6, color:C.text, fontSize:11, cursor:'pointer',
          }}>
            ↺ 初期配置に戻す
          </button>

          <div style={{ padding:'10px 0 0', borderTop:`1px solid ${C.border}`, fontSize:10, color:C.muted }}>
            {[
              { color:C.home, label:'川崎フロンターレ' },
              { color:C.away, label:'相手チーム' },
              { color:C.ball, label:'ボール' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <div style={{ width:10,height:10,borderRadius:'50%',background:color,flexShrink:0 }}/>
                {label}
              </div>
            ))}
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
              {[
                { stroke:'rgba(255,255,255,.9)', dash:'none',  label:'パス',     key:'pass' },
                { stroke:'#F5C842',              dash:'none',  label:'シュート',   key:'shot' },
              ].map(({ stroke, dash, label, key }) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <svg width={22} height={6}>
                    <line x1={0} y1={3} x2={22} y2={3} stroke={stroke} strokeWidth={2} strokeDasharray={dash}/>
                  </svg>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          flex:1, background:'#111B2E', position:'relative',
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>

          <div style={{
            flex:1, overflow:'hidden', display:'flex',
            alignItems:'center', justifyContent:'center', padding:'14px 14px 0',
          }}>
            <div style={{
              position:'relative',
              height:'100%',
              aspectRatio:`${PITCH_W} / ${PITCH_H}`,
              maxWidth:'100%',
              background:C.pitch,
              borderRadius:6,
              boxShadow:'0 0 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)',
              overflow:'hidden',
              flexShrink:0,
            }}>
              <SoccerPitch />
              <TrajectoryLines lines={currentLines} />

              {isAnimating ? (
                pieces.map(piece => {
                  const isBall = piece.team === 'ball';
                  const color  = isBall ? C.ball  : piece.team==='home' ? C.home  : C.away;
                  const dark   = isBall ? C.ballDark : piece.team==='home' ? C.homeDark : C.awayDark;
                  const dur    = (activeScene?.frameDuration ?? 800) * 0.92;
                  return (
                    <div key={piece.id} style={{
                      position:'absolute',
                      left: piece.x - RADIUS,
                      top:  piece.y - RADIUS,
                      width:  RADIUS*2,
                      height: RADIUS*2,
                      borderRadius:'50%',
                      transition: `left ${dur}ms cubic-bezier(0.4,0,0.2,1), top ${dur}ms cubic-bezier(0.4,0,0.2,1)`,
                      background:`radial-gradient(circle at 35% 35%, ${color}, ${dark})`,
                      border:'2px solid rgba(255,255,255,0.55)',
                      boxShadow:'0 3px 10px rgba(0,0,0,0.55)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize: isBall ? 14 : (piece.no.length>1 ? 10 : 12),
                      fontWeight:700, color:'#fff', fontFamily:'sans-serif',
                      zIndex: isBall ? 30 : 20,
                      pointerEvents:'none',
                    }}>
                      {isBall ? '⚽' : piece.no}
                    </div>
                  );
                })
              ) : (
                pieces.map(piece => (
                  <Piece key={piece.id} piece={piece} onDragStop={handleDragStop} />
                ))
              )}
            </div>
          </div>

          <div style={{
            padding:'10px 18px 12px', display:'flex', alignItems:'center', gap:12,
            borderTop:`1px solid ${C.border}`, background:'rgba(6,10,22,0.95)', flexShrink:0,
          }}>
            <button onClick={handlePlayPause} disabled={!activeScene} style={{
              width:40, height:40, borderRadius:'50%',
              background: activeScene ? C.blue : C.border,
              border:'none', cursor: activeScene ? 'pointer' : 'default',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, color:'#fff', flexShrink:0, transition:'all .15s',
              boxShadow: activeScene ? `0 0 12px ${C.blue}60` : 'none',
            }}>
              {isPlaying ? '⏸' : '▶'}
            </button>

            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                {activeScene ? (
                  activeScene.frames.map((_, fi) => (
                    <button key={fi} onClick={() => handleSeek(fi)} style={{
                      flex:1, height:8, borderRadius:4, border:'none', cursor:'pointer',
                      background: fi < frameIndex ? C.blue
                                : fi === frameIndex ? C.home
                                : C.border,
                      opacity: fi === frameIndex ? 1 : fi < frameIndex ? 0.65 : 0.3,
                      transition:'all .15s',
                    }}/>
                  ))
                ) : (
                  <div style={{ flex:1, height:8, borderRadius:4, background:C.border, opacity:.2 }}/>
                )}
              </div>
              <div style={{ fontSize:10, color:C.muted }}>
                {activeScene
                  ? `フレーム ${frameIndex + 1} / ${totalFrames}${isPlaying ? '  ● 再生中' : ''}`
                  : '左のシーンをクリックすると再生されます'}
              </div>
            </div>
            {/* 右下のイベントバッジエリアを削除しました */}
          </div>
        </div>
      </div>
    </div>
  );
}