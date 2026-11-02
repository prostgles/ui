export const downloadMediaFile = async (
  url: string,
  name: string | undefined,
  withCredentials: boolean,
) => {
  const response = await fetch(url, {
    credentials: withCredentials ? "include" : "same-origin",
  });
  if (!response.ok) {
    throw new Error(`Failed to download file (${response.status})`);
  }
  const downloadUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = name ?? "download";
  link.click();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};
