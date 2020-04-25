export const generateKey = (comps: { readonly [key: string]: string | undefined }): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(comps)) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }
  return params.toString();
};
