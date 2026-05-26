import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourierService, CourierReviewsResponse } from '../../../core/services/courier.service';

@Component({
  selector: 'app-courier-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './courier-reviews.component.html',
})
export class CourierReviewsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly courierService = inject(CourierService);

  readonly courierId = this.route.snapshot.paramMap.get('id') || '';
  readonly data = signal<CourierReviewsResponse | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.courierService.getCourierReviews(this.courierId).subscribe({
      next: (response: CourierReviewsResponse) => {
        this.data.set(response);
      },
      error: (err: unknown) => {
        const body = (err as any)?.error ?? (err as any);
        const message = body && typeof body === 'object'
          ? (body['error'] || body['message'])
          : undefined;

        this.errorMessage.set(
          message || 'Não foi possível carregar as reviews deste estafeta.'
        );
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }
}