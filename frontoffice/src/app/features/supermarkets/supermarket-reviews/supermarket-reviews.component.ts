import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ProductService,
  SupermarketReviewsResponse,
} from '../../../core/services/product.service';

@Component({
  selector: 'app-supermarket-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './supermarket-reviews.component.html',
})
export class SupermarketReviewsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);

  readonly supermarketId = this.route.snapshot.paramMap.get('id') || '';
  readonly data = signal<SupermarketReviewsResponse | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.productService.getSupermarketReviews(this.supermarketId).subscribe({
      next: (response) => {
        this.data.set(response);
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel carregar as reviews deste supermercado.'
        );
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  get stars(): number[] {
    return [1, 2, 3, 4, 5];
  }
}
