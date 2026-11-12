import { environment } from '../../../environments/environment';

export function apiUrl(path: string): string {
  return environment.apiUrl + path;
}

export function isApiRequest(url: string): boolean {
  return url === environment.apiUrl || url.startsWith(`${environment.apiUrl}/`);
}

export function isAuthEndpoint(url: string): boolean {
  return url.startsWith(apiUrl('/api/auth/'));
}
