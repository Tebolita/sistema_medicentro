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
    private apiUrl = 'https://localhost:7086/api/Auth/login';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    signIn(loginRequest: LoginRequest): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(this.apiUrl, loginRequest).pipe(
            catchError(this.errorService.handleError)
        )
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