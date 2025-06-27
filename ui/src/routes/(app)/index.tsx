import TodosView from "@/components/todos-view";
import { projectQueries } from "@/lib/queries/projects";
import { todoQueries } from "@/lib/queries/todos";
import type { LocalStorageState } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLocalStorage } from "react-use";

export const Route = createFileRoute("/(app)/")({
  component: Index,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(todoQueries.listUserTodos());
  },
});

function Index() {
  const { data: todos, isLoading: todosLoading } = useQuery(
    todoQueries.listUserTodos(),
  );
  const { data: projects, isLoading: projectsLoading } = useQuery(
    projectQueries.listProjects(),
  );

  const [localState, setLocalState] = useLocalStorage<LocalStorageState>(
    "view::index",
    {
      filters: {
        showTODO: true,
        showCompleted: false,
        visibleProjectIds: {},
        showWithNoProject: true,
      },
      grouping: null,
      ordering: "status",
      sortDirection: "asc",
      view: "list",
    },
  );

  useEffect(() => {
    if (projects && projects.length > 0) {
      const currentVisibleIds = localState?.filters?.visibleProjectIds || {};
      const newVisibleIds = { ...currentVisibleIds };
      let hasNewProjects = false;

      // Add projects that are not already present
      projects.forEach((proj) => {
        if (!(proj.id in newVisibleIds)) {
          newVisibleIds[proj.id] = true;
          hasNewProjects = true;
        }
      });

      if (hasNewProjects) {
        setLocalState((prev) => ({
          filters: {
            ...prev?.filters,
            showTODO: prev?.filters?.showTODO ?? true,
            showCompleted: prev?.filters?.showCompleted ?? false,
            visibleProjectIds: newVisibleIds,
            showWithNoProject: prev?.filters?.showWithNoProject ?? true,
          },
          grouping: prev?.grouping ?? null,
          ordering: prev?.ordering ?? "status",
          sortDirection: prev?.sortDirection ?? "asc",
          view: prev?.view ?? "list",
        }));
      }
    }
  }, [projects, localState?.filters?.visibleProjectIds, setLocalState]);

  return (
    <div>
      {todosLoading || projectsLoading || localState === undefined ? (
        <div>Loading...</div>
      ) : (
        <TodosView
          todos={todos || []}
          projects={projects || []}
          localState={localState}
          setLocalState={setLocalState}
        />
      )}
    </div>
  );
}
