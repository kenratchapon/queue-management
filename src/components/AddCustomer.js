"use client"
import React, { useState } from 'react';
import { addCustomerToQueue } from '../services/firebaseService';

const AddCustomer = ({ onAddCustomer }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [type, setType] = useState('general');
  const [preferredMachineType, setPreferredMachineType] = useState('');
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name) {
      alert('กรุณากรอกชื่อลูกค้า');
      return;
    }

    if (!contact) {
      alert('กรุณากรอกข้อมูลติดต่อลูกค้า');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // คำนวณเวลาเป็นชั่วโมง
      const duration = parseFloat(hours) + (parseFloat(minutes) / 60) + (parseFloat(seconds) / 3600);
      
      // สร้างข้อมูลลูกค้า
      const customerData = {
        name,
        contact,
        type,
        preferredMachineType,
        status: 'waiting',
        duration,
        durationDetails: {
          hours: parseFloat(hours),
          minutes: parseFloat(minutes),
          seconds: parseFloat(seconds)
        },
        createdAt: new Date()
      };
      
      await onAddCustomer(customerData);
      
      // รีเซ็ตฟอร์ม
      setName('');
      setContact('');
      setType('general');
      setPreferredMachineType('');
      setHours(1);
      setMinutes(0);
      setSeconds(0);
      
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มลูกค้า');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl mb-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-6">
        เพิ่มลูกค้าใหม่
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              ชื่อลูกค้า <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="กรอกชื่อลูกค้า"
              required
            />
          </div>
          
          <div>
            <label htmlFor="contact" className="block text-sm font-medium text-gray-300 mb-1">
              ข้อมูลติดต่อ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="กรอกเบอร์โทรศัพท์หรืออีเมล"
              required
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
              ประเภทลูกค้า
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="general">ทั่วไป</option>
              <option value="premium">พรีเมียม</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="preferredMachineType" className="block text-sm font-medium text-gray-300 mb-1">
              ประเภทเครื่องที่ต้องการ
            </label>
            <select
              id="preferredMachineType"
              value={preferredMachineType}
              onChange={(e) => setPreferredMachineType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ไม่ระบุ</option>
              <option value="geforce_now">GeForce Now</option>
              <option value="boosteroid">Boosteroid</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              ระยะเวลา
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="hours" className="block text-xs text-gray-400 mb-1">ชั่วโมง</label>
                <input
                  id="hours"
                  type="number"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="minutes" className="block text-xs text-gray-400 mb-1">นาที</label>
                <input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="seconds" className="block text-xs text-gray-400 mb-1">วินาที</label>
                <input
                  id="seconds"
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg font-medium transition-all duration-200
                    ${isSubmitting
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                    }`}
        >
          {isSubmitting ? 'กำลังเพิ่ม...' : 'เพิ่มลูกค้า'}
        </button>
      </form>
    </div>
  );
};

export default AddCustomer;