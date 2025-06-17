export type User = {
  id: string;
  email: string;
  profilePictureUrl: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  parentProjectId: string | null;
};
