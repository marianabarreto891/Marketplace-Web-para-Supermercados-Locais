import { DeliveryMethod } from './delivery-method.model';
import { OrderItem } from './order-item.model';

export interface Order {
  id: string;
  displayId?: string;
  customerId: string;
  supermarketId: string;
  supermarketName: string;
  items: OrderItem[];
  status: string;
  paymentStatus: string;
  subtotal: number;
  deliveryCost: number;
  discountApplied: number;
  total: number;
  deliveryMethod: DeliveryMethod['code'];
  couponCode?: string;
  createdAt: string;
  paidAt?: string;
}
