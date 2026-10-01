import React from 'react';
import type { Verdict } from '../../types/judge';

interface Props {
  verdict: Verdict;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const VerdictBadge: React.FC<Props> = ({ verdict }) => {
  const getClass = () => {
    switch (verdict) {
      case 'Accepted':
        return 'verdict-ac';
      case 'Wrong Answer':
        return 'verdict-wa';
      case 'Time Limit Exceeded':
        return 'verdict-tle';
      case 'Memory Limit Exceeded':
        return 'verdict-tle';
      case 'Runtime Error':
        return 'verdict-re';
      case 'Compilation Error':
        return 'verdict-ce';
      case 'Pending':
      default:
        return 'badge';
    }
  };

  return (
    <span className={getClass()}>
      {verdict}
    </span>
  );
};


