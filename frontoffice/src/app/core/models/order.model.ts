import { DeliveryMethod } from './delivery-method.model';
import { OrderItem } from './order-item.model';

export interface OrderReview {
  rating: number;
  comment: string;
}

export interface Order {
  id: string;
  displayId?: string;
  customerId: string;
  supermarketId: string;
  supermarketName: string;
  supermarketLocation?: string;
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
  canCancel?: boolean;
  cancelDeadline?: string | null;
  supermarketReview?: OrderReview | null;
  courierReview?: OrderReview | null;
  refundRequested?: boolean;
  refundRequestedAt?: string;
}
