import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3001;

// ── DB接続設定 ─────────────────────────────────────────────
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:Yudai0814@localhost:5432/postgres", 
});

// ── ミドルウェア ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── ユーティリティ ───────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


/* 試合一覧取得 */
app.get("/api/matches", asyncHandler(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM matches ORDER BY section ASC");
  res.json({ data: rows });
}));

/** GET /api/matches/:id - 試合詳細とシーン一覧(JSONB含む)を取得 */
app.get("/api/matches/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const match = await pool.query("SELECT * FROM matches WHERE id = $1", [id]);
  
  if (match.rowCount === 0) return res.status(404).json({ error: "試合なし" });

  // scenesテーブルから直接visual_data(JSONB)を取得
  const scenes = await pool.query(
    "SELECT * FROM scenes WHERE match_id = $1 ORDER BY scene_order ASC",
    [id]
  );

  res.json({
    data: { ...match.rows[0], scenes: scenes.rows }
  });
}));


// SCENES (分析シーン & 座標データ)


/** POST /api/matches/:matchId/scenes - 新規シーン登録(座標も一緒に保存可) */
app.post("/api/matches/:matchId/scenes", asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { scene_order, minute, type, scorer, comment, visual_data } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO scenes (match_id, scene_order, minute, type, scorer, comment, visual_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [matchId, scene_order || 0, minute, type, scorer, comment, visual_data || {}]
  );
  res.status(201).json({ data: rows[0] });
}));

/** PUT /api/scenes/:sceneId - シーン・座標データの更新(上書き) */
app.put("/api/scenes/:sceneId", asyncHandler(async (req, res) => {
  const { sceneId } = req.params;
  const { minute, type, scorer, comment, visual_data } = req.body;

  const { rows } = await pool.query(
    `UPDATE scenes SET
      minute = COALESCE($1, minute),
      type = COALESCE($2, type),
      scorer = COALESCE($3, scorer),
      comment = COALESCE($4, comment),
      visual_data = COALESCE($5, visual_data),
      updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [minute, type, scorer, comment, visual_data, sceneId]
  );

  if (rows.length === 0) return res.status(404).json({ error: "シーンなし" });
  res.json({ data: rows[0] });
}));

/** DELETE /api/scenes/:sceneId - シーン削除 */
app.delete("/api/scenes/:sceneId", asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM scenes WHERE id = $1", [req.params.sceneId]);
  res.status(204).send();
}));


//試合情報を追加
app.post("/api/matches", async (req, res) => {
  const { opponent, match_date, result, section, score } = req.body; 

  try {
    const query = `
      INSERT INTO matches (opponent, match_date, result, section, score) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    const values = [opponent, match_date, result, section, score];

    const { rows } = await pool.query(query, values);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error("DB保存エラー:", err.message);
    res.status(500).json({ error: err.message });
  }
});

//試合情報を削除
app.delete("/api/matches/:id", async (req, res) => {
  const { id } = req.params;  
  await pool.query("DELETE FROM matches WHERE id = $1", [id]);
  res.status(204).send();
});



// ── 起動 ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🌊 API Server: http://localhost:${PORT}`);
});