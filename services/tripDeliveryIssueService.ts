import api from "@/config/api";

export enum DeliveryIssueType {
  DAMAGED = "DAMAGED",
  LOST = "LOST",
  LATE = "LATE",
  WRONG_ITEM = "WRONG_ITEM",
}

export interface TripDeliveryIssueCreateDTO {
  TripId: string;
  DeliveryRecordId?: string;
  IssueType: DeliveryIssueType;
  Description: string;
}

const tripDeliveryIssueService = {
  async reportIssue(dto: TripDeliveryIssueCreateDTO, imageUris: string[]) {
    try {
      const formData = new FormData();
      
      // Append DTO fields
      formData.append("TripId", dto.TripId);
      if (dto.DeliveryRecordId) {
        formData.append("DeliveryRecordId", dto.DeliveryRecordId);
      }
      formData.append("IssueType", dto.IssueType);
      formData.append("Description", dto.Description);
      
      // Append image files as "Images" (List<IFormFile> Images)
      imageUris.forEach((imageUri, index) => {
        const fileName = imageUri.split("/").pop() || `image_${index}.jpg`;
        const fileType = fileName.split(".").pop() || "jpg";
        
        formData.append("Images", {
          uri: imageUri,
          name: fileName,
          type: `image/${fileType}`,
        } as any);
      });

      console.log("📤 Driver sending FormData with", imageUris.length, "images");
      const res = await api.post("api/TripDeliveryIssue/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data;
    } catch (e: any) {
      console.error("reportIssue failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },

  async reportIssueByContact(dto: TripDeliveryIssueCreateDTO, imageUris: string[], accessToken: string) {
    try {
      const formData = new FormData();
      
      // Append DTO fields
      formData.append("TripId", dto.TripId);
      if (dto.DeliveryRecordId) {
        formData.append("DeliveryRecordId", dto.DeliveryRecordId);
      }
      formData.append("IssueType", dto.IssueType);
      formData.append("Description", dto.Description);
      
      // Append image files as "Images" (List<IFormFile> Images)
      imageUris.forEach((imageUri, index) => {
        const fileName = imageUri.split("/").pop() || `image_${index}.jpg`;
        const fileType = fileName.split(".").pop() || "jpg";
        
        formData.append("Images", {
          uri: imageUri,
          name: fileName,
          type: `image/${fileType}`,
        } as any);
      });

      console.log("📤 Contact sending FormData with", imageUris.length, "images");
      const res = await api.post(`api/TripDeliveryIssue/contact-report?accessToken=${accessToken}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data;
    } catch (e: any) {
      console.error("reportIssueByContact failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },

  async uploadIssueImage(imageUri: string): Promise<string> {
    try {
      // Create form data for image upload
      const formData = new FormData();
      const fileName = imageUri.split("/").pop() || "image.jpg";
      const fileType = fileName.split(".").pop() || "jpg";

      formData.append("file", {
        uri: imageUri,
        name: fileName,
        type: `image/${fileType}`,
      } as any);

      // Upload to your image service endpoint
      const res = await api.post("api/upload/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      return res.data.data.imageUrl || res.data.imageUrl;
    } catch (e: any) {
      console.error("uploadIssueImage failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },
};

export default tripDeliveryIssueService;
