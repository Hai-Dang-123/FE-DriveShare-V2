import React from 'react'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'

import { View } from 'react-native'

interface Props {
  visible: boolean
  value: Date
  maximumDate?: Date
  onClose: () => void
  onChange: (date?: Date) => void
}

const DatePicker: React.FC<Props> = ({ visible, value, maximumDate, onClose, onChange }) => {
  if (!visible) return null

  return (
    <View>
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        maximumDate={maximumDate}
        onChange={(event: DateTimePickerEvent, selectedDate?: Date | undefined) => {
          onClose()
          if (selectedDate) onChange(selectedDate)
        }}
      />
    </View>
  )
}

export default DatePicker
