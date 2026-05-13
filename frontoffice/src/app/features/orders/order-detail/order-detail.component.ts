import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { Order } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  orderId = '';
  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly paymentMessage = signal('');
  readonly paymentLoading = signal(false);
  readonly actionLoading = signal(false);
  ratingSupermarket = 5;
  commentSupermarket = '';
  ratingCourier = 5;
  commentCourier = '';

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe({
      next: ([paramMap, queryParamMap]) => {
        this.orderId = paramMap.get('id') || 'sem-id';
        this.order.set(null);
        this.loading.set(true);
        this.errorMessage.set('');
        this.paymentMessage.set('');

        const payment = queryParamMap.get('payment');
        const sessionId = queryParamMap.get('session_id');
        const created = queryParamMap.get('created');

        if (created === '1') {
          this.paymentMessage.set('Encomenda criada com sucesso.');
        } else if (payment === 'canceled') {
          this.paymentMessage.set('O pagamento foi cancelado.');
        } else if (payment === 'success' && sessionId) {
          this.confirmStripePayment(sessionId);
          return;
        }

        this.loadOrder();
      },
    });
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
    const order = this.order();
    return !!order && order.status === 'entregue' && !order.supermarketReview?.rating;
  }

  get canPay(): boolean {
    const order = this.order();
    return !!order && order.paymentStatus !== 'paid' && order.status !== 'cancelada';
  }

  get canCancel(): boolean {
    return Boolean(this.order()?.canCancel);
  }

  get hasCourierReview(): boolean {
    const order = this.order();
    return Boolean(order && order.deliveryMethod === 'estafeta');
  }

  get cancelDeadlineLabel(): string {
    const deadline = this.order()?.cancelDeadline;

    if (!deadline) {
      return '';
    }

    return new Date(deadline).toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  cancelOrder(): void {
    if (!this.canCancel) {
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set('');
    this.paymentMessage.set('');

    this.orderService.cancelOrder(this.orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.paymentMessage.set('Encomenda cancelada com sucesso.');
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel cancelar a encomenda.'
        );
        this.actionLoading.set(false);
      },
      complete: () => {
        this.actionLoading.set(false);
      },
    });
  }

  submitReview(): void {
    if (!this.canReview) {
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set('');
    this.paymentMessage.set('');

    this.orderService
      .submitReview(this.orderId, {
        ratingSupermarket: this.ratingSupermarket,
        commentSupermarket: this.commentSupermarket,
        ratingCourier: this.hasCourierReview ? this.ratingCourier : null,
        commentCourier: this.hasCourierReview ? this.commentCourier : '',
      })
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.paymentMessage.set('Review submetida com sucesso.');
        },
        error: (error) => {
          this.errorMessage.set(
            error?.error?.error ||
              error?.error?.message ||
              'Nao foi possivel submeter a review.'
          );
          this.actionLoading.set(false);
        },
        complete: () => {
          this.actionLoading.set(false);
        },
      });
  }

  private loadOrder(): void {
    this.loading.set(true);

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
