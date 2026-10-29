import { z } from "zod";

export const studentFilterSchema = z.object({
  search: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  batch: z.string().trim().max(20).optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  section: z.string().trim().max(10).optional(),
  status: z.enum(["Active", "Inactive", "Graduated"]).optional(),
  groupStatus: z.enum(["assigned", "unassigned", "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createStudentSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(150, "Email address is too long."),
  usn: z
    .string()
    .trim()
    .min(3, "USN must be at least 3 characters.")
    .max(20, "USN cannot exceed 20 characters.")
    .toUpperCase(),
  department: z
    .string()
    .trim()
    .min(2, "Department is required.")
    .max(100, "Department cannot exceed 100 characters."),
  specialization: z.string().trim().max(100).optional().nullable(),
  batch: z
    .string()
    .trim()
    .min(4, "Batch is required (e.g., 2024-2028).")
    .max(20, "Batch cannot exceed 20 characters."),
  current_semester: z
    .coerce
    .number()
    .int()
    .min(1, "Semester must be between 1 and 8.")
    .max(8, "Semester must be between 1 and 8."),
  section: z.string().trim().max(10).optional().nullable(),
  cgpa: z
    .coerce
    .number()
    .min(0, "CGPA must be between 0.00 and 10.00.")
    .max(10, "CGPA must be between 0.00 and 10.00.")
    .optional()
    .nullable(),
  phone_number: z.string().trim().max(20).optional().nullable(),
  initial_password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128)
    .optional(),
});

export const updateStudentSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().min(2).max(100).optional(),
  specialization: z.string().trim().max(100).optional().nullable(),
  batch: z.string().trim().min(4).max(20).optional(),
  current_semester: z.coerce.number().int().min(1).max(8).optional(),
  section: z.string().trim().max(10).optional().nullable(),
  cgpa: z.coerce.number().min(0).max(10).optional().nullable(),
  academic_status: z.enum(["Active", "Inactive", "Graduated"]).optional(),
  phone_number: z.string().trim().max(20).optional().nullable(),
});

