import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="rating-stars" [attr.aria-label]="ariaLabel">
      <span
        *ngFor="let star of stars"
        class="rating-star"
        [class.rating-star-filled]="star <= filledStars">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.6z" />
        </svg>
      </span>
      <span *ngIf="showScore" class="rating-score">{{ formattedRating }}/5</span>
    </span>
  `,
  styles: [`
    .rating-stars {
      display: inline-flex;
      align-items: center;
      gap: 0.18rem;
      white-space: nowrap;
    }

    .rating-star {
      display: inline-flex;
      width: 1.05rem;
      height: 1.05rem;
      color: #d6dbe3;
    }

    .rating-star svg {
      width: 100%;
      height: 100%;
      fill: currentColor;
    }

    .rating-star-filled {
      color: #f4b400;
    }

    .rating-score {
      margin-left: 0.35rem;
      color: #1f2937;
      font-weight: 700;
    }
  `],
})
export class RatingStarsComponent {
  @Input() rating = 0;
  @Input() showScore = true;
  @Input() decimals = 0;

  readonly stars = [1, 2, 3, 4, 5];

  get safeRating(): number {
    const value = Number(this.rating);
    return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  }

  get filledStars(): number {
    return Math.round(this.safeRating);
  }

  get formattedRating(): string {
    return this.safeRating.toFixed(this.decimals);
  }

  get ariaLabel(): string {
    return `${this.formattedRating} de 5 estrelas`;
  }
}
