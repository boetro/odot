export type User = {
  id: string;
  email: string;
  profilePictureUrl: string;
};

export type Project = {
  id: number;
  name: string;
  description: string;
  color: string;
  parent_project_id: number | null;
};
