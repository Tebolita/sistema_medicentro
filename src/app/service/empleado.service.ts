import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { Medico, EmpleadoDetalle, EmpleadoRequest } from "../models/medico.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class EmpleadoService {
    private apiUrl = 'https://localhost:7086/api/empleados';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/empleados/medicos
    // Personal médico activo (empleados con especialidad asignada).
    RetornarMedicos(): Observable<ApiResponse<Medico[]>> {
        return this.http.get<ApiResponse<Medico[]>>(`${this.apiUrl}/medicos`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/empleados              → todos los empleados activos
    // GET /api/empleados?idPuesto=3   → solo los de ese puesto (ej. recepcionistas)
    RetornarEmpleados(idPuesto?: number): Observable<ApiResponse<EmpleadoDetalle[]>> {
        const url = idPuesto ? `${this.apiUrl}?idPuesto=${idPuesto}` : this.apiUrl;
        return this.http.get<ApiResponse<EmpleadoDetalle[]>>(url).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/empleados/{id}
    RetornarEmpleado(idEmpleado: number): Observable<ApiResponse<EmpleadoDetalle>> {
        return this.http.get<ApiResponse<EmpleadoDetalle>>(`${this.apiUrl}/${idEmpleado}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/empleados
    CrearEmpleado(empleado: EmpleadoRequest): Observable<ApiResponse<EmpleadoDetalle>> {
        return this.http.post<ApiResponse<EmpleadoDetalle>>(this.apiUrl, empleado).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/empleados/{id}
    ActualizarEmpleado(idEmpleado: number, empleado: EmpleadoRequest): Observable<ApiResponse<EmpleadoDetalle>> {
        return this.http.put<ApiResponse<EmpleadoDetalle>>(`${this.apiUrl}/${idEmpleado}`, empleado).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/empleados/{id}
    // Borrado lógico.
    EliminarEmpleado(idEmpleado: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idEmpleado}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}