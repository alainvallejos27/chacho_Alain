import type { AuthenticatedUser } from '../types/user.types';

const userStorageKey = 'cacho-user-profile';

export class AuthStore {
  private user: AuthenticatedUser | null = this.loadUser();

  getUser(): AuthenticatedUser | null {
    return this.user;
  }

  setUser(user: AuthenticatedUser | null): void {
    this.user = user;
    if (user) {
      localStorage.setItem(userStorageKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(userStorageKey);
    }
  }

  private loadUser(): AuthenticatedUser | null {
    const savedUser = localStorage.getItem(userStorageKey);
    if (!savedUser) return null;

    try {
      const user: unknown = JSON.parse(savedUser);
      if (
        typeof user === 'object' &&
        user !== null &&
        'id' in user &&
        typeof user.id === 'string' &&
        'username' in user &&
        typeof user.username === 'string' &&
        'role' in user &&
        (user.role === 'player' || user.role === 'admin')
      ) {
        return user as AuthenticatedUser;
      }
      throw new Error('El perfil guardado no tiene un formato válido.');
    } catch (error) {
      localStorage.removeItem(userStorageKey);
      if (error instanceof SyntaxError) return null;
      throw error;
    }
  }
}

export const authStore = new AuthStore();
