import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { Medico } from "../models/medico.model";

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

}