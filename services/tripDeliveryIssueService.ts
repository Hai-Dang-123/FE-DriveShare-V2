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
  async reportIssue(dto: TripDeliveryIssueCreateDTO, images: (string | File)[]) {
    try {
      const formData = new FormData();
      
      // Append DTO fields
      formData.append("TripId", dto.TripId);
      if (dto.DeliveryRecordId) {
        formData.append("DeliveryRecordId", dto.DeliveryRecordId);
      }
      formData.append("IssueType", dto.IssueType);
      formData.append("Description", dto.Description);
      
      // Append image files - support both Web File objects and Mobile URI strings
      images.forEach((image, index) => {
        if ((image as any) instanceof File || (image as any) instanceof Blob) {
          // Web: Direct File/Blob object
          const fileName = (image as any) instanceof File ? (image as any).name : `image_${index}.jpg`;
          formData.append("Images", image as any, fileName);
        } else if (typeof image === 'string') {
          // Mobile: URI string
          const fileName = image.split("/").pop() || `image_${index}.jpg`;
          const fileType = fileName.split(".").pop() || "jpg";
          
          formData.append("Images", {
            uri: image,
            name: fileName,
            type: `image/${fileType}`,
          } as any);
        }
      });

      console.log("📤 Driver sending FormData with", images.length, "images");
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

  async reportIssueByContact(dto: TripDeliveryIssueCreateDTO, images: (string | File)[], accessToken: string) {
    try {
      const formData = new FormData();
      
      // Append DTO fields
      formData.append("TripId", dto.TripId);
      if (dto.DeliveryRecordId) {
        formData.append("DeliveryRecordId", dto.DeliveryRecordId);
      }
      formData.append("IssueType", dto.IssueType);
      formData.append("Description", dto.Description);
      
      // Append image files - support both Web File objects and Mobile URI strings
      images.forEach((image, index) => {
        if ((image as any) instanceof File || (image as any) instanceof Blob) {
          // Web: Direct File/Blob object
          const fileName = (image as any) instanceof File ? (image as any).name : `image_${index}.jpg`;
          formData.append("Images", image as any, fileName);
        } else if (typeof image === 'string') {
          // Mobile: URI string
          const fileName = image.split("/").pop() || `image_${index}.jpg`;
          const fileType = fileName.split(".").pop() || "jpg";
          
          formData.append("Images", {
            uri: image,
            name: fileName,
            type: `image/${fileType}`,
          } as any);
        }
      });

      console.log("📤 Contact sending FormData with", images.length, "images");
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
