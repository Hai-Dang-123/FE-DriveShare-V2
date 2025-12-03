import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'

interface Props {
  visible: boolean
  value: Date
  maximumDate?: Date
  onClose: () => void
  onChange: (date?: Date) => void
}

const DatePicker: React.FC<Props> = ({ visible, value, maximumDate, onClose, onChange }) => {
  if (!visible) return null

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v) {
      const d = new Date(v)
      onChange(d)
    }
  }

  const maxDateStr = maximumDate ? maximumDate.toISOString().slice(0, 10) : undefined
  const valueStr = value ? value.toISOString().slice(0, 10) : ''

  return (
    <View style={styles.container}>
      <View style={styles.pickerCard}>
        <Text style={styles.title}>Chọn ngày sinh</Text>
        <input
          type="date"
          value={valueStr}
          max={maxDateStr}
          onChange={handleDateChange as any}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#F7FAFC',
          }}
        />
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#00C6FF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

})

export default DatePicker
