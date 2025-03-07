// เพิ่มฟังก์ชันใหม่
export const maskCustomerName = (name) => {
  if (!name) return '';
  console.log('Masking name:', name); // เพิ่ม log เพื่อตรวจสอบ
  return `${name.substring(0, 2)}${'*'.repeat(8)}`;
}; 