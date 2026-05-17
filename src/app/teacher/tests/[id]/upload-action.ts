"use server";

export async function uploadToCloudinary(base64Image: string) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: base64Image,
        upload_preset: "assessflow",
        api_key: "861812633622351",
        public_id: `pasted-image-${Date.now()}`,
        filename_override: "screenshot.png"
      }),
    });

    const data = await res.json();
    
    if (res.ok && data.secure_url) {
      return { success: true, url: data.secure_url };
    } else {
      console.error("Cloudinary Server Error:", data);
      return { success: false, error: data.error?.message || "Upload failed" };
    }
  } catch (error) {
    console.error("Server Upload Action Error:", error);
    return { success: false, error: "Network error on server" };
  }
}
