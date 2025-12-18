import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Types
export interface ChecklistItemData {
  tripVehicleHandoverTermResultId: string;
  content: string;
  isPassed: boolean;
  note: string | null;
  evidenceImage?: string | File | null;
  evidenceImageUrl?: string; // For existing images
}

export interface HandoverChecklistFormData {
  recordId: string;
  currentOdometer: number;
  fuelLevel: number;
  isEngineLightOn: boolean;
  notes: string;
  checklistItems: ChecklistItemData[];
}

interface Props {
  initialData: HandoverChecklistFormData;
  onSave: (data: HandoverChecklistFormData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

const HandoverChecklistEditor: React.FC<Props> = ({
  initialData,
  onSave,
  onCancel,
  saving = false,
}) => {
  console.log('🔧 HandoverChecklistEditor initialData:', initialData);
  console.log('🔧 ChecklistItems:', initialData.checklistItems);
  initialData.checklistItems.forEach((item, idx) => {
    console.log(`🔧 Initial Item ${idx}:`, JSON.stringify(item, null, 2));
  });
  const [formData, setFormData] = useState<HandoverChecklistFormData>(initialData);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);
  
  console.log('🔧 FormData state after init:', formData);
  formData.checklistItems.forEach((item, idx) => {
    console.log(`🔧 State Item ${idx}:`, JSON.stringify(item, null, 2));
  });

  // Cache blob URLs to prevent recreation on every render (causes network request loop)
  const checklistImageUrls = useMemo(() => {
    return formData.checklistItems.map((item) => {
      if (item.evidenceImage) {
        if (typeof item.evidenceImage === 'string') {
          return item.evidenceImage; // Mobile: URI string
        } else if (item.evidenceImage instanceof File) {
          return URL.createObjectURL(item.evidenceImage); // Web: Blob URL
        }
      }
      return item.evidenceImageUrl || ''; // Existing image URL
    });
  }, [formData.checklistItems]);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      checklistImageUrls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [checklistImageUrls]);

  // Update basic info
  const updateBasicInfo = (field: keyof HandoverChecklistFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Update checklist item
  const updateChecklistItem = (index: number, field: keyof ChecklistItemData, value: any) => {
    setFormData(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Pick image for checklist item
  const pickImage = async (index: number) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Cần cấp quyền truy cập thư viện ảnh');
        return;
      }

      setUploadingImageIndex(index);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // For Web: Convert to File object
        if (Platform.OS === 'web' && asset.uri) {
          try {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const file = new File([blob], `evidence-${index}-${Date.now()}.jpg`, {
              type: 'image/jpeg',
            });
            updateChecklistItem(index, 'evidenceImage', file);
          } catch (error) {
            console.error('Error converting to File:', error);
            updateChecklistItem(index, 'evidenceImage', asset.uri);
          }
        } else {
          // For Mobile: Use URI directly
          updateChecklistItem(index, 'evidenceImage', asset.uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Lỗi khi chọn ảnh');
    } finally {
      setUploadingImageIndex(null);
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    updateChecklistItem(index, 'evidenceImage', null);
  };

  // Handle save
  const handleSave = async () => {
    console.log('💾 Before save - formData:', formData);
    console.log('💾 Before save - checklistItems:', formData.checklistItems);
    // Validate
    if (formData.currentOdometer < 0) {
      alert('Số km hiện tại không hợp lệ');
      return;
    }
    if (formData.fuelLevel < 0 || formData.fuelLevel > 100) {
      alert('Mức nhiên liệu phải từ 0-100%');
      return;
    }

    await onSave(formData);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cập Nhật Biên Bản Giao Nhận Xe</Text>
        <Text style={styles.headerSubtitle}>
          Kiểm tra và ghi nhận tình trạng phương tiện
        </Text>
      </View>

      {/* Vehicle Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin phương tiện</Text>

        {/* Odometer */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <MaterialIcons name="speed" size={16} color="#6B7280" /> Số km hiện tại *
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập số km"
            keyboardType="numeric"
            value={formData.currentOdometer.toString()}
            onChangeText={(text) => updateBasicInfo('currentOdometer', parseFloat(text) || 0)}
          />
        </View>

        {/* Fuel Level */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <MaterialIcons name="local-gas-station" size={16} color="#6B7280" /> Mức nhiên liệu (%) *
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0-100"
            keyboardType="numeric"
            value={formData.fuelLevel.toString()}
            onChangeText={(text) => {
              const val = parseFloat(text) || 0;
              updateBasicInfo('fuelLevel', Math.min(100, Math.max(0, val)));
            }}
          />
        </View>

        {/* Engine Light */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => updateBasicInfo('isEngineLightOn', !formData.isEngineLightOn)}
        >
          <View style={[styles.checkbox, formData.isEngineLightOn && styles.checkboxChecked]}>
            {formData.isEngineLightOn && <Ionicons name="checkmark" size={18} color="#FFF" />}
          </View>
          <Text style={styles.checkboxLabel}>
            <MaterialIcons name="warning" size={16} color="#F59E0B" /> Đèn báo động cơ sáng
          </Text>
        </TouchableOpacity>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <MaterialIcons name="note" size={16} color="#6B7280" /> Ghi chú chung
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ghi chú về tình trạng xe (tùy chọn)"
            value={formData.notes}
            onChangeText={(text) => updateBasicInfo('notes', text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Checklist Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh sách kiểm tra</Text>
        <Text style={styles.sectionSubtitle}>
          Đánh dấu các mục đạt yêu cầu và ghi chú nếu có vấn đề
        </Text>

        {formData.checklistItems.map((item, index) => (
          <View key={item.tripVehicleHandoverTermResultId} style={styles.checklistItem}>
            {/* Item Header */}
            <View style={styles.checklistHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.checklistContent}>
                  {index + 1}. {item.content}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  item.isPassed ? styles.statusButtonPass : styles.statusButtonFail,
                ]}
                onPress={() => updateChecklistItem(index, 'isPassed', !item.isPassed)}
              >
                <MaterialIcons
                  name={item.isPassed ? 'check-circle' : 'cancel'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.statusButtonText}>
                  {item.isPassed ? 'Đạt' : 'Không đạt'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Note Input */}
            <TextInput
              style={styles.checklistNoteInput}
              placeholder={item.isPassed ? 'Ghi chú (tùy chọn)' : 'Mô tả vấn đề (khuyến nghị)'}
              value={item.note || ''}
              onChangeText={(text) => updateChecklistItem(index, 'note', text)}
              multiline
            />

            {/* Image Upload */}
            <View style={styles.imageSection}>
              {(item.evidenceImage || item.evidenceImageUrl) ? (
                <View style={styles.imagePreview}>
                  <Image
                    source={{ uri: checklistImageUrls[index] }}
                    style={styles.evidenceImage}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialIcons name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage(index)}
                  disabled={uploadingImageIndex === index}
                >
                  {uploadingImageIndex === index ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <>
                      <MaterialIcons name="add-photo-alternate" size={24} color="#6B7280" />
                      <Text style={styles.uploadButtonText}>Thêm ảnh minh chứng</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Spacer */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 12,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
    flex: 1,
  },
  checklistItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  checklistContent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  statusButtonPass: {
    backgroundColor: '#10B981',
  },
  statusButtonFail: {
    backgroundColor: '#EF4444',
  },
  statusButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  checklistNoteInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#374151',
    backgroundColor: '#FFF',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  imageSection: {
    marginTop: 4,
  },
  imagePreview: {
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  uploadButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#2563EB',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default HandoverChecklistEditor;
