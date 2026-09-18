import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";
import { LoginRequest} from "../models/auth.model";
import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:5042/api/Auth/login';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    signIn(loginRequest: LoginRequest): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(this.apiUrl, loginRequest).pipe(
            catchError(this.errorService.handleError)
        )
    }
}