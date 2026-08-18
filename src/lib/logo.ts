import { uploadLogo } from "@/app/actions/upload";

export function isRemoteLogoUrl(url: string | null | undefined): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export async function applyLogoToFormData(
  formData: FormData,
  existingLogoUrl?: string | null
): Promise<void> {
  const source = String(formData.get("logoSource") ?? "upload");
  const remoteUrl = String(formData.get("logoRemoteUrl") ?? "").trim();

  if (source === "url") {
    if (remoteUrl) {
      if (!/^https?:\/\//i.test(remoteUrl)) {
        throw new Error("Logo URL must start with http:// or https://.");
      }
      formData.set("logoUrl", remoteUrl);
      return;
    }
    if (existingLogoUrl) {
      formData.set("logoUrl", existingLogoUrl);
    }
    return;
  }

  const logoFile = formData.get("logo") as File | null;
  if (logoFile && logoFile.size > 0) {
    const uploadData = new FormData();
    uploadData.set("logo", logoFile);
    const logoUrl = await uploadLogo(uploadData);
    if (logoUrl) formData.set("logoUrl", logoUrl);
    return;
  }

  if (existingLogoUrl) {
    formData.set("logoUrl", existingLogoUrl);
  }
}
