export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  gamesPlayed: number;
  wins: number;
  role?: 'player' | 'admin';
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  role: 'player' | 'admin';
}

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
