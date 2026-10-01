import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  PlusCircle, 
  Trophy, 
  Fingerprint, 
  AlertTriangle, 
  Search, 
  Play, 
  Loader2,
  FileCode,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Code2,
  BookOpen,
  Save,
  FileText,
  Eye,
  Calendar,
  Clock,
  Trash2,
  X
} from 'lucide-react';
import { useJudge } from '../context/JudgeContext';
import { renderMarkdownToHtml } from '../utils/markdownRenderer';
import { normalizeContest } from '../api/contests';
import { apiClient } from '../api/client';
import type { Contest } from '../types/judge';

interface AdminStats {
  userCount: number;
  problemCount: number;
  submissionCount: number;
  acceptedCount: number;
  acceptanceRate: number;
}

interface AdminProblem {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  status?: 'draft' | 'published' | 'archived';
  submissionsCount?: number;
  totalAccepted?: number;
  isPublished?: boolean;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  createdAt?: string;
}

interface AdminUser {
  _id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  rating: number;
  solvedProblems: string[];
  createdAt: string;
}

interface RecentSubmission {
  _id: string;
  userId: { username: string; name: string } | null;
  problemId: { title: string; slug: string; difficulty: string } | null;
  language: string;
  verdict: string;
  executionTimeMs: number;
  createdAt: string;
}

interface HealthData {
  redis: string;
  queueDepth: number;
  queueFailed: number;
  timestamp: string;
}

interface SuspiciousMatch {
  submission1Id: string;
  submission2Id: string;
  user1Id: string;
  user2Id: string;
  user1Username: string;
  user2Username: string;
  problemId: string;
  problemTitle: string;
  language: string;
  similarity: number;
  matchedTokensCount: number;
  flaggedAt: string;
}

interface PlagiarismReportData {
  contestId: string;
  analyzedSubmissionsCount: number;
  flaggedPairsCount: number;
  matches: SuspiciousMatch[];
  similarityThreshold?: number;
  status?: string;
  createdAt?: string;
}

interface ContestOption {
  id: string;
  title: string;
  participantCount?: number;
}

type Tab = 'overview' | 'problems' | 'contests' | 'users' | 'submissions' | 'plagiarism' | 'health';

const VERDICT_COLOR: Record<string, string> = {
  Accepted: 'text-[var(--green)]',
  'Wrong Answer': 'text-[var(--red)]',
  'Time Limit Exceeded': 'text-[var(--amber)]',
  'Memory Limit Exceeded': 'text-[var(--red)]',
  'Runtime Error': 'text-[var(--red)]',
  'Compilation Error': 'text-[var(--amber)]',
  Running: 'text-[var(--accent)]',
  Pending: 'text-[var(--text-3)]',
};

export const AdminPage: React.FC = () => {
  const { currentUser } = useJudge();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [adminContests, setAdminContests] = useState<Contest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [submissions, setSubmissions] = useState<RecentSubmission[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null);

  // Search states
  const [problemSearch, setProblemSearch] = useState<string>('');
  const [contestSearch, setContestSearch] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');

  // Contests Editorial Editor state
  const [expandedEditorialId, setExpandedEditorialId] = useState<string | null>(null);
  const [editorialDrafts, setEditorialDrafts] = useState<Record<string, string>>({});
  const [savingEditorialId, setSavingEditorialId] = useState<string | null>(null);
  const [editorialSaveSuccess, setEditorialSaveSuccess] = useState<string | null>(null);
  const [editorialPreviewMode, setEditorialPreviewMode] = useState<Record<string, boolean>>({});

  // Plagiarism state
  const [contestsList, setContestsList] = useState<ContestOption[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(70);
  const [plagiarismReport, setPlagiarismReport] = useState<PlagiarismReportData | null>(null);
  const [scanningPlagiarism, setScanningPlagiarism] = useState<boolean>(false);
  const [plagiarismError, setPlagiarismError] = useState<string | null>(null);
  const [matrixFilterProblem, setMatrixFilterProblem] = useState<string>('All');
  const [selectedPair, setSelectedPair] = useState<SuspiciousMatch | null>(null);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPair(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load stats.');
    }
  }, []);

  const fetchProblems = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const url = search 
        ? `/problems?status=all&search=${encodeURIComponent(search)}&limit=100` 
        : `/problems?status=all&limit=100`;
      const res = await apiClient.get(url);
      if (res.data.success && res.data.data) {
        setProblems(res.data.data.problems || res.data.data);
      } else {
        setError(res.data.error || 'Failed to load problems.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load problems catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQuickStatusChange = async (problemId: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      const res = await apiClient.put(`/problems/${problemId}`, { status: newStatus });
      if (res.data.success) {
        setProblems(prev =>
          prev.map(p => {
            if ((p._id || p.id) === problemId) {
              return { ...p, status: newStatus, isPublished: newStatus === 'published' };
            }
            return p;
          })
        );
      } else {
        setError(res.data.error || 'Failed to update problem status.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update problem status.');
    }
  };

  const handleDeleteProblem = async (problemId: string, problemTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${problemTitle}"? This cannot be undone.`)) {
      return;
    }
    setDeletingProblemId(problemId);
    try {
      const res = await apiClient.delete(`/problems/${problemId}`);
      if (res.data.success) {
        setProblems(prev => prev.filter(p => (p._id || p.id) !== problemId));
        fetchStats();
      } else {
        setError(res.data.error || 'Failed to delete problem.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete problem.');
    } finally {
      setDeletingProblemId(null);
    }
  };

  const fetchAdminContests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/contests');
      if (res.data.success && Array.isArray(res.data.data)) {
        const list = res.data.data.map(normalizeContest);
        setAdminContests(list);
        const initialDrafts: Record<string, string> = {};
        list.forEach((c: Contest) => {
          initialDrafts[c.id] = c.editorial || '';
        });
        setEditorialDrafts(prev => ({ ...initialDrafts, ...prev }));
      } else {
        setError('Failed to load contests.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load contests list.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveEditorial = async (contestId: string) => {
    setSavingEditorialId(contestId);
    setEditorialSaveSuccess(null);
    try {
      const content = editorialDrafts[contestId] ?? '';
      const res = await apiClient.put(`/contests/${contestId}/editorial`, { editorial: content });
      if (res.data.success) {
        setEditorialSaveSuccess(contestId);
        setAdminContests(prev =>
          prev.map(c => (c.id === contestId ? { ...c, editorial: content } : c))
        );
        setTimeout(() => {
          setEditorialSaveSuccess(prev => (prev === contestId ? null : prev));
        }, 3000);
      } else {
        setError(res.data.error || 'Failed to save editorial.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save editorial to server.');
    } finally {
      setSavingEditorialId(null);
    }
  };

  const fetchUsers = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/admin/users?search=${encodeURIComponent(search)}&limit=30`);
      if (res.data.success) setUsers(res.data.data.users);
      else setError(res.data.error || 'Failed to load users.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/submissions/recent?limit=25');
      if (res.data.success) setSubmissions(res.data.data);
      else setError(res.data.error || 'Failed to load submissions.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/health');
      if (res.data.success) setHealth(res.data.data);
      else setError(res.data.error || 'Failed to load health data.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load health data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContestsList = useCallback(async () => {
    try {
      const res = await apiClient.get('/contests');
      if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const list: ContestOption[] = res.data.data.map((c: any) => ({
          id: c.id || c._id,
          title: c.title,
          participantCount: c.participantCount || 0,
        }));
        setContestsList(list);
        if (!selectedContestId && list.length > 0) {
          setSelectedContestId(list[0].id);
        }
      } else {
        setContestsList([]);
      }
    } catch {
      setContestsList([]);
    }
  }, [selectedContestId]);

  const triggerPlagiarismScan = async () => {
    if (!selectedContestId) {
      setPlagiarismError('Please select a tournament contest to analyze.');
      return;
    }
    setScanningPlagiarism(true);
    setPlagiarismError(null);
    try {
      const res = await apiClient.post('/plagiarism/scan', {
        contestId: selectedContestId,
        threshold: threshold / 100,
      });
      if (res.data.success && res.data.data) {
        setPlagiarismReport(res.data.data);
      } else {
        setPlagiarismError(res.data.error || 'Plagiarism analysis scan returned an error.');
      }
    } catch (err: any) {
      setPlagiarismError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to dispatch scan to Plagiarism Service.');
    } finally {
      setScanningPlagiarism(false);
    }
  };

  const fetchExistingPlagiarismReport = async (contestId: string) => {
    if (!contestId) return;
    setPlagiarismError(null);
    try {
      const res = await apiClient.get(`/plagiarism/scan/${contestId}`);
      if (res.data.success && res.data.data) {
        setPlagiarismReport(res.data.data);
      } else {
        setPlagiarismReport(null);
      }
    } catch {
      setPlagiarismReport(null);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    setRoleUpdating(userId);
    try {
      const res = await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      } else {
        setError(res.data.error || 'Failed to update role.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update role.');
    } finally {
      setRoleUpdating(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'problems') fetchProblems(problemSearch);
    if (activeTab === 'contests') fetchAdminContests();
    if (activeTab === 'users') fetchUsers(userSearch);
    if (activeTab === 'submissions') fetchSubmissions();
    if (activeTab === 'plagiarism') {
      fetchContestsList();
      if (selectedContestId) {
        fetchExistingPlagiarismReport(selectedContestId);
      }
    }
    if (activeTab === 'health') fetchHealth();
  }, [activeTab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'problems', label: 'Problems' },
    { id: 'contests', label: 'Contests' },
    { id: 'users', label: 'Users' },
    { id: 'submissions', label: 'Live Feed' },
    { id: 'plagiarism', label: 'Plagiarism' },
    { id: 'health', label: 'System Health' },
  ];

  // Unique problems in matches for filtering
  const matchProblems = useMemo(() => {
    if (!plagiarismReport || !plagiarismReport.matches) return [];
    const set = new Set<string>();
    plagiarismReport.matches.forEach(m => {
      if (m.problemTitle) set.add(m.problemTitle);
      else if (m.problemId) set.add(m.problemId);
    });
    return Array.from(set);
  }, [plagiarismReport]);

  const filteredMatches = useMemo(() => {
    if (!plagiarismReport || !plagiarismReport.matches) return [];
    return plagiarismReport.matches.filter(m => {
      if (matrixFilterProblem === 'All') return true;
      return m.problemTitle === matrixFilterProblem || m.problemId === matrixFilterProblem;
    });
  }, [plagiarismReport, matrixFilterProblem]);

  // Unique users involved in flagged matches for matrix heatmap
  const matrixUsers = useMemo(() => {
    if (!filteredMatches || filteredMatches.length === 0) return [];
    const userMap = new Map<string, string>();
    filteredMatches.forEach(m => {
      userMap.set(m.user1Username, m.user1Username);
      userMap.set(m.user2Username, m.user2Username);
    });
    return Array.from(userMap.keys());
  }, [filteredMatches]);

  const getSimilarityCell = (u1: string, u2: string) => {
    if (u1 === u2) return { val: 1.0, isSelf: true };
    const match = filteredMatches.find(
      m => (m.user1Username === u1 && m.user2Username === u2) || (m.user1Username === u2 && m.user2Username === u1)
    );
    if (!match) return { val: 0, isSelf: false };
    return { val: match.similarity, isSelf: false, match };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-fade text-[var(--bone)]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-dim)] border border-[var(--accent)]/30 text-xs font-mono font-semibold text-[var(--verdigris)]">
            <Shield className="w-3.5 h-3.5 text-[var(--verdigris)]" />
            Restricted Admin Portal · Role: {currentUser?.role?.toUpperCase() || 'ADMIN'}
          </div>
          <h1 className="text-2xl font-bold text-[var(--bone)] tracking-tight">Admin Operations Console</h1>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'overview') fetchStats();
            if (activeTab === 'problems') fetchProblems(problemSearch);
            if (activeTab === 'contests') fetchAdminContests();
            if (activeTab === 'users') fetchUsers(userSearch);
            if (activeTab === 'submissions') fetchSubmissions();
            if (activeTab === 'plagiarism') {
              fetchContestsList();
              if (selectedContestId) fetchExistingPlagiarismReport(selectedContestId);
            }
            if (activeTab === 'health') fetchHealth();
          }}
          className="btn-secondary flex items-center gap-2 font-mono text-xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red)]/30 text-[var(--red)] text-xs font-mono flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-xs cursor-pointer ml-3">Dismiss</button>
        </div>
      )}

      {/* Stats Row — always visible */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Registered Users', value: stats.userCount },
            { label: 'Problem Catalog', value: stats.problemCount },
            { label: 'Total Submissions', value: stats.submissionCount },
            { label: 'Accepted Verdicts', value: stats.acceptedCount },
            { label: 'Platform AR', value: `${stats.acceptanceRate}%` },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)]">
              <div className="text-2xl font-bold font-mono text-[var(--bone)]">{s.value}</div>
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto no-scrollbar font-mono text-xs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-[var(--verdigris)] text-[var(--verdigris)] font-semibold'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--bone)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="card p-6 space-y-3 hover:border-[var(--border-strong)] transition-all cursor-pointer group bg-[var(--carbon)] border-[var(--border)]"
            onClick={() => setActiveTab('problems')}
          >
            <div className="flex items-center justify-between">
              <Code2 className="w-5 h-5 text-[var(--verdigris)]" />
              <Link
                to="/admin/problems/new"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-mono text-[var(--verdigris)] hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Problem
              </Link>
            </div>
            <h3 className="font-bold text-[var(--bone)] group-hover:text-[var(--verdigris)] transition-colors">
              Problem Management
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed">
              Browse, author, edit problem statements, configure test cases, and manage execution constraints.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('contests')}
            className="card p-6 space-y-3 hover:border-[var(--border-strong)] transition-all cursor-pointer group bg-[var(--carbon)] border-[var(--border)]"
          >
            <div className="flex items-center justify-between">
              <Trophy className="w-5 h-5 text-[var(--verdigris)]" />
              <Link
                to="/admin/contests/new"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-mono text-[var(--verdigris)] hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Contest
              </Link>
            </div>
            <h3 className="font-bold text-[var(--bone)] group-hover:text-[var(--verdigris)] transition-colors">
              Contest & Editorial Management
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed">
              Schedule competitive tournaments, configure ICPC scoring modes, select challenge problemsets, and author official editorials.
            </p>
          </div>

          <div 
            className="card p-6 space-y-3 hover:border-[var(--border-strong)] transition-all cursor-pointer group bg-[var(--carbon)] border-[var(--border)]" 
            onClick={() => setActiveTab('plagiarism')}
          >
            <Fingerprint className="w-5 h-5 text-[var(--verdigris)]" />
            <h3 className="font-bold text-[var(--bone)] group-hover:text-[var(--verdigris)] transition-colors">
              Plagiarism & Fingerprint Engine
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed">
              Scan tournament submissions for token and N-gram structural similarity, winnowing overlaps, and code duplication matrix.
            </p>
          </div>

          {[
            { title: 'User Management', desc: 'Inspect participant records, modify system access roles, search by handle or email.', tab: 'users' as Tab, icon: Users },
            { title: 'Live Submission Feed', desc: 'Monitor telemetry benchmarks and execution verdicts across all nodes in real time.', tab: 'submissions' as Tab, icon: Activity },
            { title: 'System Health', desc: 'Inspect Redis connection status, BullMQ queue depth, and worker cluster metrics.', tab: 'health' as Tab, icon: CheckCircle },
          ].map(card => (
            <div 
              key={card.title} 
              className="card p-6 space-y-3 hover:border-[var(--border-strong)] transition-all cursor-pointer group bg-[var(--carbon)] border-[var(--border)]" 
              onClick={() => setActiveTab(card.tab)}
            >
              <card.icon className="w-5 h-5 text-[var(--verdigris)]" />
              <h3 className="font-bold text-[var(--bone)] group-hover:text-[var(--verdigris)] transition-colors">{card.title}</h3>
              <p className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* 2. PROBLEMS */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search problem by title or tag..."
                value={problemSearch}
                onChange={e => setProblemSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchProblems(problemSearch)}
                className="w-full h-9 bg-[var(--ash)] border border-[var(--border)] focus:border-[var(--verdigris)] rounded-[var(--r-md)] pl-9 pr-3 text-xs font-mono text-[var(--bone)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
              />
            </div>
            <Link
              to="/admin/problems/new"
              className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold text-xs font-mono flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create Problem
            </Link>
          </div>

          <div className="card overflow-hidden bg-[var(--carbon)] border-[var(--border)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--ash)] text-xs font-mono text-[var(--text-3)] uppercase tracking-wider h-9">
                  <th className="px-4 py-3 font-medium">Problem</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Submissions</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-3)] font-mono">Loading problem catalog...</td></tr>
                )}
                {!loading && problems.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-3)] font-mono">No problems found.</td></tr>
                )}
                {problems.map(p => {
                  const problemId = p._id || p.id || '';
                  const accepted = p.totalAccepted ?? 0;
                  const count = p.submissionsCount ?? 0;
                  const rate = count > 0 ? ((accepted / count) * 100).toFixed(0) : '0';
                  const currentStatus = p.status || (p.isPublished ? 'published' : 'draft');

                  return (
                    <tr key={problemId} className="hover:bg-[var(--ash)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--bone)] text-sm">{p.title}</div>
                        <div className="text-xs font-mono text-[var(--text-3)]">/{p.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold capitalize ${
                            currentStatus === 'published'
                              ? 'bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green)]/30'
                              : currentStatus === 'draft'
                              ? 'bg-[var(--amber-dim)] text-[var(--amber)] border border-[var(--amber)]/30'
                              : 'bg-[var(--ash)] text-[var(--text-3)] border border-[var(--border)]'
                          }`}>
                            {currentStatus}
                          </span>
                          <select
                            value={currentStatus}
                            onChange={(e) => handleQuickStatusChange(problemId, e.target.value as 'draft' | 'published' | 'archived')}
                            className="h-6 px-1 text-[11px] font-mono bg-[var(--ash)] border border-[var(--border)] focus:border-[var(--verdigris)] rounded text-[var(--text-2)] hover:text-[var(--bone)] cursor-pointer focus:outline-none transition-colors"
                            title="Quick Status Change"
                          >
                            <option value="draft" className="bg-[var(--carbon)] text-[var(--amber)]">draft</option>
                            <option value="published" className="bg-[var(--carbon)] text-[var(--green)]">published</option>
                            <option value="archived" className="bg-[var(--carbon)] text-[var(--text-3)]">archived</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          p.difficulty === 'Easy'
                            ? 'bg-[var(--green-dim)] text-[var(--green)]'
                            : p.difficulty === 'Medium'
                            ? 'bg-[var(--amber-dim)] text-[var(--amber)]'
                            : 'bg-[var(--red-dim)] text-[var(--red)]'
                        }`}>
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(p.tags || []).slice(0, 3).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-[var(--ash)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-2)]">
                              #{t}
                            </span>
                          ))}
                          {(p.tags || []).length > 3 && (
                            <span className="text-[10px] font-mono text-[var(--text-3)] self-center">
                              +{p.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)] font-mono">
                        <div>{count} total ({rate}% AR)</div>
                        <div className="text-[11px] text-[var(--text-3)]">{accepted} AC</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/problems/${problemId}/edit`}
                            className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1.5 font-mono text-[var(--verdigris)] hover:border-[var(--verdigris)]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </Link>
                          <Link
                            to={`/problems/${p.slug || problemId}`}
                            className="text-[var(--text-3)] hover:text-[var(--bone)] p-1.5 transition-colors rounded hover:bg-[var(--ash)]"
                            title="View in Problem Workspace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteProblem(problemId, p.title)}
                            disabled={deletingProblemId === problemId}
                            className="p-1.5 text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red-dim)] rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Problem"
                          >
                            {deletingProblemId === problemId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CONTESTS & EDITORIALS */}
      {activeTab === 'contests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search contest by title or slug..."
                value={contestSearch}
                onChange={e => setContestSearch(e.target.value)}
                className="w-full h-9 bg-[var(--ash)] border border-[var(--border)] focus:border-[var(--verdigris)] rounded-[var(--r-md)] pl-9 pr-3 text-xs font-mono text-[var(--bone)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
              />
            </div>
            <Link
              to="/admin/contests/new"
              className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold text-xs font-mono flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create Contest
            </Link>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="card py-12 text-center text-[var(--text-3)] font-mono bg-[var(--carbon)] border-[var(--border)]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--verdigris)]" />
                <span>Loading tournament roster...</span>
              </div>
            )}

            {!loading && adminContests.length === 0 && (
              <div className="card py-12 text-center text-[var(--text-3)] font-mono bg-[var(--carbon)] border-[var(--border)]">
                No contests found. Click "Create Contest" to initialize a new tournament.
              </div>
            )}

            {!loading &&
              adminContests
                .filter(c =>
                  contestSearch
                    ? c.title.toLowerCase().includes(contestSearch.toLowerCase()) ||
                      c.slug.toLowerCase().includes(contestSearch.toLowerCase())
                    : true
                )
                .map(contest => {
                  const isExpanded = expandedEditorialId === contest.id;
                  const isSaving = savingEditorialId === contest.id;
                  const isSaved = editorialSaveSuccess === contest.id;
                  const isPreview = editorialPreviewMode[contest.id] ?? false;
                  const currentEditorial = editorialDrafts[contest.id] ?? '';
                  const hasEditorial = Boolean(contest.editorial && contest.editorial.trim().length > 0);

                  return (
                    <div
                      key={contest.id}
                      className="card p-5 bg-[var(--carbon)] border-[var(--border)] space-y-4 transition-all"
                    >
                      {/* Contest Header Row */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${
                                contest.status === 'Live'
                                  ? 'bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green)]/30'
                                  : contest.status === 'Upcoming'
                                  ? 'bg-[var(--amber-dim)] text-[var(--amber)] border border-[var(--amber)]/30'
                                  : 'bg-[var(--ash)] text-[var(--text-3)] border border-[var(--border)]'
                              }`}
                            >
                              {contest.status}
                            </span>
                            <h3 className="text-base font-bold text-[var(--bone)] tracking-tight truncate">
                              {contest.title}
                            </h3>
                            <span className="text-xs font-mono text-[var(--text-3)]">
                              /{contest.slug}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-3)] flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[var(--text-3)]" />
                              {new Date(contest.startTime).toLocaleDateString()}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[var(--text-3)]" />
                              {contest.durationMinutes} mins
                            </span>
                            <span>·</span>
                            <span>{contest.problemIds.length} Problems</span>
                            <span>·</span>
                            <span>{contest.participantCount.toLocaleString()} Participants</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
                          <button
                            onClick={() =>
                              setExpandedEditorialId(isExpanded ? null : contest.id)
                            }
                            className={`btn-secondary !text-xs !py-1.5 !px-3 font-mono flex items-center gap-1.5 cursor-pointer transition-colors ${
                              isExpanded
                                ? 'bg-[var(--ash)] border-[var(--verdigris)] text-[var(--verdigris)]'
                                : hasEditorial
                                ? 'text-[var(--bone)] border-[var(--border)]'
                                : 'text-[var(--text-2)] border-[var(--border)]'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[var(--verdigris)]" />
                            <span>{isExpanded ? 'Hide Editorial Editor' : 'Edit Editorial'}</span>
                            {hasEditorial && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] inline-block ml-0.5" />
                            )}
                          </button>

                          <Link
                            to={`/contests/${contest.id}`}
                            className="btn-secondary !text-xs !py-1.5 !px-3 font-mono text-[var(--bone)] hover:text-[var(--verdigris)] flex items-center gap-1.5"
                            title="View Scoreboard & Contest"
                          >
                            <Trophy className="w-3.5 h-3.5 text-[var(--amber)]" />
                            <span>Standings</span>
                            <ExternalLink className="w-3 h-3 text-[var(--text-3)]" />
                          </Link>
                        </div>
                      </div>

                      {/* Expandable Editorial Editor Drawer */}
                      {isExpanded && (
                        <div className="p-4 rounded-[var(--r-md)] bg-[var(--ash)]/50 border border-[var(--border)] space-y-3.5 page-fade">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[var(--verdigris)]" />
                              <span className="text-xs font-mono font-bold text-[var(--bone)] uppercase tracking-wider">
                                Contest Editorial (Markdown)
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Quick Insert Snippet Buttons */}
                              <div className="hidden md:flex items-center gap-1 font-mono text-[10px] text-[var(--text-3)]">
                                <span className="mr-1">Insert:</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditorialDrafts(prev => ({
                                      ...prev,
                                      [contest.id]:
                                        (prev[contest.id] || '') +
                                        '\n\n## Problem A: \n\n### Approach\n\n### Complexity\n- Time: O(N)\n- Space: O(1)\n',
                                    }))
                                  }
                                  className="px-1.5 py-0.5 rounded bg-[var(--carbon)] hover:bg-[var(--ash)] border border-[var(--border)] text-[var(--bone)] cursor-pointer"
                                >
                                  + Problem Section
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditorialDrafts(prev => ({
                                      ...prev,
                                      [contest.id]:
                                        (prev[contest.id] || '') +
                                        '\n```cpp\n// C++ Solution\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // solution\n    return 0;\n}\n```\n',
                                    }))
                                  }
                                  className="px-1.5 py-0.5 rounded bg-[var(--carbon)] hover:bg-[var(--ash)] border border-[var(--border)] text-[var(--verdigris)] cursor-pointer"
                                >
                                  + Code Block
                                </button>
                              </div>

                              {/* Toggle Preview / Write */}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditorialPreviewMode(prev => ({
                                    ...prev,
                                    [contest.id]: !isPreview,
                                  }))
                                }
                                className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer border ${
                                  isPreview
                                    ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border-[var(--accent-border)]'
                                    : 'bg-[var(--carbon)] text-[var(--bone)] border-[var(--border)]'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isPreview ? 'Write Mode' : 'Preview HTML'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Editor or Preview Pane */}
                          {isPreview ? (
                            <div className="min-h-[220px] max-h-[420px] overflow-y-auto p-4 rounded-[var(--r-md)] bg-[var(--carbon)] border border-[var(--border)]">
                              {currentEditorial.trim().length > 0 ? (
                                <div
                                  className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed space-y-4 font-sans editorial-content"
                                  dangerouslySetInnerHTML={{
                                    __html: renderMarkdownToHtml(currentEditorial),
                                  }}
                                />
                              ) : (
                                <div className="text-center py-10 text-xs font-mono text-[var(--text-3)]">
                                  Editorial markdown draft is empty. Switch to Write Mode to compose solutions.
                                </div>
                              )}
                            </div>
                          ) : (
                            <textarea
                              value={currentEditorial}
                              onChange={e =>
                                setEditorialDrafts(prev => ({
                                  ...prev,
                                  [contest.id]: e.target.value,
                                }))
                              }
                              rows={10}
                              placeholder="Write tournament editorial in Markdown (e.g. ## Problem A: Title\n\n### Approach\nExplain algorithm and invariants...\n\n```cpp\n// C++ Solution\n```)"
                              className="w-full bg-[var(--carbon)] border border-[var(--border)] focus:border-[var(--verdigris)] rounded-[var(--r-md)] p-3.5 text-xs font-mono text-[var(--bone)] placeholder-[var(--text-3)] focus:outline-none leading-relaxed transition-colors resize-y font-normal"
                            />
                          )}

                          {/* Footer Actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs font-mono">
                            <span className="text-[var(--text-3)] text-[11px]">
                              {currentEditorial.length} characters · {currentEditorial.split('\n').length} lines · Markdown rendered when contest concludes
                            </span>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {isSaved && (
                                <span className="inline-flex items-center gap-1 text-[var(--green)] font-semibold text-xs font-mono page-fade">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Saved to Contest</span>
                                </span>
                              )}

                              <button
                                onClick={() => handleSaveEditorial(contest.id)}
                                disabled={isSaving}
                                className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving Editorial...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save Editorial</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* 4. USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by handle, name, or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchUsers(userSearch)}
              className="w-full h-9 bg-[var(--ash)] border border-[var(--border)] focus:border-[var(--verdigris)] rounded-[var(--r-md)] pl-9 pr-3 text-xs font-mono text-[var(--bone)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
            />
          </div>
          <div className="card overflow-hidden bg-[var(--carbon)] border-[var(--border)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--ash)] text-xs font-mono text-[var(--text-3)] uppercase tracking-wider h-9">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Solved</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-3)] font-mono">Loading users...</td></tr>
                )}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-3)] font-mono">No users found.</td></tr>
                )}
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-[var(--ash)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--bone)] text-sm">{u.username}</div>
                      <div className="text-xs text-[var(--text-3)]">{u.name}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-2)] font-mono">{u.email}</td>
                    <td className="px-4 py-3 text-[var(--text-2)] font-mono">{u.rating}</td>
                    <td className="px-4 py-3 text-[var(--text-2)] font-mono">{u.solvedProblems?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      {currentUser?.role === 'admin' ? (
                        <select
                          value={u.role}
                          disabled={roleUpdating === u._id || u._id === (currentUser as any)?._id || u._id === currentUser?.id}
                          onChange={e => changeRole(u._id, e.target.value)}
                          className="bg-[var(--ash)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--bone)] focus:border-[var(--verdigris)] disabled:opacity-50"
                        >
                          <option value="user">user</option>
                          <option value="setter">setter</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span className="text-xs font-mono text-[var(--text-2)] uppercase">{u.role}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. LIVE FEED */}
      {activeTab === 'submissions' && (
        <div className="card overflow-hidden bg-[var(--carbon)] border-[var(--border)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--ash)] text-xs font-mono text-[var(--text-3)] uppercase tracking-wider h-9">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Problem</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Verdict</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-3)] font-mono">Loading telemetry stream...</td></tr>
              )}
              {!loading && submissions.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-3)] font-mono">No submissions recorded yet.</td></tr>
              )}
              {submissions.map(s => (
                <tr key={s._id} className="hover:bg-[var(--ash)] transition-colors">
                  <td className="px-4 py-3 text-[var(--bone)] font-semibold text-sm">{s.userId?.username ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[var(--bone)] font-medium">{s.problemId?.title ?? '—'}</span>
                    {s.problemId?.difficulty && (
                      <span className={`ml-2 text-xs font-mono ${s.problemId.difficulty === 'Easy' ? 'text-[var(--green)]' : s.problemId.difficulty === 'Medium' ? 'text-[var(--amber)]' : 'text-[var(--red)]'}`}>
                        [{s.problemId.difficulty}]
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-2)] font-mono uppercase text-xs">{s.language}</td>
                  <td className={`px-4 py-3 font-semibold text-xs font-mono ${VERDICT_COLOR[s.verdict] ?? 'text-[var(--text-2)]'}`}>{s.verdict}</td>
                  <td className="px-4 py-3 text-[var(--bone)] text-xs font-mono">{s.executionTimeMs}ms</td>
                  <td className="px-4 py-3 text-[var(--text-3)] text-xs font-mono">{new Date(s.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. PLAGIARISM & SIMILARITY MATRIX */}
      {activeTab === 'plagiarism' && (
        <div className="space-y-6">
          
          {/* Controls Card */}
          <div className="card p-6 bg-[var(--carbon)] border-[var(--border)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-[var(--verdigris)]" />
                  <h2 className="text-base font-bold text-[var(--bone)] tracking-tight">
                    Tournament Plagiarism Analysis
                  </h2>
                </div>
                <p className="text-xs text-[var(--text-2)]">
                  Execute Winnowing fingerprint tokenization and Jaccard similarity across Accepted submissions.
                </p>
              </div>

              <div className="text-xs font-mono text-[var(--text-3)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
                <span>Service Port: 4002</span>
              </div>
            </div>

            {plagiarismError && (
              <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red)]/30 text-[var(--red)] text-xs font-mono flex items-center justify-between">
                <span>{plagiarismError}</span>
                <button onClick={() => setPlagiarismError(null)} className="underline text-xs cursor-pointer ml-3">Dismiss</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Contest Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)]">
                  Select Contest
                </label>
                <select
                  value={selectedContestId}
                  onChange={e => {
                    const id = e.target.value;
                    setSelectedContestId(id);
                    fetchExistingPlagiarismReport(id);
                  }}
                  className="w-full h-10 bg-[var(--ash)] border border-[var(--border)] focus:border-[var(--verdigris)] rounded-[var(--r-md)] px-3 text-xs font-mono text-[var(--bone)] focus:outline-none cursor-pointer"
                >
                  {contestsList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)]">
                    Similarity Threshold
                  </label>
                  <span className="text-xs font-mono font-bold text-[var(--verdigris)]">{threshold}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={40}
                    max={95}
                    step={5}
                    value={threshold}
                    onChange={e => setThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-[var(--ash)] accent-[var(--verdigris)] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Scan Trigger Button */}
              <button
                onClick={triggerPlagiarismScan}
                disabled={scanningPlagiarism || !selectedContestId}
                className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold !h-10 text-xs font-mono flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {scanningPlagiarism ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--obsidian)]" />
                    <span>Analyzing Tokens...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-[var(--obsidian)] text-[var(--obsidian)]" />
                    <span>Trigger Plagiarism Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Analysis Metrics */}
          {plagiarismReport && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)]">
                <div className="text-2xl font-bold font-mono text-[var(--bone)]">{plagiarismReport.analyzedSubmissionsCount}</div>
                <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] mt-1">Submissions Evaluated</div>
              </div>

              <div className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)]">
                <div className={`text-2xl font-bold font-mono ${plagiarismReport.flaggedPairsCount > 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
                  {plagiarismReport.flaggedPairsCount}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] mt-1">Suspicious Pairs Flagged</div>
              </div>

              <div className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)]">
                <div className="text-2xl font-bold font-mono text-[var(--amber)]">
                  {plagiarismReport.matches && plagiarismReport.matches.length > 0 
                    ? `${(Math.max(...plagiarismReport.matches.map(m => m.similarity)) * 100).toFixed(1)}%`
                    : '0.0%'}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] mt-1">Peak Overlap</div>
              </div>

              <div className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)]">
                <div className="text-2xl font-bold font-mono text-[var(--verdigris)]">
                  {plagiarismReport.similarityThreshold ? `${(plagiarismReport.similarityThreshold * 100).toFixed(0)}%` : `${threshold}%`}
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] mt-1">Target Cutoff</div>
              </div>
            </div>
          )}

          {/* Similarity Matrix Heatmap Grid */}
          {plagiarismReport && matrixUsers.length > 1 && (
            <div className="card p-6 bg-[var(--carbon)] border-[var(--border)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--bone)]">
                    Pairwise Participant Overlap Matrix
                  </h3>
                  <p className="text-xs text-[var(--text-3)]">
                    Cross-comparison grid for flagged contest participants
                  </p>
                </div>

                {matchProblems.length > 1 && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[var(--text-3)]">Filter Problem:</span>
                    <select
                      value={matrixFilterProblem}
                      onChange={e => setMatrixFilterProblem(e.target.value)}
                      className="bg-[var(--ash)] border border-[var(--border)] rounded px-2.5 py-1 text-xs text-[var(--bone)]"
                    >
                      <option value="All">All Problems</option>
                      {matchProblems.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Scrollable Matrix Table */}
              <div className="overflow-x-auto pb-2">
                <table className="border-collapse text-xs font-mono">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-medium text-[var(--text-3)] bg-[var(--ash)] border border-[var(--border)] w-28">
                        User \ Peer
                      </th>
                      {matrixUsers.map(u => (
                        <th key={u} className="p-2 text-center font-medium text-[var(--bone)] bg-[var(--ash)] border border-[var(--border)] min-w-[70px]">
                          {u}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixUsers.map(u1 => (
                      <tr key={u1}>
                        <td className="p-2 font-semibold text-[var(--bone)] bg-[var(--ash)] border border-[var(--border)] truncate max-w-[120px]">
                          {u1}
                        </td>
                        {matrixUsers.map(u2 => {
                          const cell = getSimilarityCell(u1, u2);
                          if (cell.isSelf) {
                            return (
                              <td key={u2} className="p-2 text-center text-[var(--text-4)] bg-[var(--ash)] border border-[var(--border)]">
                                —
                              </td>
                            );
                          }
                          const pct = (cell.val * 100).toFixed(0);
                          const isHigh = cell.val >= 0.85;
                          const isModerate = cell.val >= 0.70;

                          return (
                            <td 
                              key={u2}
                              onClick={() => cell.match && setSelectedPair(cell.match)}
                              className={`p-2 text-center border border-[var(--border)] cursor-pointer transition-colors ${
                                cell.val === 0 
                                  ? 'text-[var(--text-4)] bg-[var(--carbon)]' 
                                  : isHigh 
                                  ? 'bg-[var(--red-dim)] text-[var(--red)] font-bold hover:bg-[var(--red)] hover:text-[var(--obsidian)]' 
                                  : isModerate 
                                  ? 'bg-[var(--amber-dim)] text-[var(--amber)] font-bold hover:bg-[var(--amber)] hover:text-[var(--obsidian)]' 
                                  : 'bg-[var(--accent-dim)] text-[var(--verdigris)] hover:bg-[var(--verdigris)] hover:text-[var(--obsidian)]'
                              }`}
                              title={cell.val > 0 ? `${u1} vs ${u2}: ${(cell.val * 100).toFixed(1)}% similarity` : 'No flagged match'}
                            >
                              {cell.val > 0 ? `${pct}%` : '0%'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 text-xs font-mono text-[var(--text-3)] pt-2 border-t border-[var(--border)]">
                <span>Legend:</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--carbon)] border border-[var(--border)] inline-block" /> &lt;70%</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--accent-dim)] border border-[var(--verdigris)] inline-block" /> 70-84%</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--red-dim)] border border-[var(--red)] inline-block" /> &gt;=85% Overlap</span>
              </div>
            </div>
          )}

          {/* Flagged Matches Detail Table */}
          {plagiarismReport && (
            <div className="card overflow-hidden bg-[var(--carbon)] border-[var(--border)]">
              <div className="p-4 border-b border-[var(--border)] bg-[var(--ash)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--amber)]" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--bone)]">
                    Flagged Suspicious Pairs ({filteredMatches.length})
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--text-3)]">
                  Threshold: {threshold}%
                </span>
              </div>

              {filteredMatches.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[var(--green)] mx-auto" />
                  <div className="text-sm font-semibold text-[var(--bone)]">Clean Tournament Record</div>
                  <p className="text-xs font-mono text-[var(--text-3)] max-w-sm mx-auto">
                    No suspicious submissions exceeded the {threshold}% token similarity threshold.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--ash)] text-xs font-mono text-[var(--text-3)] uppercase tracking-wider h-9">
                        <th className="px-4 py-3 font-medium">Contestant Pair</th>
                        <th className="px-4 py-3 font-medium">Problem</th>
                        <th className="px-4 py-3 font-medium">Language</th>
                        <th className="px-4 py-3 font-medium text-center">Similarity Score</th>
                        <th className="px-4 py-3 font-medium">Overlapping Tokens</th>
                        <th className="px-4 py-3 font-medium text-right">Flagged Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredMatches.map((match, idx) => {
                        const pct = (match.similarity * 100).toFixed(1);
                        const isSevere = match.similarity >= 0.85;

                        return (
                          <tr 
                            key={idx} 
                            onClick={() => setSelectedPair(match)}
                            className="hover:bg-[var(--ash)] transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--bone)] text-sm">
                                  @{match.user1Username}
                                </span>
                                <span className="text-[var(--text-3)] font-mono text-xs">vs</span>
                                <span className="font-semibold text-[var(--bone)] text-sm">
                                  @{match.user2Username}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3 font-medium text-[var(--bone)]">
                              {match.problemTitle || match.problemId}
                            </td>

                            <td className="px-4 py-3 text-[var(--text-2)] font-mono uppercase text-xs">
                              {match.language}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                                isSevere 
                                  ? 'bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]/40' 
                                  : 'bg-[var(--amber-dim)] text-[var(--amber)] border border-[var(--amber)]/40'
                              }`}>
                                {pct}%
                              </span>
                            </td>

                            <td className="px-4 py-3 text-[var(--text-2)] font-mono text-xs">
                              {match.matchedTokensCount} N-gram matches
                            </td>

                            <td className="px-4 py-3 text-right text-[var(--text-3)] font-mono text-xs">
                              {new Date(match.flaggedAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pair Inspector Detail Modal */}
          {selectedPair && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--obsidian)]/80 backdrop-blur-sm"
            >
              <div 
                className="fixed inset-0" 
                onClick={() => setSelectedPair(null)} 
              />
              <div className="relative w-full max-w-xl rounded-[var(--r-xl)] bg-[var(--carbon)] border border-[var(--border-strong)] p-6 shadow-[var(--shadow-lg)] z-10 space-y-4 page-fade">
                <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-[var(--verdigris)]" />
                      <h3 className="font-bold text-[var(--bone)] text-base">
                        Duplicate Analysis Diagnostics
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-3)] font-mono">
                      @{selectedPair.user1Username} vs @{selectedPair.user2Username}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedPair(null)}
                    className="p-1 rounded text-[var(--text-3)] hover:text-[var(--bone)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] space-y-1">
                    <div className="text-[11px] text-[var(--text-3)] uppercase">Calculated Overlap</div>
                    <div className="text-xl font-bold text-[var(--red)]">
                      {(selectedPair.similarity * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-3 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] space-y-1">
                    <div className="text-[11px] text-[var(--text-3)] uppercase">Language & Problem</div>
                    <div className="font-bold text-[var(--bone)] truncate pt-0.5">
                      {selectedPair.language.toUpperCase()} · {selectedPair.problemTitle}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] font-mono text-xs text-[var(--text-2)] space-y-2">
                  <div className="font-semibold text-[var(--bone)] flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[var(--verdigris)]" />
                    <span>Fingerprint Metadata</span>
                  </div>
                  <div>• Submission A ID: <code className="text-[var(--bone)]">{selectedPair.submission1Id}</code></div>
                  <div>• Submission B ID: <code className="text-[var(--bone)]">{selectedPair.submission2Id}</code></div>
                  <div>• Common Winnowed Hashes: <code className="text-[var(--verdigris)]">{selectedPair.matchedTokensCount} tokens</code></div>
                </div>

                <button
                  onClick={() => setSelectedPair(null)}
                  className="btn-secondary w-full justify-center !py-2 !text-xs font-mono"
                >
                  Close Diagnostics
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 5. HEALTH */}
      {activeTab === 'health' && health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6 space-y-2 bg-[var(--carbon)] border-[var(--border)]">
            <div className="text-xs text-[var(--text-3)] font-mono uppercase tracking-widest">Redis Instance</div>
            <div className={`text-lg font-bold font-mono ${health.redis === 'connected' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {health.redis === 'connected' ? '● Connected' : '● ' + health.redis}
            </div>
          </div>
          <div className="card p-6 space-y-2 bg-[var(--carbon)] border-[var(--border)]">
            <div className="text-xs text-[var(--text-3)] font-mono uppercase tracking-widest">BullMQ Queue Depth</div>
            <div className="text-lg font-bold font-mono text-[var(--bone)]">{health.queueDepth} active jobs</div>
            <div className="text-xs font-mono text-[var(--text-3)]">{health.queueFailed} failed jobs</div>
          </div>
          <div className="card p-6 space-y-2 bg-[var(--carbon)] border-[var(--border)]">
            <div className="text-xs text-[var(--text-3)] font-mono uppercase tracking-widest">Gateway Heartbeat</div>
            <div className="text-sm font-mono text-[var(--text-2)]">{new Date(health.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
      )}
      {activeTab === 'health' && !health && !loading && (
        <div className="text-center py-8 text-[var(--text-3)] font-mono">No health telemetry data. Click Refresh.</div>
      )}

    </div>
  );
};
