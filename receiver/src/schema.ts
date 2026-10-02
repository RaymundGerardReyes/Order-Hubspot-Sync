import { z } from 'zod';

// ISO-8601 with mandatory timezone offset (e.g. +08:00 or Z)
const iso8601WithOffset = z.string().refine(
  (val) => {
    // Must contain a timezone offset: Z, +HH:MM, or -HH:MM
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(val) &&
      !isNaN(Date.parse(val));
  },
  { message: 'created_at must be a valid ISO 8601 timestamp with a timezone offset' }
);

export interface CustomerPayload {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface OrderItemPayload {
  sku: string;
  name: string;
  quantity: number;
  qty: number;
  unitPrice: number;
  price: number;
}

export interface OrderPayload {
  event: string;
  orderId: string;
  order_id: string;
  customer: CustomerPayload;
  items: OrderItemPayload[];
  totalAmount: number;
  total: number;
  total_amount: number;
  currency: string;
  createdAt: string;
  created_at: string;
}

const ItemSchema = z
  .object({
    sku: z.string().min(1, 'Item sku is required'),
    name: z.string().min(1, 'Item name is required'),
    quantity: z.number().int().min(1).optional(),
    qty: z.number().int().min(1).optional(),
    unitPrice: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
  })
  .refine((item) => (item.quantity ?? item.qty ?? 0) >= 1, {
    message: 'Item qty must be >= 1',
    path: ['qty'],
  })
  .refine((item) => item.unitPrice !== undefined || item.price !== undefined, {
    message: 'Item price or unitPrice must be specified and >= 0',
    path: ['price'],
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
    // event must be exactly "order.created" (analysis doc §Payload validation)
    event: z.literal('order.created', {
      errorMap: () => ({ message: 'event must be exactly "order.created"' }),
    }),
    // Support both camelCase (orderId) and snake_case (order_id); 1–100 chars
    orderId: z.string().min(1).max(100).optional(),
    order_id: z.string().min(1).max(100).optional(),
    customer: z.object({
      email: z.string().email('Invalid customer email address'),
      name: z.string().optional(),
      // first_name and last_name must be non-empty strings when provided
      first_name: z.string().min(1, 'first_name must be a non-empty string').optional(),
      last_name: z.string().min(1, 'last_name must be a non-empty string').optional(),
      phone: z.string().optional(),
    }),
    items: z.array(ItemSchema).min(1, 'Order must contain at least one item'),
    total: z.number().min(0).optional(),
    total_amount: z.number().min(0).optional(),
    totalAmount: z.number().min(0).optional(),
    // currency: 3-letter uppercase code (PHP, USD, etc.)
    currency: z
      .string()
      .length(3, 'currency must be a 3-letter code')
      .regex(/^[A-Z]{3}$/, 'currency must be uppercase (e.g. PHP)')
      .default('USD'),
    // created_at must be ISO 8601 with timezone offset
    createdAt: iso8601WithOffset.optional(),
    created_at: iso8601WithOffset.optional(),
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
  .refine(
    (data) => {
      // Total cross-validation using integer minor units (avoids float rounding)
      // analysis doc: computed_total_minor = sum(qty × rounded_item_price_minor)
      const providedTotal = data.totalAmount ?? data.total ?? data.total_amount ?? 0;
      const providedMinor = Math.round(providedTotal * 100);
      const computedMinor = data.items.reduce((sum, item) => {
        const itemMinor = Math.round(item.price * 100);
        return sum + item.qty * itemMinor;
      }, 0);
      return providedMinor === computedMinor;
    },
    {
      message: 'total does not match the sum of item quantities × prices',
      path: ['total'],
    }
  )
  .transform((data) => {
    const orderId = (data.orderId || data.order_id) as string;
    const totalAmount = (data.totalAmount ?? data.total ?? data.total_amount ?? 0) as number;
    const createdAt = (data.createdAt || data.created_at) as string;

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
