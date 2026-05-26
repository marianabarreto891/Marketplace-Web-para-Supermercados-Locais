import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface CourierReview {
  orderId: string;
  displayId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CourierReviewsResponse {
  courier: {
    id: string;
    name: string;
  };
  averageRating: number;
  totalReviews: number;
  reviews: CourierReview[];
}

@Injectable({ providedIn: 'root' })
export class CourierService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getCourierReviews(courierId: string) {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<CourierReviewsResponse>(
      `${this.apiUrl}/couriers/${courierId}/reviews`,
      { params }
    );
  }
}