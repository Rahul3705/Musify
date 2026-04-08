import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { AuthServiceService } from '../services/auth-service.service';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

const PUBLIC_ENDPOINTS = [
  '/loginUser',
  '/registerUser',
  '/forgotPassword',
  '/refreshAccessToken'
]

const isPublicEndpoint = (url: string): boolean => {
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

const addToken = (req: HttpRequest<any>, token: string): HttpRequest<any> => {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
};

const isTokenExpired = (token: string): boolean => {

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= (exp - 5000); // Consider token expired if it's within 5 seconds of expiring
  } catch (e) {
    return true; // Treat invalid token as expired
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthServiceService);
  if(isPublicEndpoint(req.url)) {
    return next(req);
  }
  const token = authService.getAccessToken();

  if(!token) {
    return next(req);
  }
  if(isTokenExpired(token)) {
    return authService.refreshAccessToken().pipe(
      switchMap(Response => 
        next(addToken(req, Response.accessToken))
      ),
      catchError(error => throwError(() => error)) 
    );
  }
  return next(addToken(req, token)).pipe(
    catchError((error: HttpErrorResponse) => {
      if(error.status === 401 || error.status === 403 || error.status === 0) {
        return authService.refreshAccessToken().pipe(
          switchMap(Response => 
            next(addToken(req, Response.accessToken))
          ),
          catchError(refreshError => throwError(() => refreshError))
        );
      } 
      return throwError(() => error);
    })
  );
};