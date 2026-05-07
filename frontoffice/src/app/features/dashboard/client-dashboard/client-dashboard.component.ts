import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardStats } from '../../../core/models/dashboard-stats.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-dashboard.component.html',
})
export class ClientDashboardComponent implements OnInit {
  private readonly orderService = inject(OrderService);

  readonly stats = signal<DashboardStats>({
    totalOrders: 0,
    totalSpent: 0,
    mostPurchasedProducts: [],
    recentOrders: [],
  });
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.orderService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel carregar o dashboard do cliente.'
        );
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  getStatusLabel(status: string): string {
    return this.orderService.getStatusLabel(status);
  }
}
