// Autenticación (login) contra el backend real.
import { ApiResponse } from './api-response.model';

export interface LoginRequest {
  nombreUsuario: string;
  idUsuario: number | null;
  contrasena: string;
}

export interface UsuarioAutenticado {
  idUsuario: number;
  nombreUsuario: string;
  nombreCompleto: string;
  correo: string;
  requiereCambioPassword: boolean;
  roles: string[];
}

export interface LoginData {
  token: string;
  expiraEn: string; // ISO datetime
  usuario: UsuarioAutenticado;
}

export type LoginResponse = ApiResponse<LoginData>;
