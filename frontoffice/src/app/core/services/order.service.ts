import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CartItem } from '../models/cart-item.model';
import { DashboardStats } from '../models/dashboard-stats.model';
import { Order } from '../models/order.model';

export interface CreateOrderInput {
  items: CartItem[];
  deliveryMethod: 'levantamento_loja' | 'estafeta';
  couponCode?: string;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
}

export interface SubmitOrderReviewInput {
  ratingSupermarket: number;
  commentSupermarket?: string;
  ratingCourier?: number | null;
  commentCourier?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apiUrl = 'http://localhost:3000/api';

  private readonly statusLabels: Record<string, string> = {
    confirmada: 'Confirmada',
    em_preparacao: 'Em preparacao',
    em_entrega: 'Em entrega',
    entregue: 'Entregue',
    cancelada: 'Cancelada',
  };

  private readonly paymentStatusLabels: Record<string, string> = {
    pending: 'Por pagar',
    paid: 'Pago',
    failed: 'Falhou',
    canceled: 'Pagamento cancelado',
  };

  private readonly deliveryLabels: Record<string, string> = {
    levantamento_loja: 'Levantamento em loja',
    estafeta: 'Entrega por estafeta',
  };

  constructor(private http: HttpClient) {}

  getMyOrders(): Observable<Order[]> {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<Order[]>(`${this.apiUrl}/orders/my`, { params });
  }

  getMyOrderById(orderId: string): Observable<Order> {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}`, { params });
  }

  createOrder(input: CreateOrderInput): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, {
      items: input.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      deliveryMethod: input.deliveryMethod,
      couponCode: input.couponCode || '',
    });
  }

  cancelOrder(orderId: string): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders/${orderId}/cancel`, {});
  }

  submitReview(orderId: string, input: SubmitOrderReviewInput): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders/${orderId}/rate`, {
      ratingSupermarket: input.ratingSupermarket,
      commentSupermarket: input.commentSupermarket || '',
      ratingCourier: input.ratingCourier ?? null,
      commentCourier: input.commentCourier || '',
    });
  }

  getDashboardStats(): Observable<DashboardStats> {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/client`, {
      params,
    });
  }

  createCheckoutSession(orderId: string): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>(
      `${this.apiUrl}/payments/checkout/${orderId}`,
      {}
    );
  }

  confirmCheckoutSession(sessionId: string): Observable<Order> {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<Order>(
      `${this.apiUrl}/payments/confirm/${sessionId}`,
      { params }
    );
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status] || status;
  }

  getPaymentStatusLabel(status: string): string {
    return this.paymentStatusLabels[status] || status;
  }

  getDeliveryLabel(code: string): string {
    return this.deliveryLabels[code] || code;
  }

  requestRefund(orderId: string) {
  return this.http.post<{ message: string }>(
    `${this.apiUrl}/orders/${orderId}/refund-request`,
    {}
  );
}

}
