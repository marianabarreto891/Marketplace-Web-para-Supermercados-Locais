import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../layout/page-header/page-header.component';
import { Order } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
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

  readonly PAGE_SIZE = 5;

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly actionOrderId = signal('');
  selectedStatus = 'all';
  currentPage = 1;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.currentPage = 1;
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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOrders.length / this.PAGE_SIZE));
  }

  get pagedOrders(): Order[] {
    const start = (this.currentPage - 1) * this.PAGE_SIZE;
    return this.filteredOrders.slice(start, start + this.PAGE_SIZE);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onStatusChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
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

  cancelOrder(orderId: string): void {
    this.actionOrderId.set(orderId);
    this.errorMessage.set('');

    this.orderService.cancelOrder(orderId).subscribe({
      next: (updatedOrder) => {
        this.orders.update((orders) =>
          orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
        );
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel cancelar a encomenda.'
        );
        this.actionOrderId.set('');
      },
      complete: () => {
        this.actionOrderId.set('');
      },
    });
  }
}