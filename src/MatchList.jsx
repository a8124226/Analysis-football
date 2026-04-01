//削除機能delete
//試合順に並び替えたい

import { Link } from 'react-router-dom';
import React, { useState, useEffect } from "react";

// パターン定義（統計集計・表示に使用）
const PATTERNS = ["セットプレー", "カウンター", "クロス", "崩し", "自陣ミス", "その他"];

// localStorage からシーンを読み込む
function loadScenesForMatch(matchId) {
  try {
    const raw = localStorage.getItem(`jfro_match_${matchId}_scenes`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function MatchList() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // フォーム用の入力データ
  const [opponent, setOpponent] = useState("");
  const [result, setResult] = useState("win");
  const [score, setScore] = useState("");
  const [section, setSection] = useState("");

  // データ読み込み
  const fetchMatches = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/matches");
      const json = await res.json();
      setMatches(json.data || []);
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // 送信ボタンを押した時の処理
  const handleSubmit = async (e) => {
    e.preventDefault();

    const postData = {
      opponent: opponent,
      result: result,
      section: parseInt(section, 10)
    };

    try {
      const res = await fetch("http://localhost:3001/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponent,
          result,
          score,
          section: Number(section)
        }),
      });

      if (res.ok) {
        setOpponent(""); setResult("win"); setScore(""); setSection("");
        fetchMatches();
      } else {
        const errorMsg = await res.text();
        console.error("サーバーエラー:", errorMsg);
        alert("保存に失敗しました");
      }
    } catch (e) {
      console.error("通信エラー:", e);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/matches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMatches(matches.filter(m => m.id !== id));
      } else {
        alert("削除に失敗しました");
      }
    } catch (err) {
      console.error("削除失敗:", err);
    }
  };

  // ── 統計集計（localStorage のシーンデータから算出） ──────────
  const stats = React.useMemo(() => {
    let totalGoals = 0;
    let totalConcedes = 0;
    // パターン別カウント { [pattern]: { goal: number, concede: number } }
    const patternCount = {};
    PATTERNS.forEach(pt => { patternCount[pt] = { goal: 0, concede: 0 }; });

    matches.forEach(m => {
      const scenes = loadScenesForMatch(m.id);
      scenes.forEach(scene => {
        if (scene.type === 'goal') {
          totalGoals++;
          const pt = scene.pattern || 'その他';
          if (!patternCount[pt]) patternCount[pt] = { goal: 0, concede: 0 };
          patternCount[pt].goal++;
        } else if (scene.type === 'concede') {
          totalConcedes++;
          const pt = scene.pattern || 'その他';
          if (!patternCount[pt]) patternCount[pt] = { goal: 0, concede: 0 };
          patternCount[pt].concede++;
        }
      });
    });

    return { totalGoals, totalConcedes, patternCount };
  }, [matches]);

  if (loading) return <div style={{ color: "white", padding: "20px" }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: "#0A0F1E", color: "#E8F4FF", minHeight: "100vh", padding: "20px", fontFamily: "sans-serif" }}>

      {/* ヘッダー */}
      <header style={{ paddingBottom: "10px", marginBottom: "30px" }}>
        <h1 style={{ margin: 0, color: "#00A0E9" }}>KAWASAKI FRONTALE 2026 Analysis</h1>
      </header>

      {/* --- 入力フォーム --- */}
      <section style={{ backgroundColor: "#0D1628", padding: "20px", borderRadius: "10px", border: "1px solid #1A2E50", marginBottom: "20px" }}>
        <h2 style={{ marginTop: 0, fontSize: "18px", color: "#00A0E9" }}>新規試合登録</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <input
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #1A2E50", backgroundColor: "#0F172A", color: "white", width: "80px" }}
            type="number" placeholder="節" value={section} onChange={(e) => setSection(e.target.value)} required
          />
          <input
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #1A2E50", backgroundColor: "#0F172A", color: "white" }}
            type="text" placeholder="対戦相手" value={opponent} onChange={(e) => setOpponent(e.target.value)} required
          />
          <select
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #1A2E50", backgroundColor: "#0F172A", color: "white" }}
            value={result} onChange={(e) => setResult(e.target.value)}
          >
            <option value="win">勝ち(+3)</option>
            <option value="pk_win">PK勝ち(+2)</option>
            <option value="pk_lose">PK負け(+1)</option>
            <option value="lose">負け(+0)</option>
          </select>
          <input
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #1A2E50", backgroundColor: "#0F172A", color: "white", width: "100px" }}
            type="text" placeholder="2-1" value={score} onChange={(e) => setScore(e.target.value)}
          />
          <button
            type="submit"
            style={{ padding: "10px 20px", backgroundColor: "#00A0E9", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            登録する
          </button>
        </form>
      </section>

      {/* ── 統計パネル（フォームの直下） ─────────────────────── */}
      <section style={{ backgroundColor: "#0D1628", padding: "20px", borderRadius: "10px", border: "1px solid #1A2E50", marginBottom: "30px" }}>
        <h2 style={{ marginTop: 0, fontSize: "16px", color: "#6B8CAE", letterSpacing: "0.1em" }}>SEASON STATS</h2>

        {/* 総得点・総失点 */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
          <div style={{ flex: 1, backgroundColor: "#0A1628", borderRadius: "8px", padding: "14px 16px", border: "1px solid #1A2E50", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#00A0E9", lineHeight: 1 }}>{stats.totalGoals}</div>
            <div style={{ fontSize: "11px", color: "#6B8CAE", marginTop: "4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>総得点</div>
          </div>
          <div style={{ flex: 1, backgroundColor: "#0A1628", borderRadius: "8px", padding: "14px 16px", border: "1px solid #1A2E50", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#E05555", lineHeight: 1 }}>{stats.totalConcedes}</div>
            <div style={{ fontSize: "11px", color: "#6B8CAE", marginTop: "4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>総失点</div>
          </div>
        </div>

        {/* パターン別内訳 */}
        <div style={{ fontSize: "11px", color: "#6B8CAE", letterSpacing: "0.1em", marginBottom: "10px", textTransform: "uppercase" }}>
          パターン別内訳
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
          {PATTERNS.map(pt => {
            const cnt = stats.patternCount[pt] || { goal: 0, concede: 0 };
            if (cnt.goal === 0 && cnt.concede === 0) return null;
            return (
              <div key={pt} style={{ backgroundColor: "#0A1628", borderRadius: "6px", padding: "10px 12px", border: "1px solid #1A2E50" }}>
                <div style={{ fontSize: "11px", color: "#6B8CAE", marginBottom: "6px" }}>{pt}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#00A0E9" }}>得 {cnt.goal}</span>
                  <span style={{ fontSize: "12px", color: "#1A2E50" }}>|</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#E05555" }}>失 {cnt.concede}</span>
                </div>
              </div>
            );
          })}
          {/* データがひとつもないとき */}
          {PATTERNS.every(pt => (stats.patternCount[pt]?.goal ?? 0) + (stats.patternCount[pt]?.concede ?? 0) === 0) && (
            <div style={{ fontSize: "12px", color: "#6B8CAE", gridColumn: "1 / -1" }}>
              各試合の詳細ページでシーンを登録すると、ここに集計が表示されます。
            </div>
          )}
        </div>
      </section>

      {/* 試合リスト */}
      <h2 style={{ fontSize: "20px", color: "#6B8CAE", margin: "0 0 12px" }}>MATCH LIST</h2>
      <div style={{ display: "grid", gap: "10px" }}>
        {matches.map((m) => (
          <div key={m.id} style={{
            backgroundColor: "#0D1628", padding: "15px", borderRadius: "8px",
            borderLeft: "5px solid #00A0E9",
            // ★ 削除ボタンを右端に置くためにflexレイアウトを使う
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            {/* 試合情報（flex: 1 で残り幅を使う） */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "15px", color: "#6B8CAE" }}>第{m.section}節</div>
              <div style={{ fontWeight: "bold", fontSize: "18px", margin: "5px 0" }}>
                <Link
                  to={`/match/${m.id}`}
                  style={{ color: "white", textDecoration: "none", cursor: "pointer" }}
                  onMouseOver={(e) => e.target.style.color = "#00A0E9"}
                  onMouseOut={(e) => e.target.style.color = "white"}
                >
                  vs {m.opponent}
                </Link>
              </div>
              <div style={{ fontSize: "15px", color: "#6B8CAE" }}>スコア: {m.score}</div>
              <div style={{ fontSize: "15px", color: "#6B8CAE" }}>結果: {m.result}</div>
            </div>

            {/* ★ 削除ボタン（カード右側） */}
            <button
              onClick={(e) => {
                e.preventDefault();
                if (window.confirm(`${m.opponent}戦のデータを削除しますか？`)) {
                  handleDelete(m.id);
                }
              }}
              style={{
                flexShrink: 0,
                backgroundColor: "transparent",
                color: "#E05555",
                border: "1px solid #E05555",
                borderRadius: "4px",
                padding: "6px 12px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => { e.target.style.backgroundColor = "#E05555"; e.target.style.color = "white"; }}
              onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#E05555"; }}
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}