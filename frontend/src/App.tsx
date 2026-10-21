import { Navigate, Route, Routes } from 'react-router-dom';
import { DataPage } from './pages/DataPage';
import { Layout } from './pages/Layout';
import { MatchingPage } from './pages/MatchingPage';
import { ResultPage } from './pages/ResultPage';
import { TemplatePage } from './pages/TemplatePage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/template" element={<TemplatePage />} />
        <Route path="/data" element={<DataPage />} />
        <Route path="/matching" element={<MatchingPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/template" replace />} />
    </Routes>
  );
}
