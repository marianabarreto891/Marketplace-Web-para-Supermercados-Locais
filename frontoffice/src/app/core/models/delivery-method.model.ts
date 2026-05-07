export interface DeliveryMethod {
  code: 'levantamento_loja' | 'estafeta';
  label: string;
  deliveryCost: number;
  description?: string;
}
