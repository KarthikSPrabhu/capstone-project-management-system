import { z } from "zod";
import { MENTOR_ROLES, MENTOR_AVAILABILITY } from "./types";

export const assignMentorSchema = z.object({
  project_id: z.coerce.number().int().positive("Invalid project ID"),
  mentor_id: z.coerce.number().int().positive("Invalid mentor ID"),
  mentor_role: z.enum(MENTOR_ROLES, {
    message: "Role must be either Primary or Co-Mentor",
  }),
  remarks: z.string().max(500, "Remarks cannot exceed 500 characters").optional().nullable(),
});

export const updateMentorSchema = z
  .object({
    max_projects: z.coerce
      .number()
      .int("Max projects must be an integer")
      .min(1, "Max projects must be at least 1")
      .max(20, "Max projects cannot exceed 20")
      .optional(),
    availability_status: z.enum(MENTOR_AVAILABILITY).optional(),
    designation: z.string().max(100).optional().nullable(),
    specialization: z.string().max(150).optional().nullable(),
    office_location: z.string().max(100).optional().nullable(),
    years_of_experience: z.coerce.number().int().min(0).max(60).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const endAllocationSchema = z.object({
  allocation_id: z.coerce.number().int().positive("Invalid allocation ID"),
  remarks: z.string().max(500, "Remarks cannot exceed 500 characters").optional().nullable(),
});

export const mentorFilterSchema = z.object({
  search: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  specialization: z.string().max(150).optional(),
  availability: z.enum(MENTOR_AVAILABILITY).optional(),
  hasCapacity: z.enum(["true", "false"]).optional(),
});

