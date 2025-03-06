"use client"
import React, { useState } from 'react';
import { firebaseService } from '../services/firebaseService';

const AddCustomer = () => {
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [duration, setDuration] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      alert('กรุณากรอกชื่อลูกค้า');
      return;
    }

    if (!contact.trim()) {
      alert('กรุณากรอกข้อมูลติดต่อ');
      return;
    }

    // คำนวณ duration เป็นชั่วโมง
    const totalHours = 
      Number(duration.hours) + 
      (Number(duration.minutes) / 60) + 
      (Number(duration.seconds) / 3600);

    if (totalHours <= 0) {
      alert('กรุณาระบุระยะเวลา');
      return;
    }

    try {
      const customerData = {
        name: customerName.trim(),
        contact: contact.trim(),
        duration: totalHours,
        durationDetails: {
          hours: Number(duration.hours),
          minutes: Number(duration.minutes),
          seconds: Number(duration.seconds)
        },
        status: 'waiting'
      };

      await firebaseService.addToQueue(customerData);
      
      // รีเซ็ตฟอร์ม
      setCustomerName('');
      setContact('');
      setDuration({ hours: 0, minutes: 0, seconds: 0 });
      
      alert('เพิ่มลูกค้าเรียบร้อย');
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มลูกค้า');
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent mb-6">
        เพิ่มลูกค้าใหม่
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ชื่อลูกค้า */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ชื่อลูกค้า
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full p-3 bg-gray-800/50 border border-gray-500/30 rounded-xl
                     text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="ชื่อ-นามสกุล"
          />
        </div>

        {/* ข้อมูลติดต่อ */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ข้อมูลติดต่อ
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full p-3 bg-gray-800/50 border border-gray-500/30 rounded-xl
                     text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="เบอร์โทร หรือ ID Line"
          />
        </div>

        {/* ระยะเวลา */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ระยะเวลา
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <input
                type="number"
                min="0"
                value={duration.hours}
                onChange={(e) => setDuration({ ...duration, hours: e.target.value })}
                className="w-full p-3 bg-gray-800/50 border border-gray-500/30 rounded-xl
                         text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0"
              />
              <span className="text-sm text-gray-400 mt-1 block">ชั่วโมง</span>
            </div>
            <div>
              <input
                type="number"
                min="0"
                max="59"
                value={duration.minutes}
                onChange={(e) => setDuration({ ...duration, minutes: e.target.value })}
                className="w-full p-3 bg-gray-800/50 border border-gray-500/30 rounded-xl
                         text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0"
              />
              <span className="text-sm text-gray-400 mt-1 block">นาที</span>
            </div>
            <div>
              <input
                type="number"
                min="0"
                max="59"
                value={duration.seconds}
                onChange={(e) => setDuration({ ...duration, seconds: e.target.value })}
                className="w-full p-3 bg-gray-800/50 border border-gray-500/30 rounded-xl
                         text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0"
              />
              <span className="text-sm text-gray-400 mt-1 block">วินาที</span>
            </div>
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-500 
                   hover:from-green-600 hover:to-teal-600 rounded-xl text-white
                   font-semibold shadow-lg shadow-green-500/30 transition-all
                   duration-200 transform hover:scale-[1.02]"
        >
          เพิ่มลูกค้า
        </button>
      </form>
    </div>
  );
};

export default AddCustomer;