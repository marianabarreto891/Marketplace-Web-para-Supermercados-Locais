import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Order } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-history.component.html',
})
export class OrderHistoryComponent implements OnInit {
  readonly columns = ['Data', 'Supermercado', 'Estado', 'Total', 'Pagamento'];
  readonly statuses = [
    { value: 'all', label: 'Todos os estados' },
    { value: 'confirmada', label: 'Confirmada' },
    { value: 'em_preparacao', label: 'Em preparacao' },
    { value: 'em_entrega', label: 'Em entrega' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  selectedStatus = 'all';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel carregar o historico de encomendas.'
        );
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  get filteredOrders(): Order[] {
    if (this.selectedStatus === 'all') {
      return this.orders();
    }

    return this.orders().filter((order) => order.status === this.selectedStatus);
  }

  getStatusLabel(status: string): string {
    return this.orderService.getStatusLabel(status);
  }

  getPaymentStatusLabel(status: string): string {
    return this.orderService.getPaymentStatusLabel(status);
  }

  getDeliveryLabel(method: Order['deliveryMethod']): string {
    return this.orderService.getDeliveryLabel(method);
  }
}
