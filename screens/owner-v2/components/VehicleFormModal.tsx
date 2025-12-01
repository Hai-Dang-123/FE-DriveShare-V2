// import React, { useEffect, useState } from 'react'
// import {
//   Modal,
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   Pressable,
//   Alert,
//   ActivityIndicator,
//   Image,
// } from 'react-native'
// import * as ImagePicker from 'expo-image-picker'
// import ImageUploader from '../../provider-v2/components/ImageUploader'
// import { XMarkIcon } from '../../provider-v2/icons/ActionIcons'
// import vehicleTypeService from '@/services/vehicleTypeService'
// import { VehicleType } from '@/models/types'

// interface Props {
//   visible: boolean
//   onClose: () => void
//   onCreate: (dto: any) => void
// }

// const VehicleFormModal: React.FC<Props> = ({ visible, onClose, onCreate }) => {
//   const [form, setForm] = useState<any>({
//     VehicleTypeId: '',
//     PlateNumber: '',
//     Model: '',
//     Brand: '',
//     YearOfManufacture: new Date().getFullYear(),
//     Color: '',
//     PayloadInKg: 0,
//     VolumeInM3: 0,
//     Features: [] as string[],
//     VehicleImages: [] as any[],
//     Documents: [] as any[],
//   })

//   useEffect(() => {
//     if (!visible) {
//       setForm({
//         VehicleTypeId: '',
//         PlateNumber: '',
//         Model: '',
//         Brand: '',
//         YearOfManufacture: new Date().getFullYear(),
//         Color: '',
//         PayloadInKg: 0,
//         VolumeInM3: 0,
//         Features: [],
//         VehicleImages: [],
//         Documents: [],
//       })
//       setVehicleTypes([])
//       setShowTypeList(false)
//       return
//     }

//     // when visible becomes true, fetch vehicle types
//     let mounted = true
//     ;(async () => {
//       try {
//         const data: any = await vehicleTypeService.getAll()
//         if (!mounted) return
//         const mapped: VehicleType[] = (Array.isArray(data) ? data : []).map((t: any) => ({
//           vehicleTypeId: t.vehicleTypeId ?? t.VehicleTypeId ?? String(t.vehicleTypeId ?? t.VehicleTypeId ?? t.id ?? ''),
//           vehicleTypeName: t.vehicleTypeName ?? t.VehicleTypeName ?? t.vehicleTypeName ?? t.name ?? '',
//           description: t.description ?? t.Description ?? '',
//         }))
//         setVehicleTypes(mapped)
//       } catch (e) {
//         console.warn('Failed to load vehicle types', e)
//       }
//     })()

//     return () => {
//       mounted = false
//     }
//   }, [visible])

//   const [submitting, setSubmitting] = useState(false)
//   const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
//   const [showTypeList, setShowTypeList] = useState(false)

//   const handleChange = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

//   // pick a new image and push to VehicleImages (or replace at index)
//   const pickImage = async (index?: number) => {
//     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
//     if (status !== 'granted') {
//       Alert.alert('Cần cấp quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh lên.')
//       return
//     }
//     const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7, base64: true })
//     if (result.canceled || !result.assets || !result.assets[0]) return
//     const asset = result.assets[0]
//     const imageObj = { uri: asset.uri, base64: asset.base64 }
//     setForm((p: any) => {
//       const imgs = Array.isArray(p.VehicleImages) ? [...p.VehicleImages] : []
//       if (typeof index === 'number') imgs[index] = imageObj
//       else imgs.push(imageObj)
//       return { ...p, VehicleImages: imgs }
//     })
//   }

//   const removeImage = (index: number) => setForm((p: any) => ({ ...p, VehicleImages: (p.VehicleImages || []).filter((_: any, i: number) => i !== index) }))

//   // Document pickers
//   const addDocument = () => setForm((p: any) => ({ ...p, Documents: [...(p.Documents || []), { ExpirationDate: '', FrontFile: null, BackFile: null }] }))

//   const removeDocument = (index: number) => setForm((p: any) => ({ ...p, Documents: (p.Documents || []).filter((_: any, i: number) => i !== index) }))

//   const pickDocumentFile = async (docIndex: number, which: 'FrontFile' | 'BackFile') => {
//     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
//     if (status !== 'granted') {
//       Alert.alert('Cần cấp quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh lên.')
//       return
//     }
//     const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7, base64: true })
//     if (result.canceled || !result.assets || !result.assets[0]) return
//     const asset = result.assets[0]
//     const fileObj = { uri: asset.uri, base64: asset.base64 }
//     setForm((p: any) => {
//       const docs = Array.isArray(p.Documents) ? [...p.Documents] : []
//       docs[docIndex] = { ...(docs[docIndex] || {}), [which]: fileObj }
//       return { ...p, Documents: docs }
//     })
//   }

//   const handleSubmit = () => {
//     if (!form.PlateNumber) return Alert.alert('Lỗi', 'Vui lòng nhập biển số')
//     if (!form.VehicleImages || form.VehicleImages.length === 0) return Alert.alert('Lỗi', 'Vui lòng tải ít nhất một ảnh xe')
//     const dto: any = {
//       VehicleTypeId: form.VehicleTypeId,
//       PlateNumber: form.PlateNumber,
//       Model: form.Model,
//       Brand: form.Brand,
//       YearOfManufacture: Number(form.YearOfManufacture) || 0,
//       Color: form.Color,
//       PayloadInKg: Number(form.PayloadInKg) || 0,
//       VolumeInM3: Number(form.VolumeInM3) || 0,
//       Features: form.Features,
//       VehicleImages: form.VehicleImages,
//       Documents: form.Documents || [],
//     }
//     setSubmitting(true)
//     Promise.resolve(onCreate(dto)).finally(() => setSubmitting(false))
//   }

//   if (!visible) return null

//   return (
//     <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
// <Pressable style={styles.backdrop} onPress={onClose} />
// <View style={styles.container}>
// <View style={styles.header}>
// <Text style={styles.title}>Thêm xe</Text>
// <TouchableOpacity onPress={onClose} style={styles.closeBtn}><XMarkIcon style={styles.closeIcon} /></TouchableOpacity>
// </View>
// <ScrollView contentContainerStyle={styles.form}>
// <View style={styles.row}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Biển số *</Text>
// <TextInput style={styles.input} value={form.PlateNumber} onChangeText={(t) => handleChange('PlateNumber', t)} />
// </View>
// <View style={{ width: 12 }} />
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Loại xe</Text>
// <TouchableOpacity onPress={() => setShowTypeList((s: boolean) => !s)} style={[styles.input, { justifyContent: 'center' }]}>
// <Text>{(vehicleTypes.find((vt: VehicleType) => vt.vehicleTypeId === form.VehicleTypeId)?.vehicleTypeName) || (form.VehicleTypeId ? `ID: ${form.VehicleTypeId}` : 'Chọn loại xe')}</Text>
// </TouchableOpacity>
//               {showTypeList && (
//                 <View style={{ maxHeight: 180, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginTop: 8, backgroundColor: '#fff' }}>
// <ScrollView>
//                     {vehicleTypes.map((vt: VehicleType) => (
//                       <TouchableOpacity key={vt.vehicleTypeId} onPress={() => { handleChange('VehicleTypeId', vt.vehicleTypeId); setShowTypeList(false) }} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
// <Text style={{ fontWeight: '600' }}>{vt.vehicleTypeName}</Text>
//                         {vt.description ? <Text style={{ color: '#6B7280', marginTop: 4 }}>{vt.description}</Text> : null}
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
// </View>
//               )}
//             </View>
// </View>
// <View style={styles.row}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Hãng</Text>
// <TextInput style={styles.input} value={form.Brand} onChangeText={(t) => handleChange('Brand', t)} />
// </View>
// <View style={{ width: 12 }} />
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Model</Text>
// <TextInput style={styles.input} value={form.Model} onChangeText={(t) => handleChange('Model', t)} />
// </View>
// </View>
// <View style={styles.row}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Năm SX</Text>
// <TextInput style={styles.input} value={String(form.YearOfManufacture)} onChangeText={(t) => handleChange('YearOfManufacture', Number(t) || 0)} keyboardType="numeric" />
// </View>
// <View style={{ width: 12 }} />
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Màu</Text>
// <TextInput style={styles.input} value={form.Color} onChangeText={(t) => handleChange('Color', t)} />
// </View>
// </View>
// <View style={styles.row}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Payload (kg)</Text>
// <TextInput style={styles.input} value={String(form.PayloadInKg)} onChangeText={(t) => handleChange('PayloadInKg', Number(t) || 0)} keyboardType="numeric" />
// </View>
// <View style={{ width: 12 }} />
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Volume (m³)</Text>
// <TextInput style={styles.input} value={String(form.VolumeInM3)} onChangeText={(t) => handleChange('VolumeInM3', Number(t) || 0)} keyboardType="numeric" />
// </View>
// </View>
// <View style={{ marginTop: 8 }}>
// <Text style={styles.label}>Tính năng (phân cách bằng dấu phẩy)</Text>
// <TextInput style={styles.input} value={(form.Features || []).join(', ')} onChangeText={(t) => handleChange('Features', t.split(',').map((s: string) => s.trim()).filter(Boolean))} />
// </View>
// <View>
// <Text style={styles.label}>Ảnh xe</Text>
// <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
//               {/* Render an uploader for each image and one extra slot to add new image */}
//               {(form.VehicleImages || []).map((im: any, idx: number) => (
//                 <View key={idx} style={{ marginRight: 8, width: 160 }}>
// <ImageUploader
//                     currentImage={im.uri ?? (im.base64 ? `data:image/jpeg;base64,${im.base64}` : im.vehicleImageURL)}
//                     onImageChange={(img) => setForm((p: any) => {
//                       const imgs = Array.isArray(p.VehicleImages) ? [...p.VehicleImages] : []
//                       imgs[idx] = { ...(imgs[idx] || {}), ...img }
//                       return { ...p, VehicleImages: imgs }
//                     })}
//                   />
// <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
// <TouchableOpacity onPress={() => pickImage(idx)} style={{ padding: 6 }}>
// <Text style={{ color: '#4F46E5' }}>Thay</Text>
// </TouchableOpacity>
// <TouchableOpacity onPress={() => removeImage(idx)} style={{ padding: 6 }}>
// <Text style={{ color: '#EF4444' }}>Xoá</Text>
// </TouchableOpacity>
// </View>
// </View>
//               ))}
// {/* empty slot to add a new image using the same ImageUploader UI */}
//               <View style={{ marginRight: 8, width: 160 }}>
// <ImageUploader
//                   currentImage={null}
//                   onImageChange={(img) => setForm((p: any) => ({ ...p, VehicleImages: [...(p.VehicleImages || []), img] }))}
//                 />
// </View>
// </ScrollView>
// </View>
// <View style={{ marginTop: 8 }}>
// <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
// <Text style={styles.label}>Tài liệu (Documents)</Text>
// <TouchableOpacity onPress={addDocument}><Text style={{ color: '#4F46E5' }}>Thêm tài liệu</Text></TouchableOpacity>
// </View>
//             {(form.Documents || []).map((doc: any, idx: number) => (
//               <View key={idx} style={{ borderWidth: 1, borderColor: '#E5E7EB', padding: 8, borderRadius: 8, marginTop: 8 }}>
// <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
// <Text style={{ fontWeight: '700' }}>Tài liệu #{idx + 1}</Text>
// <TouchableOpacity onPress={() => removeDocument(idx)}><Text style={{ color: '#EF4444' }}>Xoá</Text></TouchableOpacity>
// </View>
// <Text style={[styles.label, { marginTop: 8 }]}>Ngày hết hạn (nếu có)</Text>
// <TextInput style={styles.input} value={doc.ExpirationDate ?? ''} onChangeText={(t) => setForm((p:any) => { const d = [...(p.Documents||[])]; d[idx] = { ...(d[idx]||{}), ExpirationDate: t }; return { ...p, Documents: d } })} placeholder="YYYY-MM-DD" />
// <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Mặt trước</Text>
// <ImageUploader
//                       currentImage={doc.FrontFile ? (doc.FrontFile.uri ?? (doc.FrontFile.base64 ? `data:image/jpeg;base64,${doc.FrontFile.base64}` : undefined)) : null}
//                       onImageChange={(img) => setForm((p:any) => { const d = [...(p.Documents||[])]; d[idx] = { ...(d[idx]||{}), FrontFile: img }; return { ...p, Documents: d } })}
//                     />
// </View>
// <View style={{ flex: 1 }}>
// <Text style={styles.label}>Mặt sau</Text>
// <ImageUploader
//                       currentImage={doc.BackFile ? (doc.BackFile.uri ?? (doc.BackFile.base64 ? `data:image/jpeg;base64,${doc.BackFile.base64}` : undefined)) : null}
//                       onImageChange={(img) => setForm((p:any) => { const d = [...(p.Documents||[])]; d[idx] = { ...(d[idx]||{}), BackFile: img }; return { ...p, Documents: d } })}
//                     />
// </View>
// </View>
// </View>
//             ))}
//           </View>
// </ScrollView>
// <View style={styles.footer}>
// <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose} disabled={submitting}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
// <TouchableOpacity style={[styles.btn, styles.save, submitting ? { opacity: 0.8 } : {}]} onPress={handleSubmit} disabled={submitting}>
//             {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Tạo xe</Text>}
//           </TouchableOpacity>
// </View>
// </View>
// </Modal>
//   )
// }

// const styles = StyleSheet.create({
//   backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
//   container: { backgroundColor: '#fff', marginTop: '10%', height: '90%', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
//   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
//   title: { fontSize: 18, fontWeight: '700' },
//   closeBtn: { padding: 8 },
//   closeIcon: { width: 24, height: 24, color: '#4B5563' },
//   form: { padding: 16, gap: 12 },
//   label: { fontSize: 14, color: '#374151', marginBottom: 6 },
//   input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
//   row: { flexDirection: 'row', gap: 12 },
//   footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
//   btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
//   cancel: { backgroundColor: '#E5E7EB' },
//   cancelText: { color: '#374151', fontWeight: '600' },
//   save: { backgroundColor: '#4F46E5' },
//   saveText: { color: '#fff', fontWeight: '600' },
// })

// export default VehicleFormModal

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import vehicleTypeService from "@/services/vehicleTypeService";
import { VehicleType } from "@/models/types";
import DateInput from "@/components/DateInput";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (dto: any) => void;
}

// Màu sắc chủ đạo theo thiết kế
const COLORS = {
  primary: "#0284C7",
  text: "#1F2937",
  textLight: "#6B7280",
  border: "#E5E7EB",
  bg: "#FFFFFF",
  inputBg: "#FFFFFF",
  danger: "#EF4444",
};

// --- TÁCH COMPONENT CON RA NGOÀI ĐỂ TRÁNH RE-RENDER MẤT FOCUS ---

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  width = "100%",
  keyboardType = "default",
  required = false,
}: any) => (
  <View style={{ width, marginBottom: 12 }}>
    {label && (
      <Text style={styles.label}>
        {label} {required && <Text style={{ color: COLORS.danger }}>*</Text>}
      </Text>
    )}
    <TextInput
      style={styles.input}
      value={String(value || "")}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
    />
  </View>
);

const DocumentUploadBox = ({
  image,
  onPress,
  label,
}: {
  image: any;
  onPress: () => void;
  label: string;
}) => (
  <TouchableOpacity style={styles.docUploadBox} onPress={onPress}>
    {image ? (
      <Image
        source={{ uri: image.uri }}
        style={styles.docImage}
        resizeMode="cover"
      />
    ) : (
      <View style={{ alignItems: "center" }}>
        <Ionicons name="camera-outline" size={24} color={COLORS.textLight} />
        <Text style={styles.docUploadText}>{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// --- MAIN COMPONENT ---

const VehicleFormModal: React.FC<Props> = ({ visible, onClose, onCreate }) => {
  const [form, setForm] = useState<any>({
    VehicleTypeId: "",
    PlateNumber: "",
    Model: "",
    Brand: "",
    YearOfManufacture: new Date().getFullYear(),
    Color: "",
    PayloadInKg: 0,
    VolumeInM3: 0,
    Features: [] as string[],
    VehicleImages: [] as any[],
    Documents: [] as any[],
  });

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [showTypeList, setShowTypeList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setForm({
        VehicleTypeId: "",
        PlateNumber: "",
        Model: "",
        Brand: "",
        YearOfManufacture: new Date().getFullYear(),
        Color: "",
        PayloadInKg: 0,
        VolumeInM3: 0,
        Features: [],
        VehicleImages: [],
        Documents: [],
      });
      setVehicleTypes([]);
      setShowTypeList(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const data: any = await vehicleTypeService.getAll();
        if (!mounted) return;
        const items = Array.isArray(data) ? data : data?.data || [];
        const mapped: VehicleType[] = items.map((t: any) => ({
          vehicleTypeId:
            t.vehicleTypeId ?? t.VehicleTypeId ?? String(t.id ?? ""),
          vehicleTypeName:
            t.vehicleTypeName ?? t.VehicleTypeName ?? t.name ?? "",
          description: t.description ?? "",
        }));
        setVehicleTypes(mapped);
      } catch (e) {
        console.warn("Failed to load vehicle types", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [visible]);

  const handleChange = (k: string, v: any) =>
    setForm((p: any) => ({ ...p, [k]: v }));

  const pickImage = async (index?: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Cần quyền", "Vui lòng cấp quyền ảnh.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const imageObj = {
      uri: result.assets[0].uri,
      base64: result.assets[0].base64,
    };
    setForm((p: any) => {
      const imgs = [...(p.VehicleImages || [])];
      if (typeof index === "number") imgs[index] = imageObj;
      else imgs.push(imageObj);
      return { ...p, VehicleImages: imgs };
    });
  };

  const removeImage = (index: number) => {
    setForm((p: any) => ({
      ...p,
      VehicleImages: p.VehicleImages.filter((_: any, i: number) => i !== index),
    }));
  };

  const addDocument = () =>
    setForm((p: any) => ({
      ...p,
      Documents: [
        ...(p.Documents || []),
        { ExpirationDate: "", FrontFile: null, BackFile: null },
      ],
    }));
  const removeDocument = (index: number) =>
    setForm((p: any) => ({
      ...p,
      Documents: p.Documents.filter((_: any, i: number) => i !== index),
    }));

  const pickDocumentFile = async (
    docIndex: number,
    which: "FrontFile" | "BackFile"
  ) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Cần quyền", "Vui lòng cấp quyền ảnh.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const fileObj = {
      uri: result.assets[0].uri,
      base64: result.assets[0].base64,
    };
    setForm((p: any) => {
      const docs = [...(p.Documents || [])];
      docs[docIndex] = { ...(docs[docIndex] || {}), [which]: fileObj };
      return { ...p, Documents: docs };
    });
  };

  const handleSubmit = () => {
    if (!form.PlateNumber) return Alert.alert("Lỗi", "Vui lòng nhập biển số");
    if (!form.VehicleImages || form.VehicleImages.length === 0)
      return Alert.alert("Lỗi", "Vui lòng tải ít nhất một ảnh xe");

    const dto = { ...form };
    setSubmitting(true);
    Promise.resolve(onCreate(dto)).finally(() => setSubmitting(false));
  };
  const [featureText, setFeatureText] = useState("");

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thêm Xe Mới</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Thông tin chung</Text>

            <InputField
              label="Biển số xe"
              value={form.PlateNumber}
              onChange={(t: string) => handleChange("PlateNumber", t)}
              placeholder="Ví dụ: 51C-123.45"
              required
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Loại xe</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowTypeList(!showTypeList)}
                >
                  <Text
                    style={{
                      color: form.VehicleTypeId ? COLORS.text : "#9CA3AF",
                    }}
                  >
                    {vehicleTypes.find(
                      (vt) => vt.vehicleTypeId === form.VehicleTypeId
                    )?.vehicleTypeName || "Chọn loại xe"}
                  </Text>
                  <Feather
                    name="chevron-down"
                    size={18}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>

              <InputField
                label="Hãng xe"
                width="48%"
                value={form.Brand}
                onChange={(t: string) => handleChange("Brand", t)}
                placeholder="Hino, Isuzu..."
              />
            </View>

            {showTypeList && (
              <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                  {vehicleTypes.map((vt) => (
                    <TouchableOpacity
                      key={vt.vehicleTypeId}
                      style={styles.dropdownItem}
                      onPress={() => {
                        handleChange("VehicleTypeId", vt.vehicleTypeId);
                        setShowTypeList(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        {vt.vehicleTypeName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.row}>
              <InputField
                label="Model"
                width="32%"
                value={form.Model}
                onChange={(t: string) => handleChange("Model", t)}
              />
              <InputField
                label="Năm SX"
                width="32%"
                value={form.YearOfManufacture}
                onChange={(t: string) =>
                  handleChange("YearOfManufacture", Number(t) || 0)
                }
                keyboardType="numeric"
              />
              <InputField
                label="Màu sắc"
                width="32%"
                value={form.Color}
                onChange={(t: string) => handleChange("Color", t)}
              />
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>

            <View style={styles.row}>
              <InputField
                label="Tải trọng (kg)"
                width="48%"
                value={form.PayloadInKg}
                onChange={(t: string) =>
                  handleChange("PayloadInKg", Number(t) || 0)
                }
                keyboardType="numeric"
              />
              <InputField
                label="Thể tích (m³)"
                width="48%"
                value={form.VolumeInM3}
                onChange={(t: string) =>
                  handleChange("VolumeInM3", Number(t) || 0)
                }
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Tính năng nổi bật</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: GPS, Camera 360, Cảm biến lùi..."
                value={featureText}
                multiline
                onChangeText={(text) => {
                  setFeatureText(text);
                  const arr = text
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
                  handleChange("Features", arr);
                }}
              />
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Hình ảnh xe</Text>
            <Text style={styles.helperText}>Ảnh xe thực tế (Nhiều ảnh)</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageList}
            >
              <TouchableOpacity
                style={styles.addImageBtn}
                onPress={() => pickImage()}
              >
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={COLORS.textLight}
                />
                <Text style={styles.addImageText}>Thêm ảnh</Text>
              </TouchableOpacity>

              {form.VehicleImages.map((img: any, index: number) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{
                      uri:
                        img.uri ??
                        (img.base64
                          ? `data:image/jpeg;base64,${img.base64}`
                          : img.vehicleImageURL),
                    }}
                    style={styles.thumbnail}
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={10} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.replaceOverlay}
                    onPress={() => pickImage(index)}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.divider} />
            <View
              style={[styles.row, { alignItems: "center", marginBottom: 10 }]}
            >
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                Tài liệu & Giấy tờ
              </Text>
              <TouchableOpacity onPress={addDocument} style={styles.addDocBtn}>
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text
                  style={{
                    color: COLORS.primary,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  Thêm hồ sơ
                </Text>
              </TouchableOpacity>
            </View>

            {form.Documents.map((doc: any, idx: number) => (
              <View key={idx} style={styles.docCard}>
                <View style={styles.docHeader}>
                  <Text style={styles.docTitle}>Hồ sơ #{idx + 1}</Text>
                  <TouchableOpacity onPress={() => removeDocument(idx)}>
                    <Text
                      style={{
                        color: COLORS.danger,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      Xóa
                    </Text>
                  </TouchableOpacity>
                </View>

                <DateInput
                  label="Ngày hết hạn"
                  value={doc.ExpirationDate || ""}
                  onChange={(d: string | null) => {
                    const docs = [...form.Documents];
                    docs[idx] = {
                      ...(docs[idx] || {}),
                      ExpirationDate: d ?? "",
                    };
                    setForm({ ...form, Documents: docs });
                  }}
                />

                <View style={styles.row}>
                  <View style={{ width: "48%" }}>
                    <DocumentUploadBox
                      label="Mặt trước"
                      image={doc.FrontFile}
                      onPress={() => pickDocumentFile(idx, "FrontFile")}
                    />
                  </View>
                  <View style={{ width: "48%" }}>
                    <DocumentUploadBox
                      label="Mặt sau"
                      image={doc.BackFile}
                      onPress={() => pickDocumentFile(idx, "BackFile")}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.btnCancelText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSubmit, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnSubmitText}>Tạo Xe</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.primary },
  closeBtn: { padding: 4 },

  body: { padding: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: { fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.inputBg,
  },

  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.inputBg,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
    backgroundColor: "#fff",
    zIndex: 10,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: { fontSize: 14, color: COLORS.text },

  helperText: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  imageList: { flexDirection: "row" },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    marginRight: 12,
  },
  addImageText: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  imageWrapper: { position: "relative", marginRight: 12 },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: COLORS.textLight,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },
  replaceOverlay: { ...StyleSheet.absoluteFillObject },

  addDocBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  docCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  docTitle: { fontWeight: "600", fontSize: 13, color: COLORS.text },
  docUploadBox: {
    height: 80,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  docUploadText: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  docImage: { width: "100%", height: "100%", borderRadius: 8 },

  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "#fff",
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  btnCancelText: { fontWeight: "600", color: "#374151" },
  btnSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  btnSubmitText: { fontWeight: "600", color: "#fff" },
});

export default VehicleFormModal;
