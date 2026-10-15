import { environment } from '../../environments/environment';
import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";
import { LoginRequest} from "../models/auth.model";
import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiUrl}/api/Auth/login`;

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    signIn(loginRequest: LoginRequest): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(this.apiUrl, loginRequest).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // Id del usuario de la sesión actual (del JWT, guardado al iniciar
    // sesión). Lo usa la pantalla de "Mi cuenta" para saber a quién editar.
    idUsuarioActual(): number | null {
        try {
            const id = localStorage.getItem('id_usuario');
            return id ? Number(id) : null;
        } catch {
            return null;
        }
    }

    // Dice si hay un token guardado y, a juzgar por su propio campo "exp"
    // (decodificado acá mismo, sin golpear al backend), todavía no venció.
    // No es una validación de firma — eso lo hace el backend en cada
    // petición — pero alcanza para decidir si vale la pena dejar pasar al
    // guard de rutas o mandar directo al login.
    tieneSesionValida(): boolean {
        let token: string | null;
        try {
            token = localStorage.getItem('token');
        } catch {
            return false;
        }
        if (!token) {
            return false;
        }
        const payload = this.decodificarPayload(token);
        if (!payload || typeof payload.exp !== 'number') {
            return false;
        }
        return payload.exp * 1000 > Date.now();
    }

    private decodificarPayload(token: string): { exp?: number } | null {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch {
            return null;
        }
    }

    // Borra la sesión guardada localmente. El backend no tiene un endpoint
    // de logout (el JWT solo expira solo, no se puede invalidar antes), así
    // que cerrar sesión es, del lado del cliente, dejar de mandar el token.
    logout(): void {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('id_usuario');
        } catch {
            // Sin localStorage (SSR o navegación privada): no hay nada que borrar.
        }
    }
}