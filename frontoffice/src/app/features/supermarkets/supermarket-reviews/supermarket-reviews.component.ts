import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../layout/page-header/page-header.component';
import {
  ProductService,
  SupermarketReviewsResponse,
  SupermarketCouriersResponse,
} from '../../../core/services/product.service';

@Component({
  selector: 'app-supermarket-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './supermarket-reviews.component.html',
})
export class SupermarketReviewsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);

  readonly supermarketId = this.route.snapshot.paramMap.get('id') || '';
  readonly data = signal<SupermarketReviewsResponse | null>(null);
  readonly couriersData = signal<SupermarketCouriersResponse | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly activeTab = signal<'supermarket' | 'couriers'>('supermarket');

  ngOnInit(): void {
    this.productService.getSupermarketReviews(this.supermarketId).subscribe({
      next: (response) => this.data.set(response),
      error: (error) => {
        this.errorMessage.set(error?.error?.error || 'Não foi possível carregar as reviews.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });

    this.productService.getSupermarketCouriers(this.supermarketId).subscribe({
      next: (response) => this.couriersData.set(response),
      error: () => {},
    });
  }

  setTab(tab: 'supermarket' | 'couriers'): void {
    this.activeTab.set(tab);
  }
}