import { apiRequest } from "../api";
import type { Tag } from "../types";
import { listTagsKeys, listUserTodos } from "./keys";
import type { QueryClient } from "@tanstack/react-query";

export const tagQueries = {
  listTags: () => ({
    queryKey: listTagsKeys,
    queryFn: async () => {
      return await apiRequest("/api/tags", {
        credentials: "include",
      }).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch tags");
        }
        return res.json() as Promise<Tag[]>;
      });
    },
  }),
};

export const tagMutations = {
  createTag: (queryClient: QueryClient) => ({
    mutationFn: async (newTag: { name: string; color: string }) => {
      const res = await apiRequest("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newTag),
      });
      if (!res.ok) {
        throw new Error("Failed to create tag");
      }
      return res.json() as Promise<Tag>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listTagsKeys });
    },
  }),

  updateTag: (queryClient: QueryClient) => ({
    mutationFn: async ({
      id,
      name,
      color,
    }: {
      id: number;
      name: string;
      color: string;
    }) => {
      const res = await apiRequest(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        throw new Error("Failed to update tag");
      }
      return res.json() as Promise<Tag>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listTagsKeys });
    },
  }),

  deleteTag: (queryClient: QueryClient) => ({
    mutationFn: async (tagId: number) => {
      const res = await apiRequest(`/api/tags/${tagId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to delete tag");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listTagsKeys });
      // Also invalidate todos since they may have this tag
      queryClient.invalidateQueries({ queryKey: listUserTodos });
    },
  }),
};
