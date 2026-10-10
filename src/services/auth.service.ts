import { supabase } from './supabase.service';
import { authStore } from '../store/authStore';
import type { AuthenticatedUser, UserCredentials } from '../types/user.types';

export interface RegistrationCredentials extends UserCredentials {
  username: string;
}

export class AuthService {
  // 1. Iniciar Sesión con Supabase
  async login(credentials: UserCredentials): Promise<AuthenticatedUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('No se pudo recuperar la información del usuario.');
    }

    // Cargar perfil completo (username, avatar, role) desde la tabla public.profiles
    return await this.loadUserProfile(data.user.id);
  }

  // 2. Registrar Usuario con Supabase
  async register(credentials: RegistrationCredentials): Promise<AuthenticatedUser> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          username: credentials.username, // Se guardará vía Trigger en public.profiles
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Error al registrar el usuario.');
    }

    // Cargar perfil recién creado
    return await this.loadUserProfile(data.user.id);
  }

  // 3. Obtener Perfil y Rol desde la base de datos
  async loadUserProfile(userId: string): Promise<AuthenticatedUser> {
  // Intentar obtener el perfil con .maybeSingle()
  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, role')
    .eq('id', userId)
    .maybeSingle();

  // Si el trigger tardó unos milisegundos, reintentar una vez tras breve espera
  if (!data) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const retry = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role')
      .eq('id', userId)
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(`Error al obtener el perfil: ${error.message}`);
  }

  // Si no se creó el perfil, crear un objeto básico de respaldo
  const authUser: AuthenticatedUser = {
    id: userId,
    username: data?.username ?? 'Jugador',
    avatarUrl: data?.avatar_url ?? undefined,
    role: (data?.role as 'player' | 'admin') ?? 'player',
  };

  authStore.setUser(authUser);
  return authUser;
}

  // 4. Cerrar Sesión
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    authStore.setUser(null);
  }

  // 5. Verificar si hay una sesión activa al recargar la página
  async checkSession(): Promise<AuthenticatedUser | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Error al verificar la sesión: ${error.message}`);

    if (data.session?.user) {
      return await this.loadUserProfile(data.session.user.id);
    }
    
    return null;
  }
}

export const authService = new AuthService();