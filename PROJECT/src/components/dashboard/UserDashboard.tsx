import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import { VerdictBadge } from '../common/VerdictBadge';

function computeStreak(submissions: Array<{verdict: string; createdAt?: string; timestamp?: string; submittedAt?: string}>): number {
  const acceptedDays = new Set(
    submissions
      .filter(s => s.verdict === 'Accepted')
      .map(s => {
        const d = new Date(s.createdAt ?? s.timestamp ?? s.submittedAt ?? '');
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      })
      .filter(Boolean)
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (acceptedDays.has(key)) { streak++; } else { break; }
  }
  return streak;
}

export const UserDashboard: React.FC = () => {
  const { currentUser, submissions, problems, isProblemSolved } = useJudge();
  const navigate = useNavigate();
  const [hoveredCell, setHoveredCell] = useState<{ count: number; dateStr: string } | null>(null);

  const userSubmissions = useMemo(() => {
    return submissions.filter(s => s.userId === currentUser?.id || !s.userId);
  }, [submissions, currentUser]);

  const streak = computeStreak(userSubmissions);

  const acceptedCount = useMemo(() => {
    return userSubmissions.filter(s => s.verdict === 'Accepted').length;
  }, [userSubmissions]);

  const acceptanceRate = useMemo(() => {
    if (userSubmissions.length === 0) return 0;
    return Math.round((acceptedCount / userSubmissions.length) * 100);
  }, [userSubmissions, acceptedCount]);

  // Real solved problem counts
  const realSolvedCount = useMemo(() => {
    return problems.filter(p => isProblemSolved(p.id)).length;
  }, [problems, isProblemSolved]);

  const easyTotal = useMemo(() => problems.filter(p => p.difficulty === 'Easy').length || 1, [problems]);
  const mediumTotal = useMemo(() => problems.filter(p => p.difficulty === 'Medium').length || 1, [problems]);
  const hardTotal = useMemo(() => problems.filter(p => p.difficulty === 'Hard').length || 1, [problems]);

  const easySolved = useMemo(() => problems.filter(p => p.difficulty === 'Easy' && isProblemSolved(p.id)).length, [problems, isProblemSolved]);
  const mediumSolved = useMemo(() => problems.filter(p => p.difficulty === 'Medium' && isProblemSolved(p.id)).length, [problems, isProblemSolved]);
  const hardSolved = useMemo(() => problems.filter(p => p.difficulty === 'Hard' && isProblemSolved(p.id)).length, [problems, isProblemSolved]);

  // Favorite Language
  const favLang = useMemo(() => {
    if (userSubmissions.length === 0) return 'None yet';
    const counts: Record<string, number> = {};
    userSubmissions.forEach(s => {
      counts[s.language] = (counts[s.language] || 0) + 1;
    });
    let best = 'cpp';
    let max = 0;
    Object.entries(counts).forEach(([lang, count]) => {
      if (count > max) {
        max = count;
        best = lang;
      }
    });
    const map: Record<string, string> = {
      cpp: 'C++',
      python: 'Python 3',
      java: 'Java',
      javascript: 'JavaScript'
    };
    return map[best] || best.toUpperCase();
  }, [userSubmissions]);

  // 52-week activity heatmap data based on actual submission dates
  const heatmapData = useMemo(() => {
    const weeks = 52;
    const days = 7;
    const grid: { count: number; dateStr: string }[][] = [];
    const now = new Date();

    // Map submissions by YYYY-MM-DD
    const submissionMap = new Map<string, number>();
    userSubmissions.forEach(sub => {
      const d = new Date(sub.submittedAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      submissionMap.set(key, (submissionMap.get(key) || 0) + 1);
    });

    for (let w = 0; w < weeks; w++) {
      const week: { count: number; dateStr: string }[] = [];
      for (let d = 0; d < days; d++) {
        const daysAgo = (51 - w) * 7 + (6 - d);
        const cellDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const dateStr = cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const key = `${cellDate.getFullYear()}-${cellDate.getMonth() + 1}-${cellDate.getDate()}`;
        
        const count = submissionMap.get(key) || 0;
        week.push({ count, dateStr });
      }
      grid.push(week);
    }
    return grid;
  }, [userSubmissions]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'var(--bg-elevated)';
    if (count === 1) return 'var(--accent-dim)';
    if (count <= 3) return 'var(--accent-border)';
    return 'var(--accent)';
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-fade">
      
      {/* Profile Header Card */}
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-active)] border border-[var(--border-mid)] text-[var(--text-1)] flex items-center justify-center text-[18px] font-semibold shrink-0">
            {currentUser.username.substring(0, 2).toUpperCase()}
          </div>

          <div className="space-y-0.5">
            <h1 className="text-[18px] font-semibold text-[var(--text-1)]">
              {currentUser.name}
            </h1>
            <div className="text-[14px] text-[var(--text-2)] font-mono">
              @{currentUser.username}
            </div>
            <div className="text-[13px] text-[var(--text-3)]">
              {currentUser.email}
            </div>
          </div>
        </div>

        {/* Right side stats inline */}
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-2)] font-medium self-start md:self-auto flex-wrap">
          <span>Rating {currentUser.rating}</span>
          <span>·</span>
          <span>{currentUser.rank && currentUser.rank > 0 ? `Rank #${currentUser.rank}` : 'Unranked'}</span>
          <span>·</span>
          <span>{streak} day streak</span>
        </div>
      </div>

      {/* Bento Grid (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left card: Solved Problems */}
        <div className="card p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[var(--text-1)]">
                Solved Problems
              </h2>
              <span className="text-[13px] text-[var(--text-2)]">
                {realSolvedCount} / {problems.length} total
              </span>
            </div>

            {/* Main Progress Bar */}
            <div className="w-full h-[6px] rounded-full bg-[var(--bg-active)] overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${(realSolvedCount / (problems.length || 1)) * 100}%`,
                  minWidth: '2px',
                  backgroundColor: realSolvedCount > 0 ? 'var(--accent)' : 'var(--border)',
                }}
              />
            </div>
          </div>

          {/* Difficulty breakdown rows */}
          <div className="space-y-3 text-[13px] pt-2 border-t border-[var(--border)]">
            {/* Easy */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
                  <span className="text-[var(--text-2)]">Easy</span>
                </div>
                <span className="text-[var(--text-1)] font-mono text-[12px]">
                  {easySolved}/{easyTotal}
                </span>
              </div>
              <div className="w-full h-[4px] rounded-full bg-[var(--bg-active)] overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(easySolved / (easyTotal || 1)) * 100}%`,
                    minWidth: '2px',
                    backgroundColor: easySolved > 0 ? 'var(--green)' : 'var(--border)',
                  }}
                />
              </div>
            </div>

            {/* Medium */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--amber)]" />
                  <span className="text-[var(--text-2)]">Medium</span>
                </div>
                <span className="text-[var(--text-1)] font-mono text-[12px]">
                  {mediumSolved}/{mediumTotal}
                </span>
              </div>
              <div className="w-full h-[4px] rounded-full bg-[var(--bg-active)] overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(mediumSolved / (mediumTotal || 1)) * 100}%`,
                    minWidth: '2px',
                    backgroundColor: mediumSolved > 0 ? 'var(--amber)' : 'var(--border)',
                  }}
                />
              </div>
            </div>

            {/* Hard */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--red)]" />
                  <span className="text-[var(--text-2)]">Hard</span>
                </div>
                <span className="text-[var(--text-1)] font-mono text-[12px]">
                  {hardSolved}/{hardTotal}
                </span>
              </div>
              <div className="w-full h-[4px] rounded-full bg-[var(--bg-active)] overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(hardSolved / (hardTotal || 1)) * 100}%`,
                    minWidth: '2px',
                    backgroundColor: hardSolved > 0 ? 'var(--red)' : 'var(--border)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right card: Your Stats */}
        <div className="card p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text-1)]">
              Your Stats
            </h2>
            <p className="text-[13px] text-[var(--text-3)] mt-0.5">
              Performance metrics from verified executions
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--bg-elevated)] border border-[var(--border)] space-y-1">
              <div className="text-[11px] text-[var(--text-3)] font-medium uppercase tracking-wider">
                Acceptance Rate
              </div>
              <div className="text-[22px] font-bold text-[var(--text-1)] tabular-nums">
                {acceptanceRate}%
              </div>
              <div className="text-[11px] text-[var(--text-3)]">
                {acceptedCount} of {userSubmissions.length} accepted
              </div>
            </div>

            <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--bg-elevated)] border border-[var(--border)] space-y-1">
              <div className="text-[11px] text-[var(--text-3)] font-medium uppercase tracking-wider">
                Submissions
              </div>
              <div className="text-[22px] font-bold text-[var(--text-1)] tabular-nums">
                {userSubmissions.length}
              </div>
              <div className="text-[11px] text-[var(--text-3)]">
                Total recorded
              </div>
            </div>

            <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--bg-elevated)] border border-[var(--border)] space-y-1">
              <div className="text-[11px] text-[var(--text-3)] font-medium uppercase tracking-wider">
                Problems Solved
              </div>
              <div className="text-[22px] font-bold text-[var(--text-1)] tabular-nums">
                {realSolvedCount}
              </div>
              <div className="text-[11px] text-[var(--text-3)]">
                Unique challenges
              </div>
            </div>

            <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--bg-elevated)] border border-[var(--border)] space-y-1">
              <div className="text-[11px] text-[var(--text-3)] font-medium uppercase tracking-wider">
                Favorite Language
              </div>
              <div className="text-[18px] font-semibold text-[var(--text-1)] truncate pt-1">
                {favLang}
              </div>
              <div className="text-[11px] text-[var(--text-3)]">
                Most used runtime
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Activity Heatmap Card (full width) */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-[var(--text-1)]">
              Activity
            </h2>
            <span className="text-[13px] text-[var(--text-3)]">
              · Past year
            </span>
          </div>

          <div className="h-4 text-[12px] text-[var(--text-2)] font-mono">
            {hoveredCell ? (
              <span>{hoveredCell.count} submissions on {hoveredCell.dateStr}</span>
            ) : null}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <div className="inline-flex gap-[3px]">
            {heatmapData.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[3px]">
                {week.map((cell, dIdx) => (
                  <div
                    key={dIdx}
                    onMouseEnter={() => setHoveredCell({ count: cell.count, dateStr: cell.dateStr })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ backgroundColor: getHeatmapColor(cell.count) }}
                    className="w-[11px] h-[11px] rounded-[2px] cursor-pointer transition-opacity hover:opacity-80"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 text-[11px] text-[var(--text-3)]">
          <span>Less</span>
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[var(--bg-elevated)]" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[var(--accent-dim)]" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[var(--accent-border)]" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[var(--accent)]" />
          <span>More</span>
        </div>
      </div>

      {/* Recent Submissions Table (full width card) */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="section-label">
            Recent Submissions
          </div>
          <span className="text-[12px] text-[var(--text-3)] font-mono">
            {userSubmissions.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] section-label h-[36px]">
                <th className="px-5">Problem</th>
                <th className="px-5">Verdict</th>
                <th className="px-5">Language</th>
                <th className="px-5">Runtime</th>
                <th className="px-5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {userSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[13px] text-[var(--text-3)]">
                    No submissions yet
                  </td>
                </tr>
              ) : (
                userSubmissions.slice(0, 5).map((sub, idx) => (
                  <tr 
                    key={sub.id} 
                    onClick={() => {
                      const prob = problems.find(p => p.id === sub.problemId);
                      navigate(`/problems/${prob?.slug || sub.problemId}`);
                    }}
                    className={`h-[52px] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors ${
                      idx % 2 === 1 ? 'bg-[var(--bg-card)]' : 'bg-transparent'
                    }`}
                  >
                    <td className="px-5 font-medium text-[var(--text-1)]">
                      <span className="hover:text-[var(--accent)] transition-colors">
                        {sub.problemTitle.replace(/^prob-\d+\.\s*/i, '')}
                      </span>
                    </td>
                    <td className="px-5">
                      <VerdictBadge verdict={sub.verdict} />
                    </td>
                    <td className="px-5 uppercase text-[var(--text-2)] text-[12px] font-mono">
                      {sub.language}
                    </td>
                    <td className="px-5 text-[var(--text-2)] font-mono text-[12px]">
                      {sub.executionTimeMs}ms
                    </td>
                    <td className="px-5 text-right text-[var(--text-3)] text-[12px]">
                      {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
