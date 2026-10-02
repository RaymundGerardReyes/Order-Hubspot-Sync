import { z } from 'zod';

export interface CustomerPayload {
  email: string;
  name?: string;
}

export interface OrderItemPayload {
  sku: string;
  name?: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderPayload {
  orderId: string;
  customer: CustomerPayload;
  items: OrderItemPayload[];
  totalAmount: number;
  currency: string;
  createdAt?: string;
}

export const OrderPayloadSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  customer: z.object({
    email: z.string().email('Invalid customer email address'),
    name: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        sku: z.string().min(1, 'Item sku is required'),
        name: z.string().optional(),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        unitPrice: z.number().min(0, 'UnitPrice cannot be negative'),
      })
    )
    .min(1, 'Order must contain at least one item'),
  totalAmount: z.number().min(0, 'totalAmount cannot be negative'),
  currency: z.string().length(3).default('USD'),
  createdAt: z.string().datetime().optional(),
});
