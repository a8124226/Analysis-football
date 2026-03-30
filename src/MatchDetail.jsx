import React from 'react';
import { useParams, Link } from 'react-router-dom';

function MatchDetail() {
  const { id } = useParams(); // URLの末尾（試合ID）を受け取る魔法の言葉

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#0F172A", color: "white" }}>
        
        {/* 上部：ヘッダーエリア */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #1A2E50" }}>
        <Link to="/" style={{ color: "#00A0E9", textDecoration: "none", fontSize: "14px" }}>← 試合一覧に戻る</Link>
        <h2 style={{ color: "#00A0E9",margin: "5px 0" }}>試合詳細・分析 (ID: {id})</h2>
        </div>

        {/* 下部：メインコンテンツ（左右分割） */}
        <div style={{ display: "flex", flex: 1 }}>
        
        {/* 左側：シーン・ナビゲーター (25%) */}
        <div style={{ width: "25%", borderRight: "2px solid #1A2E50", padding: "15px", overflowY: "auto" }}>
            <h3 style={{ fontSize: "16px", color: "#6B8CAE" }}>SCENES</h3>
            <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
            {/* ここに後で得点・失点などのリストが入ります */}
            <div style={{ padding: "10px", backgroundColor: "#0D1628", borderRadius: "5px", borderLeft: "4px solid #00A0E9" }}>
                【25分】得点：サンプル
            </div>
            </div>
        </div>

        {/* 右側：タクティカル・ボード (75%) */}
        <div style={{ width: "75%", backgroundColor: "#F8FAFC", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {/* ボードの背景を白（ホワイトボード風）にしています */}
            <div style={{ color: "#1e293b", fontWeight: "bold", fontSize: "20px" }}>
            ここにホワイトボード（ピッチ）を作成します
            </div>
            
            {/* 下部にコントロールパネル用のスペースを確保（予定） */}
            <div style={{ position: "absolute", bottom: "20px", width: "90%", height: "60px", backgroundColor: "#0F172A", borderRadius: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white" }}>再生コントロール（準備中）</span>
            </div>
        </div>

        </div>
    </div>
);
}

export default MatchDetail;