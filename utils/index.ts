// import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { Float } from "react-native/Libraries/Types/CodegenTypes";
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from "react-native";
import { AnyListenerPredicate } from "@reduxjs/toolkit";
import { Href, Router } from "expo-router";
import { MediaData, MultiMediaData } from "./types";

// const checkIfUserIsValid = async () => {
//   const isValid = await GoogleSignin;
//   if (isValid) {
//     // navigate to your main screens
//   } else {
//     try {
//       await GoogleSignin.signInSilently();
//     } catch (err: any) { console.log("Error", err.code);}
//   }
// };

//Network Requests
export async function postData(url: string, data: {}, token?: string | null, contentType: 'application/json' | 'multipart/form-data' = "application/json") {
  const result = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': token != null || token != undefined ? `Bearer ${token}` : "",
      'Content-Type': contentType
    },
    body: JSON.stringify(data)
  });

  const response = await result.json()

  return response;
}

export async function getData(url: string, token?: string | null) {
  try {
    const result = await fetch(url, {
      headers: {
        'Authorization': token != null || token != undefined ? `Bearer ${token}` : "",
        'Content-Type': 'application/json'
      }
    });
    if(!result.ok) {
      console.log(result.status, result.statusText)
    }
    return result;
  } catch (err) {
    console.log(err)
  }
}

// PERMISSIONS
// Request camera and gallery permissions
export const requestPermissions = async () => {
  // Request Camera Permission
  const cameraStatus = await Camera.requestCameraPermissionsAsync();
  // setPermissions({...permissions, cameraPermission: cameraStatus.status === 'granted'});
  // Request Media Library (Gallery) Permission
  const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
  // setPermissions({ galleryPermission: galleryStatus.status === 'granted', cameraPermission: cameraStatus.status === 'granted' });

  if (cameraStatus.status !== 'granted' || galleryStatus.status !== 'granted') {
    Alert.alert(
      'Permissions Required',
      'Camera and Gallery access is required to use this feature.',
      [{ text: 'OK' }]
    );
  }

  return { cameraPermission: cameraStatus.status === 'granted', galleryPermission: galleryStatus.status === 'granted' };
};

// HARDWARE
export const openCamera = async (hasCameraPermission: boolean, setImage: React.Dispatch<React.SetStateAction<{
  fileSize: number;
  mimeType: string;
  uri: string;
  width: number;
  height: number;
}>>) => {
  if (!hasCameraPermission) {
    Alert.alert('Permission Denied', 'Camera access is not granted.');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.5,
    allowsEditing: true,
  });

  if (!result.canceled) {
    const imgData = result.assets[0];
    setImage({
      fileSize: imgData.fileSize || 0,
      width: imgData.width, height: imgData.height,
      mimeType: imgData.mimeType || "",
      uri: imgData.uri
    })
  }
};

export const openGallery = async (hasGalleryPermission: boolean, setImage: React.Dispatch<React.SetStateAction<{
  fileSize: number;
  mimeType: string;
  uri: string;
  width: number;
  height: number;
}>>, mediaTypes: ImagePicker.MediaType[] = ["images", "livePhotos"]) => {
  if (!hasGalleryPermission) {
    Alert.alert('Permission Denied', 'Gallery access is not granted.');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: mediaTypes, // Options: 'images', 'videos', 'all'
    allowsEditing: true,
    quality: 0.5, //idc about the quality of the profile photo
  });

  if (!result.canceled) {
    const imgData = result.assets[0];
    setImage({
      fileSize: imgData.fileSize || 0,
      width: imgData.width, height: imgData.height,
      mimeType: imgData.mimeType || "",
      uri: imgData.uri
    })
  }
};

//Basic validity
export function isPasswordValid(password: string): Boolean {
  const regex: RegExp = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_~`+-.?":{}|<>]).{8,50}$/;
  return regex.test(password);
}

export function isEmailValid(email: string): Boolean {
  const regex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  return regex.test(email);
}

// S3 functions
//TODO: change this function to handle video files as well
export async function uploadImagetoS3(mediaData: MediaData, otherData?: any, url?: string, token?: string) {
  let uploadUrl: string = url || "http://10.0.0.246:3000/api/auth/register/upload-profile-photo";
  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': token != null || token != undefined ? `Bearer ${token}` : "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName: mediaData.name,
        fileType: mediaData.mimeType,
        ...otherData
      })
    });

    const uploadUrls = await res.json();
    console.log("upload url is:", uploadUrls);

    if(uploadUrls.success == false) return {uploaded: false, userImgURL: null};

    const image = await fetch(mediaData.uri);
    // const image = await fetch(uploadUrls["fileURL"])
    const blob = await image.blob();

    const uploadResponse = await fetch(uploadUrls["uploadURL"], {
      method: 'PUT',
      body: blob,
      headers: {'Content-Type': mediaData.mimeType},
    });

    if (uploadResponse.ok) {
      console.log('Uploaded successfully');
      return {uploaded: true, userImgURL: uploadUrls["fileURL"]};
    } else {
      console.error('Upload failed');
      const result = await uploadResponse.text();
      console.log(result);

    }
  } catch(err) {
    console.log(`Error while uploading the file:`, err);
    return {uploaded: false, userImgURL: null};
  }
}

export async function uploadManyToS3(mediaData: MultiMediaData, url: string, otherData?: any, token?: string) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': token != null || token != undefined ? `Bearer ${token}` : "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName: mediaData.name, // ["img1", "video1"]
        fileType: mediaData.mimeType, // ["image/jpeg", "video/mp4"]
        ...otherData
      })
    });

    const uploadUrls = await res.json();
    // console.log("upload url is:", uploadUrls);

    if(uploadUrls.success == false) return {uploaded: false, userImgURL: null};

    let images, blobs;
    try {
      images = await Promise.all(mediaData.uri.map(async (uri) => await fetch(uri)));
      blobs = await Promise.all(images.map(async (image) => await image.blob()));
    } catch (err) {
      console.log(`Error while changing the image to blob:`, err);
      return {uploaded: false, userImgURL: null}
    }

    let uploadResponses;
    try {
      uploadResponses = await Promise.all(blobs.map(async (blob, index) => {
        const uploadResponse = await fetch(uploadUrls["uploadURLs"][index], {
          method: 'PUT',
          body: blob,
          headers: {'Content-Type': mediaData.mimeType[index]},
        });
  
        return uploadResponse.ok;
      }));
    } catch (err) {
      console.log(`Error while uploading blobs to s3`, err);
      return {uploaded: false, userImgURL: null}
    }

    console.log(uploadResponses);
    if (uploadResponses.every((response) => response)) {
      console.log('Uploaded successfully');
      return {uploaded: true, userImgURL: uploadUrls["fileURL"]};
    } else {
      console.error('Upload failed');
      return {uploaded: false, userImgURL: null};
    }

    // for (let i = 0; i < mediaData.uri.length; i++) {
    //   const image = await fetch(mediaData.uri[i]);
    //   const blob = await image.blob();  

    //   const uploadResponse = await fetch(uploadUrls["uploadURL"][i], {
    //     method: 'PUT',
    //     body: blob,
    //     headers: {'Content-Type': mediaData.mimeType[i]},
    //   });

    //   if (uploadResponse.ok) {
    //     console.log('Uploaded successfully');
    //     return {uploaded: true, userImgURL: uploadUrls["fileURL"][i]};
    //   } else {
    //     console.error('Upload failed');
    //     const result = await uploadResponse.text();
    //     console.log(result);
    //   }
    // }
  } catch (err) {
    console.log(`Error while uploading the file in uploadManyToS3:`, err);
    return {uploaded: false, userImgURL: null}
  }
}

//ROUTE HANDLING
export function navigateBack({router, fallbackRoute = "/(tabs)/home", pushOrReplace = "push"}: {router: Router, fallbackRoute?: Href, pushOrReplace?: "push" | "replace"}) {
  if(router.canGoBack()) {
    router.back()
  } else {
    if(pushOrReplace == "push") router.push(fallbackRoute)
    else router.replace(fallbackRoute)
  }
} 

//Math
export function getMin(x: Float, y: Float): Float {
  return x > y ? y : x;
}

export function getMax(x: Float, y: Float): Float {
  return x > y ? x : y;
}

export const debounce = (func: Function, delay: number) => {
  let timeoutId: any;

  return (...args: any) => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};