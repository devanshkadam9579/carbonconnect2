import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    const fileRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    console.log(`Starting upload to: ${path}`);
    const uploadResult = await uploadBytes(fileRef, file);
    console.log(`Upload successful: ${uploadResult.metadata.fullPath}`);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error: any) {
    console.error("Storage Upload Error:", error);
    if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error("Firebase Storage is taking too long to respond. This might be a temporary network issue or the storage bucket is still being provisioned. Please try again in a few moments.");
    }
    if (error.code === 'storage/unauthorized') {
      throw new Error("You don't have permission to upload files. Please ensure you are logged in.");
    }
    throw error;
  }
};
