"use client"
import React, { useState, useEffect } from 'react';
import useMachineStore from '../store/machineStore';

const CountdownTimer = ({ startTime, duration, machineId, customerId }) => {
  const [progressPercent, setProgressPercent] = useState(0);
  const [timeDisplay, setTimeDisplay] = useState('');
  const updateMachineStatus = useMachineStore(state => state.updateMachineStatus);
  const updateCustomerStatus = useMachineStore(state => state.updateCustomerStatus);

  useEffect(() => {
    if (!startTime || !duration) return;

    // คำนวณเวลาเริ่มและสิ้นสุด
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
    const end = new Date(start.getTime() + (duration * 60 * 60 * 1000));
    const totalDuration = end.getTime() - start.getTime();

    const timer = setInterval(() => {
      const now = new Date();
      const elapsed = now.getTime() - start.getTime();
      
      // คำนวณเปอร์เซ็นต์ความคืบหน้า
      let percent = Math.min(Math.floor((elapsed / totalDuration) * 100), 100);
      setProgressPercent(percent);
      
      // คำนวณเวลาที่ผ่านไป
      const hoursElapsed = Math.floor(elapsed / (1000 * 60 * 60));
      const minutesElapsed = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      const secondsElapsed = Math.floor((elapsed % (1000 * 60)) / 1000);
      
      // คำนวณเวลาที่เหลือ (สำหรับแสดงข้อความเวลา)
      const timeLeft = end.getTime() - now.getTime();
      if (timeLeft <= 0) {
        clearInterval(timer);
        setProgressPercent(100);
        setTimeDisplay('00:00:00');
        
        // อัพเดทสถานะเครื่องและลูกค้าเมื่อหมดเวลา
        handleTimerComplete();
      } else {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        setTimeDisplay(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, duration, machineId, customerId, updateMachineStatus, updateCustomerStatus]);

  const handleTimerComplete = async () => {
    try {
      // อัพเดทสถานะลูกค้าเป็น 'completed'
      await updateCustomerStatus(customerId, {
        status: 'completed',
        machineId: null,
        endTime: new Date()
      });

      // รีเซ็ตสถานะเครื่อง
      await updateMachineStatus(machineId, {
        inUse: false,
        currentCustomer: null
      });
    } catch (error) {
      console.error('Error updating status after timer completion:', error);
    }
  };

  // หลอดเปอร์เซ็นต์ความคืบหน้า
  const getProgressBarColor = () => {
    if (progressPercent < 30) return 'bg-green-500';
    if (progressPercent < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-gray-400">0%</span>
        <span className="text-xs font-medium text-white">{timeDisplay}</span>
        <span className="text-xs text-gray-400">100%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full ${getProgressBarColor()}`}
          style={{ width: `${progressPercent}%`, transition: 'width 1s ease-in-out' }}
        ></div>
      </div>
      <div className="flex justify-end mt-1">
        <span className="text-sm font-medium text-white">{progressPercent}%</span>
      </div>
    </div>
  );
};

export default CountdownTimer; 