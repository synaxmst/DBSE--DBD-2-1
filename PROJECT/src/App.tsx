import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { JudgeProvider } from './context/JudgeContext';
import { Navbar } from './components/layout/Navbar';
import { CommandPalette } from './components/layout/CommandPalette';
import { AuthModal } from './components/auth/AuthModal';
import { HomePage } from './components/home/HomePage';
import { ProblemCatalog } from './components/problems/ProblemCatalog';
import { ProblemWorkspace } from './components/workspace/ProblemWorkspace';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { ContestsView } from './components/contests/ContestsView';
import { LeaderboardView } from './components/contests/LeaderboardView';
import { SubmissionsView } from './components/submissions/SubmissionsView';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminPage } from './pages/AdminPage';
import { CreateProblemPage } from './pages/CreateProblemPage';
import { EditProblemPage } from './pages/EditProblemPage';
import { CreateContestPage } from './pages/CreateContestPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Code2, ShieldCheck } from 'lucide-react';

const MainContent: React.FC = () => {
  const location = useLocation();
  const isWorkspace = /^\/problems\/[^/]+$/.test(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-1)] selection:bg-[var(--accent-dim)] selection:text-[var(--text-1)] transition-colors duration-150 font-sans">
      {/* Navbar — Hidden when in problem-detail workspace */}
      {!isWorkspace && <Navbar />}

      {/* Main Content View */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/problems" element={<ProblemCatalog />} />
          <Route path="/problems/:slug" element={<ProblemWorkspace />} />
          <Route path="/contests" element={<ContestsView />} />
          <Route path="/contests/:id" element={<LeaderboardView />} />
          <Route path="/leaderboard" element={<LeaderboardView />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/submissions" 
            element={
              <ProtectedRoute>
                <SubmissionsView />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute roles={['admin', 'setter']}>
                <AdminPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/problems/new" 
            element={
              <ProtectedRoute roles={['admin', 'setter']}>
                <CreateProblemPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/problems/:id/edit" 
            element={
              <ProtectedRoute roles={['admin', 'setter']}>
                <EditProblemPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/contests/new" 
            element={
              <ProtectedRoute roles={['admin', 'setter']}>
                <CreateContestPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {/* Editorial footer (hidden in problem workspace to give maximum code editor space) */}
      {!isWorkspace && (
        <footer className="border-t border-[var(--border)] bg-[var(--bg-card)] mt-auto py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-[var(--text-3)]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[var(--text-1)] font-semibold">
                <svg className="w-4 h-4 text-[var(--text-1)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                <span>AlgoFlow</span>
              </div>
              <span>·</span>
              <span>Online Judge & Algorithmic Practice</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-[var(--text-3)]">
              <span className="flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-[var(--text-2)]" /> Multi-Language Sandbox
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" /> Automated Evaluation
              </span>
              <span>·</span>
              <span>Fast & Deterministic</span>
            </div>
          </div>
        </footer>
      )}

      {/* Global Modals */}
      <CommandPalette />
      <AuthModal />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <JudgeProvider>
        <MainContent />
      </JudgeProvider>
    </ErrorBoundary>
  );
}

export default App;
