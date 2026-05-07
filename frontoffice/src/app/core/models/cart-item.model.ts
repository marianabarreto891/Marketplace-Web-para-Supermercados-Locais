export interface CartItem {
  productId: string;
  supermarketId: string;
  supermarketName: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  quantity: number;
  stock: number;
  deliveryMethods?: Array<'levantamento_loja' | 'estafeta'>;
  deliveryCost?: number;
}
