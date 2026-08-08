import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { Home } from "./pages/Home";
import { NewProject } from "./pages/NewProject";
import { ProjectView } from "./pages/ProjectView";
import { PublicShareView } from "./pages/PublicShareView";
import { JoinInvite } from "./pages/JoinInvite";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/p/:shareToken" element={<PublicShareView />} />
        <Route
          path="/invite/:token"
          element={
            <RequireAuth>
              <JoinInvite />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/new"
          element={
            <RequireAuth>
              <NewProject />
            </RequireAuth>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <RequireAuth>
              <ProjectView />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
