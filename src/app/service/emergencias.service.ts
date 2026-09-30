import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";



export interface CasoEmergencia {
  idCaso: number;
  idPaciente: number | null; // null: paciente aún no identificado/registrado (walk-in)
  nombrePaciente: string;
  idMedico: number | null;
  idNivelTriage: number;
  idEstadoCaso: number;
  motivo: string;
  horaLlegada: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface CompromisoPago {
  idConsentimiento: number; 
  idPaciente: number;
  idTratamiento: number | null;
  idMedicoResponsable: number | null;
  idTestigo: number | null;
  fechaFirma: string | null;
  firmaDigitalHash: string | null;
  firmaDigitalUrl: string | null;
  idEstadoConsentimiento: number;
  nombreResponsable: string;
  idParentescoResponsable: number;
  telefonoResponsable: string;
}


export type NuevoCasoEmergencia = Omit<
    CasoEmergencia,
    'idCaso' | 'activo' | 'fechaCreacion' | 'fechaModificacion'
>;

export type NuevoCompromisoPago = Omit<CompromisoPago, 'idConsentimiento'>;

@Injectable({
    providedIn: 'root'
})
export class EmergenciaService {
    private apiUrl = 'https://localhost:7086/api/casos-emergencia';
    private apiUrlCompromisos = 'https://localhost:7086/api/compromisos-pago';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // ---------- Casos de emergencia ----------

    RetornarCasos(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    RetornarCaso(idCaso: number): Observable<ApiResponse<CasoEmergencia>> {
        return this.http.get<ApiResponse<CasoEmergencia>>(`${this.apiUrl}/${idCaso}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearCaso(caso: NuevoCasoEmergencia): Observable<ApiResponse<CasoEmergencia>> {
        return this.http.post<ApiResponse<CasoEmergencia>>(this.apiUrl, caso).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarCaso(idCaso: number, caso: NuevoCasoEmergencia): Observable<ApiResponse<CasoEmergencia>> {
        return this.http.put<ApiResponse<CasoEmergencia>>(`${this.apiUrl}/${idCaso}`, caso).pipe(
            catchError(this.errorService.handleError)
        )
    }


    EliminarCaso(idCaso: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${idCaso}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ---------- Compromisos de pago ----------

    RetornarCompromisos(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(this.apiUrlCompromisos).pipe(
            catchError(this.errorService.handleError)
        )
    }

    RetornarCompromiso(idConsentimiento: number): Observable<ApiResponse<CompromisoPago>> {
        return this.http.get<ApiResponse<CompromisoPago>>(
            `${this.apiUrlCompromisos}/${idConsentimiento}`
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearCompromiso(compromiso: NuevoCompromisoPago): Observable<ApiResponse<CompromisoPago>> {
        return this.http.post<ApiResponse<CompromisoPago>>(this.apiUrlCompromisos, compromiso).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarCompromiso(
        idConsentimiento: number,
        compromiso: NuevoCompromisoPago
    ): Observable<ApiResponse<CompromisoPago>> {
        return this.http.put<ApiResponse<CompromisoPago>>(
            `${this.apiUrlCompromisos}/${idConsentimiento}`,
            compromiso
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    EliminarCompromiso(idConsentimiento: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(
            `${this.apiUrlCompromisos}/${idConsentimiento}`
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }
}