import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable } from "rxjs";

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

// BitacoraDto real (BitacoraAuditoriaController), igual que en los demás
// servicios que ya muestran historial de auditoría (compromisos de pago,
// usuarios, etc.).
export interface BitacoraItem {
    idBitacora: number;
    idUsuario: number | null;
    idTipoAccion: number;
    tablaAfectada: string;
    idRegistroAfectado: number | null;
    valoresAnteriores: string | null;
    valoresNuevos: string | null;
    ipOrigen: string | null;
    fechaHora: string;
    activo: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class PacienteService {
    private apiUrl = 'https://localhost:7086/api/Pacientes';
    private apiUrlBitacora = 'https://localhost:7086/api/bitacora-auditoria';

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

    // GET /api/Pacientes/eliminados
    // Pacientes dados de baja (activo = false), misma forma que el listado normal.
    RetornarPacientesEliminados(): Observable<ApiResponse<PacienteListado[]>> {
        return this.http.get<ApiResponse<PacienteListado[]>>(`${this.apiUrl}/eliminados`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Pacientes/{id}/reactivar
    // Deshace la baja lógica (activo = true).
    ReactivarPaciente(idPaciente: number): Observable<ApiResponse<object>> {
        return this.http.put<ApiResponse<object>>(`${this.apiUrl}/${idPaciente}/reactivar`, {}).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // =============================================================
    // BITÁCORA DE AUDITORÍA
    // =============================================================

    // GET /api/bitacora-auditoria?tablaAfectada=pacientes
    // Todos los cambios (crear/modificar/eliminar) registrados para la tabla,
    // sin filtrar por registro. Se usa en el "Historial general" de la lista.
    RetornarBitacoraGeneral(tablaAfectada: string): Observable<BitacoraItem[]> {
        return this.http.get<ApiResponse<BitacoraItem[]>>(
            `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`
        ).pipe(
            map((resp) => (resp.datos ?? []).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))),
            catchError(this.errorService.handleError)
        )
    }

    // Igual que RetornarBitacoraGeneral, pero filtrado a un solo registro
    // (usado en el "Ver historial" del formulario de un paciente puntual).
    RetornarBitacoraPorRegistro(tablaAfectada: string, idRegistro: number): Observable<BitacoraItem[]> {
        return this.http.get<ApiResponse<BitacoraItem[]>>(
            `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`
        ).pipe(
            map((resp) =>
                (resp.datos ?? [])
                    .filter((b) => b.idRegistroAfectado === idRegistro)
                    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
            ),
            catchError(this.errorService.handleError)
        )
    }

}