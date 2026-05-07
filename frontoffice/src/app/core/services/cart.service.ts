import { Injectable, computed, signal } from '@angular/core';
import { CartItem } from '../models/cart-item.model';
import { Product } from './product.service';

export interface CartActionResult {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'paw_frontoffice_cart';
  private readonly itemsSignal = signal<CartItem[]>(this.loadCart());

  readonly items = this.itemsSignal.asReadonly();
  readonly itemCount = computed(() =>
    this.itemsSignal().reduce((total, item) => total + item.quantity, 0)
  );
  readonly subtotal = computed(() =>
    this.itemsSignal().reduce(
      (total, item) => total + item.price * item.quantity,
      0
    )
  );
  readonly supermarketName = computed(
    () => this.itemsSignal()[0]?.supermarketName || ''
  );

  addProduct(product: Product): CartActionResult {
    if (!product.supermarket?._id) {
      return {
        success: false,
        message: 'Este produto nao tem supermercado associado.',
      };
    }

    if (product.stock <= 0) {
      return {
        success: false,
        message: 'Este produto esta esgotado.',
      };
    }

    const currentItems = [...this.itemsSignal()];
    const currentSupermarketId = currentItems[0]?.supermarketId;

    if (
      currentSupermarketId &&
      currentSupermarketId !== product.supermarket._id
    ) {
      return {
        success: false,
        message:
          'So podes ter produtos de um supermercado por encomenda.',
      };
    }

    const existingItem = currentItems.find(
      (item) => item.productId === product._id
    );

    if (existingItem) {
      if (existingItem.quantity >= existingItem.stock) {
        return {
          success: false,
          message: 'Ja atingiste o stock maximo disponivel deste produto.',
        };
      }

      existingItem.quantity += 1;
    } else {
      currentItems.push({
        productId: product._id,
        supermarketId: product.supermarket._id,
        supermarketName: product.supermarket.name,
        name: product.name,
        description: product.description,
        image: product.image,
        price: product.price,
        quantity: 1,
        stock: product.stock,
        deliveryMethods: product.supermarket.deliveryMethods || [
          'levantamento_loja',
        ],
        deliveryCost: product.supermarket.deliveryCost || 0,
      });
    }

    this.persistCart(currentItems);

    return {
      success: true,
      message: `${product.name} foi adicionado ao carrinho.`,
    };
  }

  increaseQuantity(productId: string): void {
    const updatedItems = this.itemsSignal().map((item) => {
      if (item.productId !== productId) {
        return item;
      }

      return {
        ...item,
        quantity: Math.min(item.quantity + 1, item.stock),
      };
    });

    this.persistCart(updatedItems);
  }

  decreaseQuantity(productId: string): void {
    const updatedItems = this.itemsSignal().map((item) => {
      if (item.productId !== productId) {
        return item;
      }

      return {
        ...item,
        quantity: Math.max(item.quantity - 1, 1),
      };
    });

    this.persistCart(updatedItems);
  }

  updateQuantity(productId: string, quantity: number): void {
    const normalizedQuantity = Number.isFinite(quantity)
      ? Math.max(1, Math.floor(quantity))
      : 1;

    const updatedItems = this.itemsSignal().map((item) => {
      if (item.productId !== productId) {
        return item;
      }

      return {
        ...item,
        quantity: Math.min(normalizedQuantity, item.stock),
      };
    });

    this.persistCart(updatedItems);
  }

  removeProduct(productId: string): void {
    const updatedItems = this.itemsSignal().filter(
      (item) => item.productId !== productId
    );
    this.persistCart(updatedItems);
  }

  clearCart(): void {
    this.persistCart([]);
  }

  private loadCart(): CartItem[] {
    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistCart(items: CartItem[]): void {
    this.itemsSignal.set(items);
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}
