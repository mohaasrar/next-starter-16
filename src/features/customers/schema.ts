import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "This field is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  notes: z.string().optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
