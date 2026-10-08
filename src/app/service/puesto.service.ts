import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { PuestoDetalle, PuestoRequest } from "../models/medico.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class PuestoService {
    private apiUrl = 'https://localhost:7086/api/puestos';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/puestos
    RetornarPuestos(): Observable<ApiResponse<PuestoDetalle[]>> {
        return this.http.get<ApiResponse<PuestoDetalle[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/puestos/{id}
    RetornarPuesto(idPuesto: number): Observable<ApiResponse<PuestoDetalle>> {
        return this.http.get<ApiResponse<PuestoDetalle>>(`${this.apiUrl}/${idPuesto}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/puestos
    CrearPuesto(puesto: PuestoRequest): Observable<ApiResponse<PuestoDetalle>> {
        return this.http.post<ApiResponse<PuestoDetalle>>(this.apiUrl, puesto).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/puestos/{id}
    ActualizarPuesto(idPuesto: number, puesto: PuestoRequest): Observable<ApiResponse<PuestoDetalle>> {
        return this.http.put<ApiResponse<PuestoDetalle>>(`${this.apiUrl}/${idPuesto}`, puesto).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/puestos/{id}
    // Borrado lógico.
    EliminarPuesto(idPuesto: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idPuesto}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}