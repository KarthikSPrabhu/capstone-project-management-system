/**
 * TypeScript types for CPMS Student Management.
 */

export type AcademicStatus = "Active" | "Inactive" | "Graduated";

export interface StudentListItem {
  student_id: number;
  user_id: number;
  usn: string;
  full_name: string;
  email: string;
  department: string;
  specialization: string | null;
  batch: string;
  current_semester: number | null;
  section: string | null;
  cgpa: number | string | null;
  academic_status: AcademicStatus;
  active_group_id: number | null;
  active_group_name: string | null;
  group_role: "Leader" | "Member" | null;
}

export interface StudentGroupMemberSummary {
  student_id: number;
  usn: string;
  full_name: string;
  email: string;
  member_role: "Leader" | "Member";
}

export interface StudentActiveGroup {
  group_id: number;
  group_name: string;
  department: string;
  batch: string;
  academic_year: string;
  formation_date: string | Date;
  group_status: string;
  member_role: "Leader" | "Member";
  project_id: number | null;
  project_title: string | null;
  project_status: string | null;
  members: StudentGroupMemberSummary[];
}

export interface StudentPastGroup {
  group_id: number;
  group_name: string;
  member_role: "Leader" | "Member";
  membership_status: "Active" | "Inactive";
  joined_at: string | Date;
  left_at: string | Date | null;
}

export interface StudentDetails extends StudentListItem {
  phone_number: string | null;
  created_at: string | Date;
  active_group: StudentActiveGroup | null;
  past_groups: StudentPastGroup[];
}

export interface StudentFilterParams {
  search?: string;
  department?: string;
  batch?: string;
  semester?: number;
  section?: string;
  status?: AcademicStatus;
  groupStatus?: "assigned" | "unassigned" | "all";
  page?: number;
  limit?: number;
}

export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  assignedStudents: number;
  unassignedStudents: number;
}

export interface CreateStudentInput {
  full_name: string;
  email: string;
  usn: string;
  department: string;
  specialization?: string | null;
  batch: string;
  current_semester: number;
  section?: string | null;
  cgpa?: number | null;
  phone_number?: string | null;
  initial_password?: string;
}

export interface UpdateStudentInput {
  full_name?: string;
  department?: string;
  specialization?: string | null;
  batch?: string;
  current_semester?: number;
  section?: string | null;
  cgpa?: number | null;
  academic_status?: AcademicStatus;
  phone_number?: string | null;
}
