import { z } from 'zod';

export interface CustomerPayload {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface OrderItemPayload {
  sku: string;
  name?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  price?: number;
}

export interface OrderPayload {
  event?: string;
  orderId: string;
  order_id?: string;
  customer: CustomerPayload;
  items: OrderItemPayload[];
  totalAmount: number;
  total?: number;
  total_amount?: number;
  currency: string;
  createdAt?: string;
  created_at?: string;
}

const ItemSchema = z
  .object({
    sku: z.string().min(1, 'Item sku is required'),
    name: z.string().optional(),
    quantity: z.number().int().min(1).optional(),
    qty: z.number().int().min(1).optional(),
    unitPrice: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
  })
  .refine((item) => item.quantity !== undefined || item.qty !== undefined, {
    message: 'Item quantity or qty must be specified and at least 1',
    path: ['quantity'],
  })
  .refine((item) => item.unitPrice !== undefined || item.price !== undefined, {
    message: 'Item price or unitPrice must be specified',
    path: ['unitPrice'],
  })
  .transform((item) => ({
    sku: item.sku,
    name: item.name,
    quantity: item.quantity ?? item.qty ?? 1,
    unitPrice: item.unitPrice ?? item.price ?? 0,
    qty: item.qty ?? item.quantity ?? 1,
    price: item.price ?? item.unitPrice ?? 0,
  }));

export const OrderPayloadSchema = z
  .object({
    event: z.string().optional(),
    orderId: z.string().optional(),
    order_id: z.string().optional(),
    customer: z.object({
      email: z.string().email('Invalid customer email address'),
      name: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      phone: z.string().optional(),
    }),
    items: z.array(ItemSchema).min(1, 'Order must contain at least one item'),
    total: z.number().min(0).optional(),
    total_amount: z.number().min(0).optional(),
    totalAmount: z.number().min(0).optional(),
    currency: z.string().length(3).default('USD'),
    createdAt: z.string().optional(),
    created_at: z.string().optional(),
  })
  .refine((data) => Boolean(data.orderId || data.order_id), {
    message: 'orderId or order_id is required',
    path: ['orderId'],
  })
  .refine(
    (data) =>
      data.total !== undefined ||
      data.total_amount !== undefined ||
      data.totalAmount !== undefined,
    {
      message: 'total, total_amount, or totalAmount is required',
      path: ['totalAmount'],
    }
  )
  .transform((data) => {
    const orderId = (data.orderId || data.order_id) as string;
    const totalAmount = (data.totalAmount ?? data.total ?? data.total_amount ?? 0) as number;
    const createdAt = data.createdAt || data.created_at;

    const customerName =
      data.customer.name ||
      [data.customer.first_name, data.customer.last_name].filter(Boolean).join(' ') ||
      'Guest Customer';

    return {
      event: data.event,
      orderId,
      order_id: orderId,
      customer: {
        ...data.customer,
        name: customerName,
      },
      items: data.items,
      totalAmount,
      total: totalAmount,
      total_amount: totalAmount,
      currency: data.currency,
      createdAt,
      created_at: createdAt,
    };
  });
