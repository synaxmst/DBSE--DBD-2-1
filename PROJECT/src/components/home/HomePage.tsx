import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { VerdictBadge } from '../common/VerdictBadge';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Cpu,
  Terminal,
  Activity,
  Bookmark,
  BookOpen,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { problems, contests, userSubmissions, currentUser } = useJudge();
  const navigate = useNavigate();

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 17) return 'Good afternoon.';
    return 'Good evening.';
  }, []);

  // Find active live tournament, if any
  const liveContest = useMemo(() => {
    return contests.find((c) => (c.status as string)?.toLowerCase() === 'live') ?? null;
  }, [contests]);

  // Live countdown timer for active contest
  const [countdown, setCountdown] = React.useState('--:--:--');
  React.useEffect(() => {
    if (!liveContest) return;
    const tick = () => {
      const end = new Date(liveContest.endTime).getTime();
      const diff = end - Date.now();
      if (diff <= 0) {
        setCountdown('Ended');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [liveContest]);

  // Single Strong Recommendation: Curated Next Move Problem
  const primeRecommendation = useMemo(() => {
    if (problems.length === 0) return null;
    // Pick based on deterministic day of year or user unsolved priority
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return problems[dayOfYear % problems.length];
  }, [problems]);

  // Secondary curated problems shortlist (3 items max, editorial dossier)
  const curatedDossier = useMemo(() => {
    if (problems.length <= 1) return [];
    const rest = primeRecommendation
      ? problems.filter((p) => p.id !== primeRecommendation.id)
      : problems;
    return rest.slice(0, 3);
  }, [problems, primeRecommendation]);

  // Real recent submission dispatches
  const recentDispatches = useMemo(() => {
    return userSubmissions.slice(0, 4);
  }, [userSubmissions]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-fade space-y-12">
      {/* Editorial System Meta Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 text-xs font-mono text-[var(--text-3)] tracking-wider">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--verdigris)]" />
          <span className="text-[var(--text-2)] uppercase">AlgoFlow Dispatch // 2026</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px]">
          <span>ISOLATED SANDBOX RUNTIMES: 4</span>
          <span>·</span>
          <span>LATENCY: &lt;15MS</span>
        </div>
      </div>

      {/* Hero Section: Confident, Minimal, Personal */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-6xl font-bold text-[var(--bone)] tracking-tight leading-[1.08]">
            {greeting}{' '}
            <span className="text-[var(--verdigris)] block sm:inline">Your next move.</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-2)] font-normal max-w-2xl pt-2 leading-relaxed">
            {currentUser ? (
              <>
                Targeted algorithmic practice tailored for{' '}
                <strong className="text-[var(--bone)] font-semibold">{currentUser.name || currentUser.username}</strong>.
                Deterministic execution, zero friction.
              </>
            ) : (
              'The minimalist algorithmic proving ground. One problem at a time. Zero distractions.'
            )}
          </p>
        </div>
      </section>

      {/* Editorial Spotlight: The ONE Strong Recommendation */}
      {liveContest ? (
        /* LIVE ARENA IN PROGRESS OVERRIDE */
        <section className="card p-6 sm:p-8 space-y-6 border-[var(--border-strong)] bg-[var(--carbon)]">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--verdigris)] font-semibold border border-[var(--accent-border)] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--verdigris)]" />
                LIVE TOURNAMENT ARENA
              </span>
              <span className="text-[var(--text-3)] font-mono">
                {liveContest.bannerBadge || 'Rated Round'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-2)] font-mono">
              <span>CLOSES IN</span>
              <span className="text-[var(--bone)] font-bold tracking-wider">{countdown}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--bone)] tracking-tight">
              {liveContest.title}
            </h2>
            <p className="text-sm text-[var(--text-2)] line-clamp-2 max-w-3xl leading-relaxed">
              {liveContest.description ||
                'Compete in real time against global participants. ICPC penalty scoring enforced.'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-6 text-xs font-mono text-[var(--text-3)]">
              <span>{liveContest.problemIds?.length ?? 0} PROBLEMS</span>
              <span>·</span>
              <span>{liveContest.durationMinutes} MINUTES</span>
            </div>

            <button
              onClick={() => navigate(`/contests/${liveContest.id}`)}
              className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold !px-5 !py-2.5 flex items-center gap-2"
            >
              <span>Enter Arena</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      ) : primeRecommendation ? (
        /* STANDARD EDITORIAL SPOTLIGHT PROBLEM */
        <section className="card p-6 sm:p-8 space-y-6 border-[var(--border-strong)] bg-[var(--carbon)] transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--verdigris)] font-semibold border border-[var(--accent-border)] flex items-center gap-1.5">
                <Bookmark className="w-3 h-3 text-[var(--verdigris)]" />
                EDITORIAL PRIME RECOMMENDATION
              </span>
              <span className="text-[var(--text-3)]">·</span>
              <span className="text-[var(--text-3)] uppercase tracking-wider">DAILY CURATION</span>
            </div>

            <div className="flex items-center gap-3 text-[var(--text-2)] font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--text-3)]" /> {primeRecommendation.timeLimitMs}ms
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-[var(--text-3)]" /> {primeRecommendation.memoryLimitMb}MB
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--bone)] tracking-tight">
                {primeRecommendation.title.replace(/^prob-\d+\.\s*/i, '')}
              </h2>
              <DifficultyBadge difficulty={primeRecommendation.difficulty} />
            </div>

            <p className="text-sm text-[var(--text-2)] leading-relaxed line-clamp-3 max-w-3xl">
              {primeRecommendation.description.split('\n')[0]}
            </p>
          </div>

          {/* Technical Invariants & Topics */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {primeRecommendation.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] text-xs font-mono text-[var(--text-2)]"
              >
                #{tag}
              </span>
            ))}
            <span className="text-xs font-mono text-[var(--text-3)] ml-auto">
              ACCEPTANCE RATE: {primeRecommendation.acceptanceRate}%
            </span>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
            <div className="text-xs font-mono text-[var(--text-3)] flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[var(--verdigris)]" />
              <span>SUPPORTED: C++20 · PYTHON 3.11 · JAVA 21 · JS</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/problems')}
                className="btn-secondary !text-xs !py-2 !px-4"
              >
                Browse Problemset
              </button>
              <button
                onClick={() =>
                  navigate(`/problems/${primeRecommendation.slug || primeRecommendation.id}`)
                }
                className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold !text-xs !py-2 !px-5 flex items-center gap-2"
              >
                <span>Solve Problem</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Editorial Dossier: Curated Practice Register */}
      {curatedDossier.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--verdigris)]" />
              <h3 className="text-sm font-semibold font-mono tracking-wider uppercase text-[var(--bone)]">
                Curated Problemset Dossier
              </h3>
            </div>
            <Link
              to="/problems"
              className="text-xs font-mono text-[var(--verdigris)] hover:underline flex items-center gap-1"
            >
              Full Catalog ({problems.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="card overflow-hidden divide-y divide-[var(--border)] bg-[var(--carbon)] border-[var(--border)]">
            {curatedDossier.map((prob, idx) => (
              <div
                key={prob.id}
                onClick={() => navigate(`/problems/${prob.slug || prob.id}`)}
                className="p-4 sm:px-6 sm:py-4.5 flex items-center justify-between gap-4 hover:bg-[var(--ash)] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-mono text-xs text-[var(--text-3)] font-semibold w-8 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-sm font-semibold text-[var(--bone)] group-hover:text-[var(--verdigris)] transition-colors truncate">
                        {prob.title.replace(/^prob-\d+\.\s*/i, '')}
                      </span>
                      <DifficultyBadge difficulty={prob.difficulty} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-3)] font-mono">
                      <span>{prob.timeLimitMs}ms</span>
                      <span>·</span>
                      <span>{prob.tags.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs font-mono text-[var(--text-2)]">
                  <span className="hidden sm:inline text-[var(--text-3)]">
                    {prob.acceptanceRate}% AR
                  </span>
                  <span className="text-[var(--verdigris)] group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cluster Execution Ledger (Live Recent Submissions) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--verdigris)]" />
            <h3 className="text-sm font-semibold font-mono tracking-wider uppercase text-[var(--bone)]">
              Cluster Execution Ledger
            </h3>
          </div>
          <Link
            to="/submissions"
            className="text-xs font-mono text-[var(--text-2)] hover:text-[var(--bone)] transition-colors"
          >
            All Submissions →
          </Link>
        </div>

        {recentDispatches.length === 0 ? (
          <div className="card p-8 text-center text-xs font-mono text-[var(--text-3)] bg-[var(--carbon)]">
            No executions logged yet in the current cycle.
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-[var(--border)] bg-[var(--carbon)]">
            {recentDispatches.map((sub) => {
              const matchedProblem = problems.find((p) => p.id === sub.problemId);
              return (
                <div
                  key={sub.id}
                  onClick={() =>
                    navigate(`/problems/${matchedProblem?.slug || sub.problemId}`)
                  }
                  className="px-5 py-3.5 flex items-center justify-between text-xs font-mono hover:bg-[var(--ash)] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <VerdictBadge verdict={sub.verdict} />
                    <span className="text-[var(--bone)] font-sans font-medium truncate">
                      {sub.problemTitle.replace(/^prob-\d+\.\s*/i, '')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-[var(--text-3)] shrink-0">
                    <span className="text-[var(--text-2)] uppercase">{sub.language}</span>
                    <span>{sub.executionTimeMs}ms</span>
                    <span className="hidden sm:inline">
                      {new Date(sub.submittedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Editorial Footer Note */}
      <div className="text-center pt-6 text-xs font-mono text-[var(--text-3)]">
        Deterministic execution · Isolated sandboxes · Memory limits enforced
      </div>
    </div>
  );
};
