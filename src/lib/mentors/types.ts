/**
 * TypeScript types for CPMS Capstone Mentor Management.
 */

export const MENTOR_ROLES = ["Primary", "Co-Mentor"] as const;
export type MentorRole = (typeof MENTOR_ROLES)[number];

export const MENTOR_AVAILABILITY = ["Available", "Unavailable"] as const;
export type MentorAvailability = (typeof MENTOR_AVAILABILITY)[number];

export const ALLOCATION_STATUSES = ["Active", "Ended"] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export interface MentorAssignedProject {
  project_id: number;
  project_title: string;
  project_status: string;
  group_name: string;
  mentor_role: MentorRole;
  allocation_status: AllocationStatus;
  allocation_date: string | Date;
}

export interface MentorListItem {
  mentor_id: number;
  user_id: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  department: string;
  designation: string | null;
  specialization: string | null;
  years_of_experience: number;
  max_projects: number;
  availability_status: MentorAvailability;
  office_location: string | null;
  active_projects_count: number;
  completed_projects_count: number;
  assigned_projects: MentorAssignedProject[];
}

export interface MentorAllocationRecord {
  allocation_id: number;
  project_id: number;
  project_title: string;
  project_status: string;
  group_id: number;
  group_name: string;
  department: string;
  academic_year: string;
  team_leader_name: string;
  team_leader_usn: string;
  mentor_role: MentorRole;
  allocation_status: AllocationStatus;
  allocation_date: string | Date;
  end_date: string | Date | null;
  remarks: string | null;
  allocated_by: number;
  allocated_by_name: string | null;
}

export interface MentorDetails extends MentorListItem {
  allocations: MentorAllocationRecord[];
}

export interface MentorFilterParams {
  search?: string;
  department?: string;
  specialization?: string;
  availability?: MentorAvailability;
  hasCapacity?: boolean;
}

export interface MentorStats {
  totalMentors: number;
  availableMentors: number;
  unavailableMentors: number;
  activeAllocationsCount: number;
  primaryAllocationsCount: number;
  coMentorAllocationsCount: number;
  avgWorkload: number;
}

export interface AssignMentorInput {
  project_id: number;
  mentor_id: number;
  mentor_role: MentorRole;
  remarks?: string | null;
}

export interface UpdateMentorInput {
  max_projects?: number;
  availability_status?: MentorAvailability;
  designation?: string | null;
  specialization?: string | null;
  office_location?: string | null;
  years_of_experience?: number;
}

export interface EndAllocationInput {
  allocation_id: number;
  remarks?: string | null;
}

