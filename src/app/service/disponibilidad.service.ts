import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { DisponibilidadMedico, DisponibilidadRequest } from "../models/cita.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class DisponibilidadService {
    private apiUrl = 'https://localhost:7086/api/disponibilidad-medico';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/disponibilidad-medico              → horarios de todos los médicos
    // GET /api/disponibilidad-medico?idMedico=3   → solo los de ese médico
    RetornarDisponibilidades(idMedico?: number): Observable<ApiResponse<DisponibilidadMedico[]>> {
        const url = idMedico ? `${this.apiUrl}?idMedico=${idMedico}` : this.apiUrl;
        return this.http.get<ApiResponse<DisponibilidadMedico[]>>(url).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/disponibilidad-medico/{id}
    RetornarDisponibilidad(idDisponibilidad: number): Observable<ApiResponse<DisponibilidadMedico>> {
        return this.http.get<ApiResponse<DisponibilidadMedico>>(`${this.apiUrl}/${idDisponibilidad}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/disponibilidad-medico
    // Horas en formato 'HH:mm:ss'; la hora de fin debe ser posterior a la de inicio.
    CrearDisponibilidad(disponibilidad: DisponibilidadRequest): Observable<ApiResponse<DisponibilidadMedico>> {
        return this.http.post<ApiResponse<DisponibilidadMedico>>(this.apiUrl, disponibilidad).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/disponibilidad-medico/{id}
    ActualizarDisponibilidad(idDisponibilidad: number, disponibilidad: DisponibilidadRequest): Observable<ApiResponse<DisponibilidadMedico>> {
        return this.http.put<ApiResponse<DisponibilidadMedico>>(`${this.apiUrl}/${idDisponibilidad}`, disponibilidad).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/disponibilidad-medico/{id}
    // Borrado lógico.
    EliminarDisponibilidad(idDisponibilidad: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idDisponibilidad}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}