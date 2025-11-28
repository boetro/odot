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

export const deleteProject = async (projectId: number): Promise<void> => {
  const res = await apiRequest(`/api/projects/${projectId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to delete project");
  }
};
