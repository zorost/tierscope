import { Route, Routes } from "react-router";
import { Shell } from "./components/Shell";
import Home from "./pages/Home";
import Consensus from "./pages/Consensus";
import Stats from "./pages/Stats";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import Methodology from "./pages/Methodology";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/consensus" element={<Consensus />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/models" element={<Models />} />
        <Route path="/models/:slug" element={<ModelDetail />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}
