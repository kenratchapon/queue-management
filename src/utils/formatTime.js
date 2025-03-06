// สร้างไฟล์ใหม่สำหรับฟังก์ชันจัดการเวลา
export const formatTime = (timestamp) => {
  if (!timestamp) return '-';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok'
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok'
    });
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '-';
  }
};

export const getDateFromTimestamp = (timestamp) => {
  if (!timestamp) return null;
  try {
    if (timestamp.toDate) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
}; 