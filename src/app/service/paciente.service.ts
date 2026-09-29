import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import {
    PacienteListado,
    PacienteCompleto,
    DatosPacienteRequest,
    CrearPacienteRequest,
    EditarPacienteRequest,
} from "../models/paciente.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

// Datos editables de la ficha de un paciente (sin id, código de expediente,
// auditoría ni borrado lógico). Se conserva por compatibilidad; para crear y
// editar se usan CrearPacienteRequest y EditarPacienteRequest, que además
// incluyen contactos, alergias y antecedentes.
export type NuevoPaciente = DatosPacienteRequest;

@Injectable({
    providedIn: 'root'
})
export class PacienteService {
    private apiUrl = 'https://localhost:7086/api/Pacientes';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/Pacientes
    // Solo pacientes activos, ordenados por apellido y nombre, con la edad calculada.
    RetornarPacientes(): Observable<ApiResponse<PacienteListado[]>> {
        return this.http.get<ApiResponse<PacienteListado[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/Pacientes/{id}
    // Devuelve la ficha completa: { paciente, contactos, alergias, antecedentes }.
    RetornarPaciente(idPaciente: number): Observable<ApiResponse<PacienteCompleto>> {
        return this.http.get<ApiResponse<PacienteCompleto>>(`${this.apiUrl}/${idPaciente}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/Pacientes
    // No se envía idPaciente ni codigoExpediente: los genera el backend.
    CrearPaciente(paciente: CrearPacienteRequest): Observable<ApiResponse<PacienteCompleto>> {
        return this.http.post<ApiResponse<PacienteCompleto>>(this.apiUrl, paciente).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Pacientes/{id}
    // IMPORTANTE: enviar SIEMPRE las listas completas de contactos, alergias y
    // antecedentes. Las filas que no vayan en la lista, el backend las da de baja.
    ActualizarPaciente(idPaciente: number, paciente: EditarPacienteRequest): Observable<ApiResponse<PacienteCompleto>> {
        return this.http.put<ApiResponse<PacienteCompleto>>(`${this.apiUrl}/${idPaciente}`, paciente).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Pacientes/{id}
    // Borrado lógico: el backend marca el registro con activo = false, no lo elimina físicamente.
    EliminarPaciente(idPaciente: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idPaciente}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}