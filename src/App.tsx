import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Programs from "@/pages/Programs";
import Trials from "@/pages/Trials";
import Quality from "@/pages/Quality";
import Releases from "@/pages/Releases";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/trials" element={<Trials />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/releases" element={<Releases />} />
        </Route>
      </Routes>
    </Router>
  );
}
