import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { CatalogoOpcion } from "../models/catalogo.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class CatalogoService {
    private apiUrl = 'https://localhost:7086/api/catalogos';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/catalogos/{codigoTipo}
    // Ejemplo de uso: RetornarCatalogo(CODIGOS_CATALOGO.GENERO)
    // Si el código no existe en la base, el backend responde 404.
    RetornarCatalogo(codigoTipo: string): Observable<ApiResponse<CatalogoOpcion[]>> {
        return this.http.get<ApiResponse<CatalogoOpcion[]>>(`${this.apiUrl}/${codigoTipo}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}