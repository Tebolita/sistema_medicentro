import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import {
    OrdenLaboratorio,
    ResultadoExamen,
    TipoExamen
} from "../models/laboratorio.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";


export type NuevaOrdenLaboratorio = Omit<
    OrdenLaboratorio,
    | 'idOrden'
    | 'activo'
    | 'fechaCreacion'
    | 'fechaModificacion'
    | 'idUsuarioCreacion'
    | 'idUsuarioModificacion'
>;

export type NuevoResultadoExamen = Omit<
    ResultadoExamen,
    | 'idResultado'
    | 'activo'
    | 'fechaCreacion'
    | 'fechaModificacion'
    | 'idUsuarioCreacion'
    | 'idUsuarioModificacion'
>;

export type NuevoTipoExamen = Omit<
    TipoExamen,
    | 'idTipoExamen'
    | 'activo'
    | 'fechaCreacion'
    | 'fechaModificacion'
>;

@Injectable({
    providedIn: 'root'
})
export class LaboratorioService {
    private apiUrl = 'https://localhost:7086/api/laboratorio';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // ---------- Órdenes de laboratorio ----------

    RetornarOrdenes(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    RetornarOrden(idOrden: number): Observable<ApiResponse<OrdenLaboratorio>> {
        return this.http.get<ApiResponse<OrdenLaboratorio>>(`${this.apiUrl}/${idOrden}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearOrden(orden: NuevaOrdenLaboratorio): Observable<ApiResponse<OrdenLaboratorio>> {
        return this.http.post<ApiResponse<OrdenLaboratorio>>(this.apiUrl, orden).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarOrden(idOrden: number, orden: NuevaOrdenLaboratorio): Observable<ApiResponse<OrdenLaboratorio>> {
        return this.http.put<ApiResponse<OrdenLaboratorio>>(`${this.apiUrl}/${idOrden}`, orden).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // Borrado lógico: el backend marca el registro con activo = false, no lo elimina físicamente.
    EliminarOrden(idOrden: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${idOrden}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ---------- Resultados de examen (subrecurso de un detalle de orden) ----------

    RetornarResultados(idOrden: number, idOrdenDetalle: number): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.apiUrl}/${idOrden}/detalles/${idOrdenDetalle}/resultados`
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearResultado(
        idOrden: number,
        idOrdenDetalle: number,
        resultado: NuevoResultadoExamen
    ): Observable<ApiResponse<ResultadoExamen>> {
        return this.http.post<ApiResponse<ResultadoExamen>>(
            `${this.apiUrl}/${idOrden}/detalles/${idOrdenDetalle}/resultados`,
            resultado
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarResultado(
        idOrden: number,
        idOrdenDetalle: number,
        idResultado: number,
        resultado: NuevoResultadoExamen
    ): Observable<ApiResponse<ResultadoExamen>> {
        return this.http.put<ApiResponse<ResultadoExamen>>(
            `${this.apiUrl}/${idOrden}/detalles/${idOrdenDetalle}/resultados/${idResultado}`,
            resultado
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    EliminarResultado(
        idOrden: number,
        idOrdenDetalle: number,
        idResultado: number
    ): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(
            `${this.apiUrl}/${idOrden}/detalles/${idOrdenDetalle}/resultados/${idResultado}`
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }
}

// ---------- Catálogo de tipos de examen (Electrocardiograma, Rayos X, Ultrasonido, etc.) ----------

@Injectable({
    providedIn: 'root'
})
export class TiposExamenService {
    private apiUrl = 'https://localhost:7086/api/tipos-examen';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    RetornarTiposExamen(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    RetornarTipoExamen(idTipoExamen: number): Observable<ApiResponse<TipoExamen>> {
        return this.http.get<ApiResponse<TipoExamen>>(`${this.apiUrl}/${idTipoExamen}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearTipoExamen(tipoExamen: NuevoTipoExamen): Observable<ApiResponse<TipoExamen>> {
        return this.http.post<ApiResponse<TipoExamen>>(this.apiUrl, tipoExamen).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarTipoExamen(idTipoExamen: number, tipoExamen: NuevoTipoExamen): Observable<ApiResponse<TipoExamen>> {
        return this.http.put<ApiResponse<TipoExamen>>(`${this.apiUrl}/${idTipoExamen}`, tipoExamen).pipe(
            catchError(this.errorService.handleError)
        )
    }

    EliminarTipoExamen(idTipoExamen: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${idTipoExamen}`).pipe(
            catchError(this.errorService.handleError)
        )
    }
}