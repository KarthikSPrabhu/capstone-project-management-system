import { z } from "zod";

export const groupFilterSchema = z.object({
  search: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  batch: z.string().trim().max(20).optional(),
  academic_year: z.string().trim().max(9).optional(),
  status: z.enum(["Forming", "Active", "Completed", "Disbanded"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createGroupSchema = z
  .object({
    group_name: z
      .string()
      .trim()
      .min(2, "Group name must be at least 2 characters.")
      .max(100, "Group name cannot exceed 100 characters."),
    department: z
      .string()
      .trim()
      .min(2, "Department is required.")
      .max(100, "Department cannot exceed 100 characters."),
    batch: z
      .string()
      .trim()
      .min(4, "Batch is required (e.g., 2024-2028).")
      .max(20, "Batch cannot exceed 20 characters."),
    academic_year: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Academic year must follow format YYYY-YYYY (e.g., 2026-2027)."),
    team_leader_id: z.coerce.number().int().positive("Team leader is required."),
    member_ids: z
      .array(z.coerce.number().int().positive())
      .min(1, "A group must have at least one member.")
      .max(4, "A group cannot have more than four active members."),
    project_title: z
      .string()
      .trim()
      .min(3, "Project title must be at least 3 characters.")
      .max(200, "Project title cannot exceed 200 characters.")
      .optional()
      .nullable(),
    project_domain: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // De-duplicate member_ids
      const unique = new Set(data.member_ids);
      return unique.size === data.member_ids.length;
    },
    {
      message: "Duplicate student IDs detected in member list.",
      path: ["member_ids"],
    }
  )
  .refine(
    (data) => data.member_ids.includes(data.team_leader_id),
    {
      message: "Team leader must be one of the selected group members.",
      path: ["team_leader_id"],
    }
  );

export const addMemberSchema = z.object({
  student_id: z.coerce.number().int().positive("Valid student ID required."),
  member_role: z.enum(["Leader", "Member"]).default("Member"),
});

export const updateGroupStatusSchema = z.object({
  group_status: z.enum(["Forming", "Active", "Completed", "Disbanded"]),
});

