import { type View as CalendarView } from "react-big-calendar";

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
  scheduled_date: Date | null;
  duration_minutes: number | null;
  parent_todo_id: number | null;
  project_id: number | null;
  completed: boolean;
};

export interface CalendarProps {
  todos: Todo[];
  onTodoSelect?: (todo: Todo) => void;
  onSlotSelect?: (slotInfo: { start: Date; end: Date }) => void;
  className?: string;
  selectedView: CalendarView;
  setSelectedView: (view: CalendarView) => void;
}
