export const listProjectsKeys = ["projects"];
export const listTagsKeys = ["tags"];
export const listUserTodos = ["userTodos"];
export const listProjectTodos = (projectId: number) => [
  "projectTodos",
  projectId,
];
export const getTodo = (todoId: number) => ["todo", todoId];
export const getTag = (tagId: number) => ["tag", tagId];
