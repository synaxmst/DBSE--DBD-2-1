import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('admin' | 'setter' | 'user')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  roles 
}) => {
  const { currentUser } = useJudge();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
