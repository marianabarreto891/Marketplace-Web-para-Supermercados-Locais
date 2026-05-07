import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart-page.component.html',
})
export class CartPageComponent {
  constructor(public cartService: CartService) {}

  updateQuantity(productId: string, value: string): void {
    this.cartService.updateQuantity(productId, Number(value));
  }
}
