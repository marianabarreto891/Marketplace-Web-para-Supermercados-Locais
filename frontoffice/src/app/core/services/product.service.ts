import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface Product {
  _id: string; name: string; description: string;
  price: number; stock: number; image: string;
  category: { _id: string; name: string };
  supermarket: { _id: string; name: string; location: string };
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getProducts(filters: { search?: string; category?: string; sort?: string }) {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.category && filters.category !== 'all') params = params.set('category', filters.category);
    if (filters.sort) params = params.set('sort', filters.sort);
    return this.http.get<Product[]>(`${this.apiUrl}/products`, { params });
  }

  getCategories() {
    return this.http.get<{ _id: string; name: string }[]>(`${this.apiUrl}/categories`);
  }

  compareByName(name: string) {
    return this.http.get<Product[]>(`${this.apiUrl}/products/compare`, {
      params: new HttpParams().set('name', name)
    });
  }
}