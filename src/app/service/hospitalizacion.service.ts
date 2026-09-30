import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import {
    Habitacion,
    Cama,
    Hospitalizacion,
    OrdenMedicaHospitalizacion,
    NotaEnfermeria
} from "../models/hospitalizacion.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";


export type NuevaHabitacion = Omit<
    Habitacion,
    'idHabitacion' | 'activo' | 'fechaCreacion' | 'fechaModificacion'
>;

export type NuevaCama = Omit<
    Cama,
    'idCama' | 'idHabitacion' | 'activo' | 'fechaCreacion' | 'fechaModificacion'
>;

export type NuevaHospitalizacion = Omit<
    Hospitalizacion,
    | 'idHospitalizacion'
    | 'activo'
    | 'fechaCreacion'
    | 'fechaModificacion'
    | 'idUsuarioCreacion'
    | 'idUsuarioModificacion'
>;

export type NuevaOrdenMedica = Omit<
    OrdenMedicaHospitalizacion,
    'idOrdenMedica' | 'idHospitalizacion' | 'activo' | 'fechaCreacion' | 'fechaModificacion'
>;

export type NuevaNotaEnfermeria = Omit<
    NotaEnfermeria,
    'idNotaEnfermeria' | 'idHospitalizacion' | 'activo' | 'fechaCreacion'
>;

@Injectable({
    providedIn: 'root'
})
export class HospitalizacionService {
    private apiUrl = 'https://localhost:7086/api/Hospitalizaciones';
    private apiUrlHabitaciones = 'https://localhost:7086/api/Habitaciones';
    private apiUrlCamas = 'https://localhost:7086/api/Camas';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // ---------- Hospitalizaciones ----------

    RetornarHospitalizaciones(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    RetornarHospitalizacion(idHospitalizacion: number): Observable<ApiResponse<Hospitalizacion>> {
        return this.http.get<ApiResponse<Hospitalizacion>>(`${this.apiUrl}/${idHospitalizacion}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearHospitalizacion(hospitalizacion: NuevaHospitalizacion): Observable<ApiResponse<Hospitalizacion>> {
        return this.http.post<ApiResponse<Hospitalizacion>>(this.apiUrl, hospitalizacion).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarHospitalizacion(
        idHospitalizacion: number,
        hospitalizacion: NuevaHospitalizacion
    ): Observable<ApiResponse<Hospitalizacion>> {
        return this.http.put<ApiResponse<Hospitalizacion>>(
            `${this.apiUrl}/${idHospitalizacion}`,
            hospitalizacion
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

  
    EliminarHospitalizacion(idHospitalizacion: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${idHospitalizacion}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ---------- Órdenes médicas (subrecurso de una hospitalización) ----------
  
    CrearOrdenMedica(
        idHospitalizacion: number,
        orden: NuevaOrdenMedica
    ): Observable<ApiResponse<OrdenMedicaHospitalizacion>> {
        return this.http.post<ApiResponse<OrdenMedicaHospitalizacion>>(
            `${this.apiUrl}/${idHospitalizacion}/ordenes`,
            orden
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ---------- Notas de enfermería (subrecurso de una hospitalización) ----------

    RetornarNotasEnfermeria(idHospitalizacion: number): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.apiUrl}/${idHospitalizacion}/notas-enfermeria`
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearNotaEnfermeria(
        idHospitalizacion: number,
        nota: NuevaNotaEnfermeria
    ): Observable<ApiResponse<NotaEnfermeria>> {
        return this.http.post<ApiResponse<NotaEnfermeria>>(
            `${this.apiUrl}/${idHospitalizacion}/notas-enfermeria`,
            nota
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ---------- Habitaciones ----------

    RetornarHabitaciones(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(this.apiUrlHabitaciones).pipe(
            catchError(this.errorService.handleError)
        )
    }

    RetornarHabitacion(idHabitacion: number): Observable<ApiResponse<Habitacion>> {
        return this.http.get<ApiResponse<Habitacion>>(`${this.apiUrlHabitaciones}/${idHabitacion}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearHabitacion(habitacion: NuevaHabitacion): Observable<ApiResponse<Habitacion>> {
        return this.http.post<ApiResponse<Habitacion>>(this.apiUrlHabitaciones, habitacion).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarHabitacion(
        idHabitacion: number,
        habitacion: NuevaHabitacion
    ): Observable<ApiResponse<Habitacion>> {
        return this.http.put<ApiResponse<Habitacion>>(
            `${this.apiUrlHabitaciones}/${idHabitacion}`,
            habitacion
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    EliminarHabitacion(idHabitacion: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.apiUrlHabitaciones}/${idHabitacion}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ---------- Camas ----------

    RetornarCamas(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(this.apiUrlCamas).pipe(
            catchError(this.errorService.handleError)
        )
    }

    CrearCama(idHabitacion: number, cama: NuevaCama): Observable<ApiResponse<Cama>> {
        return this.http.post<ApiResponse<Cama>>(
            `${this.apiUrlHabitaciones}/${idHabitacion}/camas`,
            cama
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    ActualizarCama(
        idHabitacion: number,
        idCama: number,
        cama: NuevaCama
    ): Observable<ApiResponse<Cama>> {
        return this.http.put<ApiResponse<Cama>>(
            `${this.apiUrlHabitaciones}/${idHabitacion}/camas/${idCama}`,
            cama
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }

    EliminarCama(idHabitacion: number, idCama: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(
            `${this.apiUrlHabitaciones}/${idHabitacion}/camas/${idCama}`
        ).pipe(
            catchError(this.errorService.handleError)
        )
    }
}