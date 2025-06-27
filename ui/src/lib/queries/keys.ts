export const listProjectsKeys = ["projects"];
export const listUserTodos = ["userTodos"];
export const listProjectTodos = (projectId: number) => [
  "projectTodos",
  projectId,
];
