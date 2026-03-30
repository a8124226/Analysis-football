import React from 'react';
import { useParams, Link } from 'react-router-dom';

function MatchDetail() {
  const { id } = useParams(); // URLの末尾（試合ID）を受け取る魔法の言葉

  return (
    <div style={{ padding: "20px", color: "white", backgroundColor: "#0F172A", minHeight: "100vh" }}>
      <Link to="/" style={{ color: "#00A0E9", textDecoration: "none" }}>← 試合一覧に戻る</Link>
      <h1 style={{ borderBottom: "2px solid #1A2E50", paddingBottom: "10px" }}>
        試合詳細・分析 (ID: {id})
      </h1>
      <p>ここにホワイトボードとシーンリストを作っていきます！</p>
    </div>
  );
}

export default MatchDetail;