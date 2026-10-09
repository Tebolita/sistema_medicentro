import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import {
    ConvenioCompleto,
    ConvenioRequest,
    PacienteConvenio,
    AfiliadoRequest,
    ConvenioCobertura,
    CoberturaRequest,
} from "../models/seguro.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class ConvenioService {
    private apiUrl = 'https://localhost:7086/api/Convenios';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // ==================== CONVENIOS ====================

    // GET /api/Convenios
    // Solo convenios activos, ordenados por nombre, cada uno con sus afiliados y coberturas.
    RetornarConvenios(): Observable<ApiResponse<ConvenioCompleto[]>> {
        return this.http.get<ApiResponse<ConvenioCompleto[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/Convenios/{id}
    // Devuelve { convenio, afiliados, coberturas }.
    RetornarConvenio(idConvenio: number): Observable<ApiResponse<ConvenioCompleto>> {
        return this.http.get<ApiResponse<ConvenioCompleto>>(`${this.apiUrl}/${idConvenio}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/Convenios
    CrearConvenio(convenio: ConvenioRequest): Observable<ApiResponse<ConvenioCompleto>> {
        return this.http.post<ApiResponse<ConvenioCompleto>>(this.apiUrl, convenio).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Convenios/{id}
    // Solo actualiza los datos del convenio; afiliados y coberturas no se tocan.
    ActualizarConvenio(idConvenio: number, convenio: ConvenioRequest): Observable<ApiResponse<ConvenioCompleto>> {
        return this.http.put<ApiResponse<ConvenioCompleto>>(`${this.apiUrl}/${idConvenio}`, convenio).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Convenios/{id}
    // Borrado lógico.
    EliminarConvenio(idConvenio: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idConvenio}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ==================== AFILIADOS (paciente_convenio) ====================

    // POST /api/Convenios/{id}/afiliados
    // Si el paciente ya está afiliado a ese convenio, el backend responde 409.
    CrearAfiliado(idConvenio: number, afiliado: AfiliadoRequest): Observable<ApiResponse<PacienteConvenio>> {
        return this.http.post<ApiResponse<PacienteConvenio>>(`${this.apiUrl}/${idConvenio}/afiliados`, afiliado).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Convenios/{id}/afiliados/{idPacienteConvenio}
    ActualizarAfiliado(idConvenio: number, idPacienteConvenio: number, afiliado: AfiliadoRequest): Observable<ApiResponse<PacienteConvenio>> {
        return this.http.put<ApiResponse<PacienteConvenio>>(`${this.apiUrl}/${idConvenio}/afiliados/${idPacienteConvenio}`, afiliado).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Convenios/{id}/afiliados/{idPacienteConvenio}
    // Borrado lógico.
    EliminarAfiliado(idConvenio: number, idPacienteConvenio: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idConvenio}/afiliados/${idPacienteConvenio}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ==================== COBERTURAS (convenio_cobertura) ====================

    // POST /api/Convenios/{id}/coberturas
    // Solo una cobertura por tipo de ítem en cada convenio (si se repite, 409).
    CrearCobertura(idConvenio: number, cobertura: CoberturaRequest): Observable<ApiResponse<ConvenioCobertura>> {
        return this.http.post<ApiResponse<ConvenioCobertura>>(`${this.apiUrl}/${idConvenio}/coberturas`, cobertura).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Convenios/{id}/coberturas/{idConvenioCobertura}
    ActualizarCobertura(idConvenio: number, idConvenioCobertura: number, cobertura: CoberturaRequest): Observable<ApiResponse<ConvenioCobertura>> {
        return this.http.put<ApiResponse<ConvenioCobertura>>(`${this.apiUrl}/${idConvenio}/coberturas/${idConvenioCobertura}`, cobertura).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Convenios/{id}/coberturas/{idConvenioCobertura}
    // Borrado lógico.
    EliminarCobertura(idConvenio: number, idConvenioCobertura: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idConvenio}/coberturas/${idConvenioCobertura}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}