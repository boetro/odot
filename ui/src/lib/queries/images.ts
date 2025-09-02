export type ImageToTextResponse = {
  text: string;
};

export const imageToTextKeys = ["imageToText"];

export const imageQueries = {
  imageToText: () => ({
    queryKey: imageToTextKeys,
    queryFn: async (file: File): Promise<ImageToTextResponse> => {
      const formData = new FormData();
      formData.append("image", file);

      return await fetch("/api/image/text", {
        method: "POST",
        credentials: "include",
        body: formData,
      }).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to extract text from image");
        }
        return res.json() as Promise<ImageToTextResponse>;
      });
    },
  }),
};
