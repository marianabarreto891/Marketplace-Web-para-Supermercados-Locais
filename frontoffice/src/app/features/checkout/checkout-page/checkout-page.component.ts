import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { DeliveryMethod } from '../../../core/models/delivery-method.model';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout-page.component.html',
})
export class CheckoutPageComponent {
  private readonly baseDeliveryMethods: DeliveryMethod[] = [
    {
      code: 'levantamento_loja',
      label: 'Levantamento em loja',
      deliveryCost: 0,
      description: 'Cliente recolhe a encomenda no supermercado.',
    },
    {
      code: 'estafeta',
      label: 'Entrega por estafeta',
      deliveryCost: 2.99,
      description: 'Entrega ao domicilio com custo adicional.',
    },
  ];

  selectedDeliveryMethod: DeliveryMethod['code'] | '' = '';
  couponCode = '';
  readonly errorMessage = signal('');
  readonly submitting = signal(false);

  constructor(
    public cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {}

  readonly deliveryMethods = computed(() => {
    const firstItem = this.cartService.items()[0];
    const availableMethods = firstItem?.deliveryMethods?.length
      ? firstItem.deliveryMethods
      : ['levantamento_loja', 'estafeta'];
    const deliveryCost = firstItem?.deliveryCost || 0;

    return this.baseDeliveryMethods
      .filter((method) => availableMethods.includes(method.code))
      .map((method) =>
        method.code === 'estafeta'
          ? { ...method, deliveryCost }
          : method
      );
  });

  get selectedMethod(): DeliveryMethod | undefined {
    return this.deliveryMethods().find(
      (method) => method.code === this.selectedDeliveryMethod
    );
  }

  get subtotal(): number {
    return this.cartService.subtotal();
  }

  get deliveryCost(): number {
    return this.selectedMethod?.deliveryCost || 0;
  }

  get discountApplied(): number {
    const code = this.couponCode.trim().toUpperCase();

    if (!code) {
      return 0;
    }

    if (code === 'BEMVINDO') {
      return Number((this.subtotal * 0.1).toFixed(2));
    }

    if (code === 'POUPA2') {
      return Math.min(2, this.subtotal);
    }

    if (code === 'ENTREGA0' && this.selectedMethod?.code === 'estafeta') {
      return this.deliveryCost;
    }

    return 0;
  }

  get total(): number {
    return Math.max(
      0,
      Number((this.subtotal + this.deliveryCost - this.discountApplied).toFixed(2))
    );
  }

  finalizeOrder(): void {
    this.errorMessage.set('');

    if (this.cartService.items().length === 0) {
      this.errorMessage.set(
        'Nao podes finalizar a encomenda com o carrinho vazio.'
      );
      return;
    }

    if (!this.selectedMethod) {
      this.errorMessage.set('Tens de escolher um metodo de entrega.');
      return;
    }

    this.submitting.set(true);

    this.orderService
      .createOrder({
        items: this.cartService.items(),
        deliveryMethod: this.selectedMethod.code,
        couponCode: this.couponCode.trim().toUpperCase(),
      })
      .subscribe({
        next: (order) => {
          this.cartService.clearCart();
          this.router.navigate(['/orders', order.id], {
            queryParams: { created: '1' },
          });
        },
        error: (error) => {
          this.errorMessage.set(
            error?.error?.error ||
              error?.error?.message ||
              'Nao foi possivel criar a encomenda.'
          );
          this.submitting.set(false);
        },
        complete: () => {
          this.submitting.set(false);
        },
      });
  }
}
