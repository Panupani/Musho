import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import History from './pages/History';
import Reports from './pages/Reports';
import GrowPlanner from './pages/GrowPlanner';
import PriceTracker from './pages/PriceTracker';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index           element={<Dashboard />} />
          <Route path="add"      element={<AddTransaction />} />
          <Route path="grow"     element={<GrowPlanner />} />
          <Route path="history"  element={<History />} />
          <Route path="reports"  element={<Reports />} />
          <Route path="prices"   element={<PriceTracker />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
