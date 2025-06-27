export type User = {
  id: string;
  email: string;
  profilePictureUrl: string;
};

export type Project = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  parent_project_id: number | null;
};

export type Todo = {
  id: number;
  title: string;
  description: string | null;
  assigned_date: Date | null;
  duration_minutes: number | null;
  parent_todo_id: number | null;
  project_id: number | null;
  completed: boolean;
};

export type FilterState = {
  showTODO: boolean;
  showCompleted: boolean;
  visibleProjectIds: Record<number, boolean>;
  showWithNoProject: boolean;
};

export type Ordering = "title" | "assignedDate" | "status";
export type Grouping = "project" | "status" | null;
export type SortDirection = "asc" | "desc";
export type View = "list" | "board";

export type LocalStorageState = {
  filters: FilterState;
  grouping: Grouping;
  ordering: Ordering;
  sortDirection: SortDirection;
  view: View;
};
