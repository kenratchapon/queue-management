// เพิ่มฟังก์ชันใหม่
export const maskCustomerName = (name) => {
  if (!name) return '';
  return `${name.substring(0, 2)}${'*'.repeat(8)}`;
}; 