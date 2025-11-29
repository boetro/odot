import { Views, type View as CalendarView } from "react-big-calendar";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Ordering = "title" | "scheduledDate" | "status";
export type Grouping = "project" | "status" | "tag" | null;
export type SortDirection = "asc" | "desc";
export type View = "list" | "board" | "calendar";

export type FilterState = {
  showTODO: boolean;
  showCompleted: boolean;
  visibleProjectIds: Record<number, boolean> | null;
  showWithNoProject: boolean;
  showChildProjectTodos: boolean;
  visibleTagIds: Record<number, boolean> | null;
  showWithNoTags: boolean;
};

export type TodoViewState = {
  filters: FilterState;
  grouping: Grouping;
  ordering: Ordering;
  sortDirection: SortDirection;
  view: View;
  calendarView: CalendarView;
  setGrouping: (grouping: Grouping) => void;
  setOrdering: (ordering: Ordering) => void;
  setSortDirection: (sortDirection: SortDirection) => void;
  setView: (view: View) => void;
  setCalendarView: (calendarView: CalendarView) => void;
  setShowTODO: (showTODO: boolean) => void;
  setShowCompleted: (showCompleted: boolean) => void;
  addVisibleProjectId: (projectId: number) => void;
  removeVisibleProjectId: (projectId: number) => void;
  setShowWithNoProject: (showWithNoProject: boolean) => void;
  setShowChildProjectTodos: (showChildProjectTodos: boolean) => void;
  addVisibleTagId: (tagId: number) => void;
  removeVisibleTagId: (tagId: number) => void;
  setShowWithNoTags: (showWithNoTags: boolean) => void;
};

export const createTodoViewStore = (storageId: string = "todo-view-storage") =>
  create<TodoViewState>()(
    persist(
      (set) => ({
        filters: {
          showTODO: true,
          showCompleted: false,
          visibleProjectIds: null,
          showWithNoProject: true,
          showChildProjectTodos: false,
          visibleTagIds: null,
          showWithNoTags: true,
        },
        grouping: null,
        ordering: "status",
        sortDirection: "asc",
        view: "list",
        calendarView: Views.MONTH,
        setGrouping: (grouping: Grouping) => set({ grouping }),
        setOrdering: (ordering: Ordering) => set({ ordering }),
        setSortDirection: (sortDirection: SortDirection) =>
          set({ sortDirection }),
        setView: (view: View) =>
          set((state) => ({
            view,
            grouping:
              state.grouping === null && view === "board"
                ? "project"
                : state.grouping,
          })),
        setCalendarView: (calendarView: CalendarView) =>
          set({ calendarView }),
        setShowTODO: (showTODO: boolean) =>
          set((state) => ({
            filters: { ...state.filters, showTODO },
          })),
        setShowCompleted: (showCompleted: boolean) =>
          set((state) => ({
            filters: { ...state.filters, showCompleted },
          })),
        addVisibleProjectId: (projectId: number) =>
          set((state) => ({
            filters: {
              ...state.filters,
              visibleProjectIds: {
                ...(state.filters.visibleProjectIds || {}),
                [projectId]: true,
              },
            },
          })),
        removeVisibleProjectId: (projectId: number) =>
          set((state) => {
            const newVisibleProjectIds = {
              ...(state.filters.visibleProjectIds || {}),
            };
            delete newVisibleProjectIds[projectId];
            return {
              filters: {
                ...state.filters,
                visibleProjectIds: newVisibleProjectIds,
              },
            };
          }),
        setShowWithNoProject: (showWithNoProject: boolean) =>
          set((state) => ({
            filters: { ...state.filters, showWithNoProject },
          })),
        setShowChildProjectTodos: (showChildProjectTodos: boolean) =>
          set((state) => ({
            filters: { ...state.filters, showChildProjectTodos },
          })),
        addVisibleTagId: (tagId: number) =>
          set((state) => ({
            filters: {
              ...state.filters,
              visibleTagIds: {
                ...(state.filters.visibleTagIds || {}),
                [tagId]: true,
              },
            },
          })),
        removeVisibleTagId: (tagId: number) =>
          set((state) => {
            const newVisibleTagIds = {
              ...(state.filters.visibleTagIds || {}),
            };
            delete newVisibleTagIds[tagId];
            return {
              filters: {
                ...state.filters,
                visibleTagIds: newVisibleTagIds,
              },
            };
          }),
        setShowWithNoTags: (showWithNoTags: boolean) =>
          set((state) => ({
            filters: { ...state.filters, showWithNoTags },
          })),
      }),
      {
        name: storageId,
        storage: createJSONStorage(() => localStorage),
      },
    ),
  );

export const useTodoView = createTodoViewStore();
