import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MatchList from "./MatchList";
import MatchDetail from "./MatchDetail";

function App() {
  return (
    <Router>
      <div className="App">
        {/* URLに応じて、表示するコンポーネントを切り替える設定 */}
        <Routes>
          {/* URLが「/」のときは、いつもの一覧画面を出す */}
          <Route path="/" element={<MatchList />} />

          {/* URLが「/match/数字」のときは、詳細画面を出す */}
          <Route path="/match/:id" element={<MatchDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;