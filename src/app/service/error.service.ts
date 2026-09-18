import { Injectable } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { Observable, throwError } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class ErrorService {
  public handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error inesperado en el servidor';

    if (error.error instanceof ErrorEvent) {
    // Ocurrió un error del lado del cliente (ej. se cortó el internet)
    errorMessage = error.error.message;
    } else {
        // El backend de NestJS rechazó la petición (ej. error 400, 401, 404, 500)

        if (error.error) {
            // Manejar diferentes formatos de error de NestJS
            if (typeof error.error === 'string') {
                // Error directo como string (BadRequestException con mensaje simple)
                errorMessage = error.error;
            } else if (error.error.message) {
                // Error con propiedad message (puede ser string o array)
                errorMessage = Array.isArray(error.error.message)
                    ? error.error.message[0]
                    : error.error.message;
            } else if (error.error.error && typeof error.error.error === 'string') {
                // Error con propiedad error (formato estándar de NestJS)
                errorMessage = error.error.error;
            } else {
                // Si el backend se cae por completo y no manda formato NestJS
                errorMessage = `Error del servidor (Código ${error.status})`;
            }
        } else {
            // Error sin body (conexión fallida, etc.)
            errorMessage = `Error del servidor (Código ${error.status})`;
        }
    }
    // Retornamos el error limpio para que el componente lo lea
    return throwError(() => new Error(errorMessage));
  }    
}