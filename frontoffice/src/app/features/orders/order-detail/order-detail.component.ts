import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Order } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly orderId = this.route.snapshot.paramMap.get('id') || 'sem-id';
  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly paymentMessage = signal('');
  readonly paymentLoading = signal(false);

  ngOnInit(): void {
    const payment = this.route.snapshot.queryParamMap.get('payment');
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    const created = this.route.snapshot.queryParamMap.get('created');

    if (created === '1') {
      this.paymentMessage.set('Encomenda criada com sucesso.');
    } else if (payment === 'canceled') {
      this.paymentMessage.set('O pagamento foi cancelado.');
    } else if (payment === 'success' && sessionId) {
      this.confirmStripePayment(sessionId);
      return;
    }

    this.loadOrder();
  }

  get statusLabel(): string {
    const order = this.order();
    return order ? this.orderService.getStatusLabel(order.status) : '-';
  }

  get paymentStatusLabel(): string {
    const order = this.order();
    return order ? this.orderService.getPaymentStatusLabel(order.paymentStatus) : '-';
  }

  get deliveryLabel(): string {
    const order = this.order();
    return order ? this.orderService.getDeliveryLabel(order.deliveryMethod) : '-';
  }

  get canReview(): boolean {
    return this.order()?.status === 'entregue';
  }

  get canPay(): boolean {
    const order = this.order();
    return !!order && order.paymentStatus !== 'paid' && order.status !== 'cancelada';
  }

  startStripePayment(): void {
    this.errorMessage.set('');
    this.paymentLoading.set(true);

    this.orderService.createCheckoutSession(this.orderId).subscribe({
      next: ({ checkoutUrl }) => {
        window.location.href = checkoutUrl;
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel iniciar o pagamento.'
        );
        this.paymentLoading.set(false);
      },
    });
  }

  private loadOrder(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.orderService.getMyOrderById(this.orderId).subscribe({
      next: (order) => {
        this.order.set(order);
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel carregar o detalhe da encomenda.'
        );
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  private confirmStripePayment(sessionId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.orderService.confirmCheckoutSession(sessionId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.paymentMessage.set('Pagamento confirmado com sucesso.');
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel confirmar o pagamento.'
        );
      },
      complete: () => {
        this.loading.set(false);
        this.paymentLoading.set(false);
      },
    });
  }
}
