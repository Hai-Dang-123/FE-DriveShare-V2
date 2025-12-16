import api from "@/config/api";

interface ResponseDTO<T = any> {
  isSuccess: boolean;
  statusCode: number;
  message?: string;
  result?: T;
}

const packageService = {
  async createPackage(payload: any) {
    try {
      console.log("📦 [packageService] Creating package with payload:", {
        ...payload,
        images: payload.images?.map((img: any, i: number) => ({
          index: i,
          type: img instanceof File ? 'File' : img instanceof Blob ? 'Blob' : 'URI',
          name: img.name || img.uri || 'unknown'
        }))
      });
      
      const formData = new FormData();
      
      // Append text fields
      formData.append("Title", payload.title || "");
      formData.append("Description", payload.description || "");
      formData.append("Quantity", String(payload.quantity || 1));
      formData.append("Unit", payload.unit || "piece");
      formData.append("WeightKg", String(payload.weightKg || 0));
      formData.append("VolumeM3", String(payload.volumeM3 || 0));
      formData.append("ItemId", payload.itemId || "");
      
      // Append boolean fields
      formData.append("IsFragile", String(payload.isFragile || false));
      formData.append("IsLiquid", String(payload.isLiquid || false));
      formData.append("IsRefrigerated", String(payload.isRefrigerated || false));
      formData.append("IsFlammable", String(payload.isFlammable || false));
      formData.append("IsHazardous", String(payload.isHazardous || false));
      formData.append("IsBulky", String(payload.isBulky || false));
      formData.append("IsPerishable", String(payload.isPerishable || false));
      formData.append("OtherRequirements", payload.otherRequirements || "");

      // Append images - Support both Web (File/Blob) and Mobile (URI string)
      if (payload.images && payload.images.length > 0) {
        console.log(`📸 [packageService] Processing ${payload.images.length} images`);
        payload.images.forEach((img: any, index: number) => {
          // Check if it's already a File or Blob object (Web)
          if (img instanceof File || img instanceof Blob) {
            const fileName = (img as any).name || `package_image_${index}.jpg`;
            console.log(`  ✅ [Web] Appending File/Blob ${index}: ${fileName}`);
            formData.append("PackageImages", img, fileName);
          } else {
            // Mobile: Handle URI string or object with uri property
            const uri = img.uri || img.packageImageURL || img;
            const filename = `package_image_${index}.jpg`;
            const match = /\.(\w+)$/.exec(uri);
            const type = match ? `image/${match[1]}` : "image/jpeg";
            
            console.log(`  ✅ [Mobile] Appending URI ${index}: ${uri.substring(0, 50)}...`);
            formData.append("PackageImages", {
              uri,
              name: filename,
              type,
            } as any);
          }
        });
      } else {
        console.log("📸 [packageService] No images to upload");
      }

      const res = await api.post("api/package/provider-create-package", formData, {
      });
      return res.data;
    } catch (e: any) {
      console.error("createPackage failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },
  async getPackagesByUserId(
    params: {
      pageNumber?: number;
      pageSize?: number;
      search?: string;
      sortField?: string;
      sortOrder?: "ASC" | "DESC";
      status?: string;
    } = {}
  ) {
    try {
      const res = await api.get("api/package/get-packages-by-user", { params });
      return res.data;
    } catch (e: any) {
      console.error("getPackagesByUserId failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },
  async getMyPendingPackages(pageNumber = 1, pageSize = 10) {
    try {
      const res = await api.get("api/package/get-my-pending-packages", {
        params: { pageNumber, pageSize },
      });
      return res.data;
    } catch (e: any) {
      console.error("getMyPendingPackages failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },

  async getPackageById(packageId: string) {
    try {
      const res = await api.get(`api/package/get-package-by-id/${packageId}`);
      return res.data;
    } catch (e: any) {
      console.error("getPackageById failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },

  async updatePackage(payload: any) {
    try {
      console.log("📦 [packageService.updatePackage] Payload:", payload);
      
      const dto = {   
        PackageId: payload.packageId || payload.PackageId,
        Title: payload.title || payload.Title,
        Description: payload.description || payload.Description,
        Quantity: payload.quantity || payload.Quantity,
        Unit: payload.unit || payload.Unit,
        WeightKg: payload.weightKg || payload.WeightKg,
        VolumeM3: payload.volumeM3 || payload.VolumeM3,
        // Boolean fields - KHÔNG dùng || vì false || false = false (đúng), nhưng cần ?? để handle undefined
        IsFragile: payload.isFragile ?? payload.IsFragile ?? false,
        IsLiquid: payload.isLiquid ?? payload.IsLiquid ?? false,
        IsRefrigerated: payload.isRefrigerated ?? payload.IsRefrigerated ?? false,
        IsFlammable: payload.isFlammable ?? payload.IsFlammable ?? false,
        IsHazardous: payload.isHazardous ?? payload.IsHazardous ?? false,
        IsBulky: payload.isBulky ?? payload.IsBulky ?? false,
        IsPerishable: payload.isPerishable ?? payload.IsPerishable ?? false,
        OtherRequirements:
          payload.otherRequirements ?? payload.OtherRequirements ?? "",
      };
      
      console.log("📦 [packageService.updatePackage] DTO to send:", dto);
      const res = await api.put("api/package/update-package", dto);
      console.log("✅ [packageService.updatePackage] Response:", res.data);
      return res.data;
    } catch (e: any) {
      console.error("updatePackage failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },

  async deletePackage(packageId: string) {
    try {
      const res = await api.delete(`api/package/delete-package/${packageId}`);
      return res.data;
    } catch (e: any) {
      console.error("deletePackage failed", e);
      if (e.response) console.error("response", e.response.data);
      throw e;
    }
  },
};

export default packageService;