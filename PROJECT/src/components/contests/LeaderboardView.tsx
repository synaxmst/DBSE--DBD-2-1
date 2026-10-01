import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import { ArrowLeft, Trophy, Check, Clock, CheckCircle2, Loader2, BookOpen, FileText, Minus } from 'lucide-react';
import { getLeaderboard, getContest, getContests } from '../../api/contests';
import { renderMarkdownToHtml } from '../../utils/markdownRenderer';
import { 
  getContestSocket, 
  joinContest, 
  leaveContest, 
  onLeaderboardUpdate 
} from '../../socket/contestSocket';
import type { LeaderboardEntry, Contest } from '../../types/judge';

interface LeaderboardViewProps {
  contestId?: string;
  contestTitle?: string;
}

interface ProblemColumn {
  id: string;
  label: string; // 'A', 'B', 'C', 'D'...
  title?: string;
  slug?: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  contestId,
  contestTitle,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resolvedContestId, setResolvedContestId] = useState<string | undefined>(id || contestId);

  const { currentUser } = useJudge();
  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'scoreboard' | 'editorial'>('scoreboard');

  // Auto-resolve contest if none specified in route
  useEffect(() => {
    if (id || contestId) {
      setResolvedContestId(id || contestId);
      return;
    }

    const resolveActive = async () => {
      try {
        const contestList = await getContests();
        if (contestList && contestList.length > 0) {
          const live = contestList.find((c: Contest) => (c.status as string)?.toLowerCase() === 'live');
          setResolvedContestId(live ? live.id : contestList[0].id);
        } else {
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    };
    resolveActive();
  }, [id, contestId]);

  const activeContestId = resolvedContestId;
  const isContestEnded = contest?.status?.toLowerCase() === 'ended' || contest?.status === 'Ended';

  // Fetch contest metadata for challenge set
  const fetchContestData = useCallback(async () => {
    if (!activeContestId) return;
    try {
      const contestData = await getContest(activeContestId);
      if (contestData) {
        setContest(contestData);
      }
    } catch {
      // Keep default
    }
  }, [activeContestId]);

  // Fetch standings via REST API and sort ICPC-style: Solved desc, Penalty asc
  const fetchLeaderboardData = useCallback(async () => {
    if (!activeContestId) return;
    try {
      const response = await getLeaderboard(activeContestId);
      const rawEntries = response.entries || [];

      // Sort ICPC Style: Solved desc, Penalty asc
      const sorted = [...rawEntries].sort((a, b) => {
        const aSolved = a.solvedCount ?? Object.values(a.problemResults || {}).filter(p => p.solved).length;
        const bSolved = b.solvedCount ?? Object.values(b.problemResults || {}).filter(p => p.solved).length;
        if (bSolved !== aSolved) {
          return bSolved - aSolved; // Solved descending
        }
        const aPenalty = a.penaltyMinutes ?? 0;
        const bPenalty = b.penaltyMinutes ?? 0;
        return aPenalty - bPenalty; // Penalty ascending
      });

      // Assign 1-indexed ranks
      const ranked = sorted.map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        solvedCount: entry.solvedCount ?? Object.values(entry.problemResults || {}).filter(p => p.solved).length,
        penaltyMinutes: entry.penaltyMinutes ?? 0,
      }));

      setLeaderboard(ranked);
    } catch {
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeContestId]);

  useEffect(() => {
    if (!activeContestId) return;
    fetchContestData();
    fetchLeaderboardData();

    // Socket Connection and Room Join
    const socket = getContestSocket();
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    joinContest(activeContestId);

    // Real-time broadcast listener
    const unsubscribe = onLeaderboardUpdate((update) => {
      if (update && update.contestId === activeContestId) {
        fetchLeaderboardData();
      }
    });

    return () => {
      unsubscribe();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      leaveContest(activeContestId);
    };
  }, [activeContestId, fetchContestData, fetchLeaderboardData]);

  // Determine problem columns dynamically from contest or standings
  const problemColumns: ProblemColumn[] = useMemo(() => {
    if (contest && contest.problemIds && contest.problemIds.length > 0) {
      return contest.problemIds.map((p: any, idx: number) => {
        const pId = typeof p === 'object' ? p._id || p.id || String(p) : String(p);
        const pTitle = typeof p === 'object' ? p.title : undefined;
        const pSlug = typeof p === 'object' ? p.slug : undefined;
        return {
          id: pId,
          label: String.fromCharCode(65 + idx), // A, B, C, D...
          title: pTitle || `Problem ${String.fromCharCode(65 + idx)}`,
          slug: pSlug,
        };
      });
    }

    // Infer from problemResults in leaderboard
    const inferredKeys = new Set<string>();
    leaderboard.forEach(entry => {
      if (entry.problemResults) {
        Object.keys(entry.problemResults).forEach(k => inferredKeys.add(k));
      }
    });

    if (inferredKeys.size > 0) {
      return Array.from(inferredKeys).map((k, idx) => ({
        id: k,
        label: String.fromCharCode(65 + idx),
        title: `Problem ${String.fromCharCode(65 + idx)}`,
      }));
    }

    return [];
  }, [contest, leaderboard]);

  const getProblemResult = (entry: LeaderboardEntry, col: ProblemColumn) => {
    if (!entry.problemResults) return undefined;
    return (
      entry.problemResults[col.id] ||
      (col.slug ? entry.problemResults[col.slug] : undefined) ||
      entry.problemResults[col.label] ||
      entry.problemResults[col.label.toLowerCase()] ||
      entry.problemResults[`prob-${col.label.charCodeAt(0) - 64}`]
    );
  };

  const displayTitle = contest?.title || contestTitle || 'Tournament Standings';
  const maxSolved = leaderboard.length > 0 ? Math.max(...leaderboard.map(e => e.solvedCount || 0)) : 0;

  if (!activeContestId && !isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4 text-[var(--bone)]">
        <Trophy className="w-12 h-12 text-[var(--text-3)] mx-auto opacity-50" />
        <h2 className="text-xl font-bold">No active contest. Check back soon.</h2>
        <p className="text-sm text-[var(--text-3)]">There are currently no active or upcoming tournaments scheduled.</p>
        <button onClick={() => navigate('/contests')} className="btn-primary !text-xs mt-2">
          View All Contests
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-fade text-[var(--bone)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/contests')}
              className="text-[var(--text-3)] hover:text-[var(--bone)] p-1.5 -ml-1.5 rounded-[var(--r-sm)] hover:bg-[var(--ash)] transition-colors cursor-pointer"
              title="Back to Contests"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold text-[var(--bone)] tracking-tight">
              {displayTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] border border-[var(--accent-border)] text-xs font-mono font-semibold text-[var(--verdigris)]">
              ICPC Scoreboard
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-2)]">
            Official ICPC tournament rankings — ordered by solved count (descending) and total penalty minutes (ascending).
          </p>
        </div>

        {/* Live WebSocket Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-2)] self-start sm:self-auto px-3 py-1.5 rounded-[var(--r-md)] bg-[var(--carbon)] border border-[var(--border)]">
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--green)]' : 'bg-[var(--text-3)]'}`} />
          <span>{isConnected ? 'LIVE WEBSOCKET ACTIVE' : 'OFFLINE SYNC'}</span>
        </div>
      </div>

      {/* Tabs Navigation (Shown when Contest Status is Ended) */}
      {isContestEnded && (
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 font-mono text-xs">
          <button
            onClick={() => setActiveTab('scoreboard')}
            className={`px-4 py-2 rounded-[var(--r-md)] font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'scoreboard'
                ? 'bg-[var(--ash)] text-[var(--bone)] border border-[var(--border)] shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)] border border-transparent'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[var(--amber)]" />
            <span>ICPC Scoreboard</span>
          </button>
          <button
            onClick={() => setActiveTab('editorial')}
            className={`px-4 py-2 rounded-[var(--r-md)] font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'editorial'
                ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border border-[var(--accent-border)] shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)] border border-transparent'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--verdigris)]" />
            <span>Editorial & Solutions</span>
            {contest?.editorial && contest.editorial.trim().length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-[var(--green-dim)] text-[var(--green)] text-[10px] font-bold border border-[var(--green)]/30">
                Ready
              </span>
            )}
          </button>
        </div>
      )}

      {activeTab === 'editorial' ? (
        <div className="space-y-6 page-fade">
          <div className="card p-6 bg-[var(--carbon)] border-[var(--border)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--verdigris)]" />
                  <h2 className="text-base font-bold text-[var(--bone)] tracking-tight">
                    Official Round Editorial
                  </h2>
                </div>
                <p className="text-xs text-[var(--text-2)]">
                  Algorithmic breakdowns, mathematical proofs, and model solutions for {displayTitle}.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--green-dim)] border border-[var(--green)]/30 text-[var(--green)] text-xs font-mono font-semibold self-start sm:self-auto flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Round Concluded</span>
              </span>
            </div>

            {contest?.editorial && contest.editorial.trim().length > 0 ? (
              <div
                className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed space-y-4 font-sans editorial-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(contest.editorial) }}
              />
            ) : (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--ash)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-3)]">
                  <FileText className="w-6 h-6 text-[var(--text-3)]" />
                </div>
                <h3 className="text-sm font-bold text-[var(--bone)]">
                  Editorial Not Published Yet
                </h3>
                <p className="text-xs font-mono text-[var(--text-3)] max-w-md mx-auto">
                  The contest coordinators and problem setters have not published the official editorial for this tournament yet. Please check back soon.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Telemetry Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)]">
          <div className="text-2xl font-bold font-mono text-[var(--bone)]">
            {leaderboard.length}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] mt-1">
            Contestants
          </div>
        </div>

        <div className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)]">
          <div className="text-2xl font-bold font-mono text-[var(--verdigris)]">
            {problemColumns.length}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] mt-1">
            Problems in Round
          </div>
        </div>

        <div className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)]">
          <div className="text-2xl font-bold font-mono text-[var(--amber)] flex items-center justify-center gap-1.5">
            <Trophy className="w-5 h-5 text-[var(--amber)]" />
            <span>{maxSolved} / {problemColumns.length}</span>
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-3)] mt-1">
            Top Solve Count
          </div>
        </div>

        <div className="card p-4 text-center bg-[var(--carbon)] border-[var(--border)] flex flex-col justify-center">
          <div className="text-xs font-mono font-semibold text-[var(--bone)]">
            +20m Penalty / Reject
          </div>
          <div className="text-[11px] font-mono text-[var(--text-3)] mt-0.5">
            Standard ICPC Rule
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      {isLoading ? (
        <div className="card py-20 px-6 text-center space-y-3 bg-[var(--carbon)] border-[var(--border)]">
          <div className="w-12 h-12 rounded-full bg-[var(--ash)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--verdigris)]">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--verdigris)]" />
          </div>
          <h3 className="text-base font-bold text-[var(--bone)] tracking-tight">
            Loading ICPC scoreboard...
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-2)] max-w-sm mx-auto">
            Syncing live standings and problem breakdown from the judge cluster.
          </p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card py-20 px-6 text-center space-y-3 bg-[var(--carbon)] border-[var(--border)]">
          <div className="w-12 h-12 rounded-full bg-[var(--ash)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--verdigris)]">
            <Trophy className="w-5 h-5 text-[var(--verdigris)]" />
          </div>
          <h3 className="text-base font-bold text-[var(--bone)] tracking-tight">
            No submissions recorded yet
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-2)] max-w-sm mx-auto">
            Be the first contestant to solve a problem and claim the top rank on the scoreboard.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden bg-[var(--carbon)] border-[var(--border)] space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--ash)] text-xs font-mono text-[var(--text-3)] uppercase tracking-wider h-10">
                  <th className="px-4 w-16 text-center font-medium">Rank</th>
                  <th className="px-4 font-medium min-w-[200px]">Contestant</th>
                  <th className="px-4 w-24 text-center font-semibold text-[var(--bone)]">
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />
                      <span>Solved</span>
                    </div>
                  </th>
                  <th className="px-4 w-24 text-center font-semibold text-[var(--bone)]">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--amber)]" />
                      <span>Penalty</span>
                    </div>
                  </th>
                  {problemColumns.map(col => (
                    <th 
                      key={col.id} 
                      className="px-3 w-24 text-center font-bold text-[var(--bone)]"
                      title={col.title}
                    >
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded bg-[var(--carbon)] border border-[var(--border)] text-xs font-mono">
                        {col.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {leaderboard.map(entry => {
                  const isCurrentUser = entry.user.id === currentUser?.id || entry.user.username === currentUser?.username;
                  
                  const rankBadge = 
                    entry.rank === 1 ? (
                      <span className="inline-flex items-center justify-center gap-1 font-bold text-xs px-2 py-0.5 rounded bg-[var(--amber-dim)] text-[var(--amber)] border border-[var(--amber)]/40 font-mono">
                        <Trophy className="w-3 h-3" /> #1
                      </span>
                    ) : entry.rank === 2 ? (
                      <span className="inline-flex items-center justify-center gap-1 font-semibold text-xs px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--verdigris)] border border-[var(--verdigris)]/40 font-mono">
                        #2
                      </span>
                    ) : entry.rank === 3 ? (
                      <span className="inline-flex items-center justify-center gap-1 font-semibold text-xs px-2 py-0.5 rounded bg-[var(--ash)] text-[var(--bone)] border border-[var(--border)] font-mono">
                        #3
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-medium text-[var(--text-3)]">
                        {entry.rank}
                      </span>
                    );

                  return (
                    <tr 
                      key={entry.rank}
                      className={`h-[56px] hover:bg-[var(--ash)] transition-colors border-b border-[var(--border)] last:border-0 ${
                        isCurrentUser ? 'bg-[var(--accent-dim)] hover:bg-[var(--ash)]' : ''
                      }`}
                    >
                      {/* Rank Numeral / Trophy Badge */}
                      <td className="px-4 text-center">
                        {rankBadge}
                      </td>

                      {/* Contestant Handle & Avatar */}
                      <td className="px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--ash)] border border-[var(--border)] flex items-center justify-center font-mono font-semibold text-xs text-[var(--bone)] shrink-0">
                            {entry.user.avatarUrl ? (
                              <img src={entry.user.avatarUrl} alt={entry.user.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              entry.user.username.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-[var(--bone)] text-sm truncate">
                              {entry.user.name || entry.user.username}
                            </span>
                            <span className="text-xs text-[var(--text-3)] font-mono truncate">
                              @{entry.user.username}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded bg-[var(--accent-dim)] border border-[var(--accent-border)] text-[10px] font-mono text-[var(--verdigris)] font-bold">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Solved Count */}
                      <td className="px-4 text-center">
                        <div className="font-bold text-sm font-mono text-[var(--bone)]">
                          {entry.solvedCount}
                        </div>
                      </td>

                      {/* Total Penalty Time */}
                      <td className="px-4 text-center">
                        <div className="font-mono text-xs text-[var(--text-2)] tabular-nums">
                          {entry.penaltyMinutes}m
                        </div>
                      </td>

                      {/* Per-Problem Columns */}
                      {problemColumns.map(col => {
                        const res = getProblemResult(entry, col);

                        return (
                          <td key={col.id} className="px-3 text-center">
                            {res?.solved ? (
                              <div className="inline-flex flex-col items-center justify-center min-w-[58px] py-1 px-2 rounded-[var(--r-md)] bg-[var(--green-dim)] border border-[var(--green)]/30 text-[var(--green)] font-mono text-xs shadow-sm">
                                <div className="flex items-center gap-1 font-bold leading-tight">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{res.timeMinutes ?? 0}m</span>
                                </div>
                                {res.attempts > 1 && (
                                  <span className="text-[10px] font-medium opacity-85 leading-tight">
                                    +{res.attempts - 1}
                                  </span>
                                )}
                              </div>
                            ) : res && res.attempts > 0 ? (
                              <div className="inline-flex flex-col items-center justify-center min-w-[58px] py-1 px-2 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red)]/30 text-[var(--red)] font-mono text-xs shadow-sm">
                                <span className="font-bold leading-tight">
                                  -{res.attempts}
                                </span>
                                <span className="text-[10px] opacity-80 leading-tight">
                                  {res.attempts === 1 ? '1 try' : `${res.attempts} tries`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[var(--text-4)] font-mono text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Legend Footer */}
          <div className="p-3 bg-[var(--ash)] border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[var(--text-3)]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-[var(--green-dim)] border border-[var(--green)]/40 inline-flex items-center justify-center">
                  <Check className="w-3 h-3 text-[var(--green)]" />
                </span>
                <span>Solved (First AC time + prior rejects)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-[var(--red-dim)] border border-[var(--red)]/40 inline-flex items-center justify-center">
                  <Minus className="w-3 h-3 text-[var(--text-3)]" />
                </span>
                <span>Rejected Attempts</span>
              </span>
            </div>
            <span>Auto-refreshing via WebSocket feed</span>
          </div>
        </div>
      )}
        </>
      )}

    </div>
  );
};

export default LeaderboardView;

