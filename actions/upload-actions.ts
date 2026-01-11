"use server";

import { put } from '@vercel/blob';

type UploadResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function uploadImageAction(file: File): Promise<UploadResult> {
  try {
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });
    
    return { success: true, url: blob.url };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Failed to upload image" };
  }
}