//削除機能delete
//試合順に並び替えたい
//シーン作成ページを作る

import { Link } from 'react-router-dom';
import React, { useState, useEffect } from "react";

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
  
  // 送信するデータを整理
  // ここでキー名を 'section' に、値を数値にしっかり変換します
  const postData = { 
    opponent: opponent, 
    result: result, 
    section: parseInt(section, 10) // 文字列を確実に「数値」に変換
  };

  try {
    const res = await fetch("http://localhost:3001/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        opponent, 
        result,        // ここには 'win', 'loss', 'draw' が入る
        score,         // ここに '2-1' などが入る
        section: Number(section) 
}),
    });

    if (res.ok) {
      // 成功したら入力を空にする
      setOpponent("");setResult(""); setSection("");
      fetchMatches(); // 一覧を再取得
    } else {
      const errorMsg = await res.text();
      console.error("サーバーエラー:", errorMsg);
      alert("保存に失敗しました");
    }
  } catch (e) {
    console.error("通信エラー:", e);
  }
};

  if (loading) return <div style={{ color: "white", padding: "20px" }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: "#0A0F1E", color: "#E8F4FF", minHeight: "100vh", padding: "20px", fontFamily: "sans-serif" }}>
      
      {/* ヘッダー */}
      <header style={{paddingBottom: "10px", marginBottom: "30px" }}>
        <h1 style={{ margin: 0, color: "#00A0E9" }}>KAWASAKI FRONTARE 2026 Analysis</h1>
      </header>

      {/* --- 入力フォーム --- */}
      <section style={{ backgroundColor: "#0D1628", padding: "20px", borderRadius: "10px", border: "1px solid #1A2E50", marginBottom: "30px" }}>
        <h2 style={{ marginTop: 0, fontSize: "18px", color: "#00A0E9" }}>新規試合登録</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>

      {/* 1. 節 */}
      <input 
        style={{ padding: "10px", borderRadius: "5px", border: "1px solid #1A2E50", backgroundColor: "#0F172A", color: "white", width: "80px" }}
        type="number" placeholder="節" value={section} onChange={(e) => setSection(e.target.value)} required 
      />

      {/* 2. 対戦相手 */}
      <input 
        style={{ padding: "10px", borderRadius: "5px", border: "1px solid #1A2E50", backgroundColor: "#0F172A", color: "white" }}
        type="text" placeholder="対戦相手" value={opponent} onChange={(e) => setOpponent(e.target.value)} required 
      />

      {/* ★4. 勝敗の選択*/}
      <select 
        style={{ padding: "10px", borderRadius: "5px", border: "1px solid #1A2E50", backgroundColor: "#0F172A", color: "white" }}
        value={result} 
        onChange={(e) => setResult(e.target.value)}
      >
        <option value="win">win (勝ち)</option>
        <option value="pk_win">pk_win (PK勝ち)</option>
        <option value="pk_lose">pk_lose (PK負け)</option>
        <option value="lose">lose (負け)</option>
      </select>

      {/* ★5. スコアの入力 */}
      <input 
        style={{ padding: "10px", borderRadius: "5px", border: "1px solid #1A2E50", backgroundColor: "#0F172A", color: "white", width: "100px" }}
        type="text" 
        placeholder="2-1"
        value={score} 
        onChange={(e) => setScore(e.target.value)} 
      />

      {/* 6. ボタン */}
      <button 
        type="submit" 
        style={{ padding: "10px 20px", backgroundColor: "#00A0E9", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
      >
        登録する
      </button>
    </form>
      </section>

      {/* 試合リスト */}
      <h2 style={{ fontSize: "20px", color: "#6B8CAE", margin: "30px" }}>MATCH LIST</h2>
      <div style={{ display: "grid", gap: "10px" }}>
        {matches.map((m) => (
          <div key={m.id} style={{ backgroundColor: "#0D1628", padding: "15px", borderRadius: "8px", borderLeft: "5px solid #00A0E9" }}>
            <div style={{ fontSize: "15px", color: "#6B8CAE" }}>第{m.section}節</div>
            
            <div style={{ fontWeight: "bold", fontSize: "18px", margin: "5px 0" }}>
              <Link 
                to={`/match/${m.id}`} 
                style={{ color: "white", textDecoration: "none", cursor: "pointer" }}
                onMouseOver={(e) => e.target.style.color = "#00A0E9"} // ホバー時にブルーに
                onMouseOut={(e) => e.target.style.color = "white"}
              >
                vs {m.opponent}
              </Link>
            </div>
            <div style={{ fontSize: "15px", color: "#6B8CAE" }}>スコア: {m.score}</div>
            <div style={{ fontSize: "15px", color: "#6B8CAE" }}>結果: {m.result}</div>
          </div>
        ))}
      </div>
    </div>
  );
}