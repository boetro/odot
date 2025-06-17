import type { Project } from "../types";
import { listProjectsKeys } from "./keys";

export const projectQueries = {
  listProjects: () => ({
    queryKey: listProjectsKeys,
    queryFn: async () => {
      return await fetch("/api/projects", {
        credentials: "include",
      }).then((res) => res.json() as Promise<Project[]>);
    },
  }),
};
