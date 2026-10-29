/**
 * TypeScript types for CPMS Group Management.
 */

export type GroupStatus = "Forming" | "Active" | "Completed" | "Disbanded";
export type MemberRole = "Leader" | "Member";
export type MembershipStatus = "Active" | "Inactive";

export interface GroupListItem {
  group_id: number;
  group_name: string;
  batch: string;
  department: string;
  academic_year: string;
  formation_date: string | Date;
  group_status: GroupStatus;
  team_leader_id: number;
  leader_name: string;
  leader_usn: string;
  leader_email: string;
  team_size: number;
  active_member_count: number;
  project_id: number | null;
  project_title: string | null;
  project_status: string | null;
}

export interface GroupMemberDetail {
  group_member_id: number;
  student_id: number;
  usn: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  current_semester: number | null;
  section: string | null;
  member_role: MemberRole;
  membership_status: MembershipStatus;
  joined_at: string | Date;
  left_at: string | Date | null;
}

export interface GroupCapstoneProject {
  project_id: number;
  group_id: number;
  project_title: string;
  project_status: string;
  project_domain: string | null;
  project_type: string | null;
  problem_statement: string | null;
  objectives: string | null;
  technology_stack: string | null;
}

export interface GroupDetails extends GroupListItem {
  members: GroupMemberDetail[];
  capstone_project: GroupCapstoneProject | null;
}

export interface GroupFilterParams {
  search?: string;
  department?: string;
  batch?: string;
  academic_year?: string;
  status?: GroupStatus;
  page?: number;
  limit?: number;
}

export interface GroupStats {
  totalGroups: number;
  activeGroups: number;
  formingGroups: number;
  completedGroups: number;
  averageTeamSize: number;
}

export interface CreateGroupInput {
  group_name: string;
  batch: string;
  department: string;
  academic_year: string;
  team_leader_id: number;
  member_ids: number[];
  project_title?: string | null;
  project_domain?: string | null;
}

export interface AddGroupMemberInput {
  group_id: number;
  student_id: number;
  member_role?: MemberRole;
}
