import { apiRequest } from "../api";
import type { Project } from "../types";
import { listProjectsKeys } from "./keys";

export const projectQueries = {
  listProjects: () => ({
    queryKey: listProjectsKeys,
    queryFn: async () => {
      return await apiRequest("/api/projects", {
        credentials: "include",
      }).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch projects");
        }
        return res.json() as Promise<Project[]>;
      });
    },
  }),
};
