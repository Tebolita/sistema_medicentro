import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { AseguradoraListado } from "../models/seguro.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class AseguradoraService {
    private apiUrl = 'https://localhost:7086/api/Aseguradoras';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/Aseguradoras
    // Solo aseguradoras activas, ordenadas por nombre.
    // Por ahora el backend solo permite listar (no crear, editar ni eliminar).
    RetornarAseguradoras(): Observable<ApiResponse<AseguradoraListado[]>> {
        return this.http.get<ApiResponse<AseguradoraListado[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

}