import { io, Socket } from 'socket.io-client';

const CONTEST_WS_URL = import.meta.env.VITE_CONTEST_URL || 'http://localhost:4001';

let socket: Socket | null = null;

/**
 * Initialize or retrieve the Socket.io client singleton
 */
export const getContestSocket = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

    socket = io(CONTEST_WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Silence raw socket logging in production
    socket.on('connect_error', () => {
      // Reconnection attempts handled automatically by Socket.io client
    });
  }

  return socket;
};

/**
 * Connect the socket instance with current JWT authentication
 */
export const connectContestSocket = (): Socket => {
  const s = getContestSocket();
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

  // Update auth token in case user logged in/switched accounts
  s.auth = { token };

  if (!s.connected) {
    s.connect();
  }

  return s;
};

/**
 * Join contest room for live leaderboard and tournament status updates
 */
export const joinContest = (contestId: string): void => {
  const s = connectContestSocket();
  s.emit('join:contest', contestId);
};

/**
 * Leave contest room
 */
export const leaveContest = (contestId: string): void => {
  if (socket && socket.connected) {
    socket.emit('leave:contest', contestId);
  }
};

/**
 * Subscribe to real-time leaderboard update events
 */
export const onLeaderboardUpdate = (callback: (update: any) => void): (() => void) => {
  const s = getContestSocket();
  s.on('leaderboard:update', callback);
  return () => {
    s.off('leaderboard:update', callback);
  };
};

/**
 * Subscribe to contest started event
 */
export const onContestStarted = (callback: (data: any) => void): (() => void) => {
  const s = getContestSocket();
  s.on('contest:started', callback);
  return () => {
    s.off('contest:started', callback);
  };
};

/**
 * Subscribe to contest ended event
 */
export const onContestEnded = (callback: (data: any) => void): (() => void) => {
  const s = getContestSocket();
  s.on('contest:ended', callback);
  return () => {
    s.off('contest:ended', callback);
  };
};

/**
 * Disconnect socket and clean up
 */
export const disconnectContestSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
