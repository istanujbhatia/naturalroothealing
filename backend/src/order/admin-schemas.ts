import { z } from 'zod';

const shipmentFieldsSchema = z.object({
  carrier: z.literal('DHL'),
  trackingId: z.string().trim().min(3).max(100),
  trackingUrl: z.string().trim().url().max(500),
  shippedAt: z.coerce.date(),
});

export const adminOrderStatusSchema = z.object({
  phase: z.enum(['preparation', 'delivery']),
  status: z.enum(['pending', 'being_prepared', 'prepared', 'processing', 'delivered']),
  reason: z.string().trim().min(3).max(240),
  shipment: shipmentFieldsSchema.optional(),
}).superRefine((value, context) => {
  if (value.phase === 'delivery' && value.status === 'processing' && !value.shipment) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['shipment'], message: 'DHL shipment details are required when delivery moves to processing' });
  }
});

export const cancellationSchema = z.object({ reason: z.string().trim().min(3).max(240) });

export const shipmentSchema = shipmentFieldsSchema.extend({
  reason: z.string().trim().min(3).max(240),
});
