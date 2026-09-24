import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { Paciente } from "../models/paciente.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

// Datos editables de un paciente (para crear y actualizar): excluye lo que
// asigna el backend (id, código de expediente, auditoría y borrado lógico).
export type NuevoPaciente = Omit<
    Paciente,
    | 'idPaciente'
    | 'codigoExpediente'
    | 'activo'
    | 'fechaCreacion'
    | 'fechaModificacion'
    | 'idUsuarioCreacion'
    | 'idUsuarioModificacion'
>;

@Injectable({
    providedIn: 'root'
})
export class PacienteService {
    private apiUrl = 'https://localhost:7086/api/Pacientes';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    RetornarPacientes(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    RetornarPaciente(idPaciente: number): Observable<ApiResponse<Paciente>> {
        return this.http.get<ApiResponse<Paciente>>(`${this.apiUrl}/${idPaciente}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearPaciente(paciente: NuevoPaciente): Observable<ApiResponse<Paciente>> {
        return this.http.post<ApiResponse<Paciente>>(this.apiUrl, paciente).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarPaciente(idPaciente: number, paciente: NuevoPaciente): Observable<ApiResponse<Paciente>> {
        return this.http.put<ApiResponse<Paciente>>(`${this.apiUrl}/${idPaciente}`, paciente).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // Borrado lógico: el backend marca el registro con activo = false, no lo elimina físicamente.
    EliminarPaciente(idPaciente: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${idPaciente}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}