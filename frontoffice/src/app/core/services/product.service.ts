import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface Product {
  _id: string; name: string; description: string;
  price: number; stock: number; image: string;
  category: { _id: string; name: string };
  supermarket: {
    _id: string;
    name: string;
    location: string;
    deliveryMethods?: Array<'levantamento_loja' | 'estafeta'>;
    deliveryCost?: number;
  };
}

export interface SupermarketSummary {
  _id: string;
  name: string;
  location: string;
}

export interface SupermarketReview {
  orderId: string;
  displayId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SupermarketReviewsResponse {
  supermarket: {
    id: string;
    name: string;
    location: string;
  };
  averageRating: number;
  totalReviews: number;
  reviews: SupermarketReview[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}


getProducts(filters: {
  search?: string;
  category?: string;
  sort?: string;
  supermarket?: string;
  page?: number;
  limit?: number;
}) {
  let params = new HttpParams();
  if (filters.search) params = params.set('search', filters.search);
  if (filters.category && filters.category !== 'all') params = params.set('category', filters.category);
  if (filters.supermarket && filters.supermarket !== 'all') params = params.set('supermarket', filters.supermarket);
  if (filters.sort) params = params.set('sort', filters.sort);
  if (filters.page) params = params.set('page', filters.page.toString());
  if (filters.limit) params = params.set('limit', filters.limit.toString());
  params = params.set('_t', Date.now().toString());
  return this.http.get<{ products: Product[]; total: number; totalPages: number; currentPage: number }>(
    `${this.apiUrl}/products`, { params }
  );
}

  getCategories() {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<{ _id: string; name: string }[]>(`${this.apiUrl}/categories`, { params });
  }

  getSupermarkets() {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<SupermarketSummary[]>(`${this.apiUrl}/supermarkets`, {
      params,
    });
  }

  compareByName(name: string) {
    return this.http.get<Product[]>(`${this.apiUrl}/products/compare`, {
      params: new HttpParams()
        .set('name', name)
        .set('_t', Date.now().toString())
    });
  }

  getSupermarketReviews(supermarketId: string) {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<SupermarketReviewsResponse>(
      `${this.apiUrl}/supermarkets/${supermarketId}/reviews`,
      { params }
    );
  }
}
