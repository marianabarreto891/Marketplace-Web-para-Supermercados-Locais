import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  createdAt?: string;
}

interface UserProfileResponse {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    const saved = localStorage.getItem('user');
    if (saved) this.currentUser.set(JSON.parse(saved));
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  register(data: { name: string; email: string; password: string; address: string; phone: string }) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  getProfile() {
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/me`).pipe(
      map((user) => ({
        id: user.id || user._id || this.currentUser()?.id || '',
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
      })),
      tap((normalizedUser) => {
        const mergedUser = {
          ...(this.currentUser() || {}),
          ...normalizedUser,
        };

        localStorage.setItem('user', JSON.stringify(mergedUser));
        this.currentUser.set(mergedUser);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}
