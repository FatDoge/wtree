import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Worktrees from "@/pages/Worktrees";
import CreateWorktree from "@/pages/CreateWorktree";
import SettingsPage from "@/pages/SettingsPage";
import HelpPage from "@/pages/HelpPage";
import { Toaster } from "sonner";
import { useThemeStore } from "@/stores/themeStore";

export default function App() {
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <Router>
      <Toaster position="top-right" richColors theme="system" />
      <Routes>
        <Route path="/" element={<Worktrees />} />
        <Route path="/create" element={<CreateWorktree />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </Router>
  );
}
