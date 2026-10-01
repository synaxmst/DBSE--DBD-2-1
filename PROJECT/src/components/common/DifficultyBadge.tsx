import React from 'react';
import type { Difficulty } from '../../types/judge';

interface Props {
  difficulty: Difficulty;
  size?: 'sm' | 'md';
}

export const DifficultyBadge: React.FC<Props> = ({ difficulty }) => {
  const getBadgeClass = () => {
    switch (difficulty) {
      case 'Easy':
        return 'badge badge-easy';
      case 'Medium':
        return 'badge badge-medium';
      case 'Hard':
        return 'badge badge-hard';
      default:
        return 'badge badge-easy';
    }
  };

  return (
    <span className={getBadgeClass()}>
      {difficulty}
    </span>
  );
};


