import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import { getContests, registerForContest } from '../../api/contests';
import type { Contest } from '../../types/judge';
import { Check, Trophy, ArrowRight } from 'lucide-react';

export const ContestsView: React.FC = () => {
  const { problems } = useJudge();
  const navigate = useNavigate();
  const [contests, setContests] = useState<Contest[]>([]);
  const [registeredContests, setRegisteredContests] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadAllContests = async () => {
      try {
        const liveData = await getContests();
        if (liveData && liveData.length > 0) {
          setContests(liveData);
        }
      } catch {
        console.warn('[ContestsView] Backend unavailable, displaying seeded tournaments.');
      }
    };
    loadAllContests();
  }, []);

  const liveContests = contests.filter(c => c.status === 'Live');
  const upcomingContests = contests.filter(c => c.status === 'Upcoming');
  const pastContests = contests.filter(c => c.status === 'Ended');

  const handleToggleRegister = async (contestId: string) => {
    const willRegister = !registeredContests[contestId];
    setRegisteredContests(prev => ({
      ...prev,
      [contestId]: willRegister
    }));

    if (willRegister) {
      try {
        await registerForContest(contestId);
      } catch {
        console.warn(`[ContestsView] Offline registration applied for ${contestId}`);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 page-fade text-[var(--bone)]">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[var(--bone)] tracking-tight">
              Contests
            </h1>
            {liveContests.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] border border-[var(--accent-border)] text-xs font-mono text-[var(--verdigris)] font-semibold">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--verdigris)]" />
                Live Round Active
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-2)]">
            Timed algorithmic competitions with real-time ICPC scoring and rating adjustments.
          </p>
        </div>

        <button
          onClick={() => {
            if (liveContests.length > 0) {
              navigate(`/contests/${liveContests[0].id}`);
            } else if (contests.length > 0) {
              navigate(`/contests/${contests[0].id}`);
            } else {
              navigate('/leaderboard');
            }
          }}
          className="btn-secondary self-start sm:self-auto cursor-pointer font-mono text-xs flex items-center gap-2"
        >
          <Trophy className="w-3.5 h-3.5 text-[var(--verdigris)]" />
          <span>Tournament Standings</span>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--text-3)]" />
        </button>
      </div>

      {/* Live Section */}
      {liveContests.length > 0 && (
        <div className="space-y-3">
          <div className="section-label font-mono uppercase text-xs tracking-wider text-[var(--text-3)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--verdigris)]" />
            <span>Active Tournaments</span>
          </div>

          <div className="space-y-4">
            {liveContests.map(contest => (
              <div 
                key={contest.id}
                className="card p-6 space-y-4 bg-[var(--carbon)] border-[var(--border-strong)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--verdigris)] border border-[var(--accent-border)] text-xs font-mono font-semibold flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--verdigris)]" />
                        Live Now
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-[var(--bone)] tracking-tight">
                        {contest.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-2)]">
                      Started {new Date(contest.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Concludes {new Date(contest.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const firstProb = problems.find(p => p.id === contest.problemIds[0]);
                      navigate(`/problems/${firstProb?.slug || contest.problemIds[0]}`);
                    }}
                    className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold shrink-0 cursor-pointer text-xs font-mono flex items-center gap-2"
                  >
                    <span>Enter Contest</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)] text-xs font-mono text-[var(--text-3)]">
                  <span className="text-[var(--text-2)]">{contest.durationMinutes} mins</span>
                  <span>·</span>
                  <span>{contest.participantCount.toLocaleString()} Contestants</span>
                  <span>·</span>
                  <span>{contest.problemIds.length} Problems</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      <div className="space-y-3">
        <div className="section-label font-mono uppercase text-xs tracking-wider text-[var(--text-3)]">
          Upcoming Schedule
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingContests.map(contest => {
            const isRegistered = registeredContests[contest.id];
            return (
              <div 
                key={contest.id}
                className="card p-5 flex flex-col justify-between space-y-4 bg-[var(--carbon)] border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[var(--bone)]">
                      {contest.title}
                    </h3>
                    <span className="text-xs text-[var(--text-3)] font-mono shrink-0">
                      {new Date(contest.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-2)] font-mono">
                    {contest.durationMinutes} mins · {contest.participantCount.toLocaleString()} Registered
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--text-3)] font-mono uppercase tracking-wider">Scheduled</span>
                  <button 
                    onClick={() => handleToggleRegister(contest.id)}
                    className={
                      isRegistered 
                        ? "btn-secondary !py-1 !px-3 !text-xs font-mono !text-[var(--verdigris)] !border-[var(--accent-border)] flex items-center gap-1.5" 
                        : "btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold !py-1 !px-3 !text-xs font-mono"
                    }
                  >
                    {isRegistered && <Check className="w-3 h-3 text-[var(--verdigris)]" />}
                    <span>{isRegistered ? 'Registered' : 'Register'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past Section */}
      <div className="space-y-3">
        <div className="section-label font-mono uppercase text-xs tracking-wider text-[var(--text-3)]">
          Completed Tournaments
        </div>

        <div className="card overflow-hidden bg-[var(--carbon)] border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--ash)] text-xs font-mono text-[var(--text-3)] uppercase tracking-wider h-9">
                  <th className="px-5 font-medium">Tournament</th>
                  <th className="px-5 font-medium">Date</th>
                  <th className="px-5 font-medium">Participants</th>
                  <th className="px-5 font-medium">Problems</th>
                  <th className="px-5 text-right font-medium">Standings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pastContests.map((c) => (
                  <tr 
                    key={c.id} 
                    className="h-[52px] hover:bg-[var(--ash)] transition-colors border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-5 font-semibold text-[var(--bone)] text-sm">
                      {c.title}
                    </td>
                    <td className="px-5 text-[var(--text-2)] font-mono">
                      {new Date(c.startTime).toLocaleDateString()}
                    </td>
                    <td className="px-5 text-[var(--text-2)] font-mono">
                      {c.participantCount.toLocaleString()}
                    </td>
                    <td className="px-5 text-[var(--text-2)] font-mono">
                      {c.problemIds.length} Challenges
                    </td>
                    <td className="px-5 text-right font-mono">
                      <button
                        onClick={() => navigate(`/contests/${c.id}`)}
                        className="text-[var(--verdigris)] hover:underline text-xs font-medium cursor-pointer"
                      >
                        Rankings →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
