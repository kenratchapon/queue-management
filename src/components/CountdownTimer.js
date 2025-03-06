"use client"
import React, { useState, useEffect } from 'react';
import useMachineStore from '../store/machineStore';

const CountdownTimer = ({ startTime, duration, machineId, customerId, expiredText = "ถึงเวลา" }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [percentage, setPercentage] = useState(100);
  const updateMachineStatus = useMachineStore(state => state.updateMachineStatus);
  const updateCustomerStatus = useMachineStore(state => state.updateCustomerStatus);

  const handleTimeExpired = async () => {
    if (!machineId || !customerId) return;

    try {
      // อัพเดทสถานะลูกค้าเป็น completed
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
      console.error('Error handling time expiration:', error);
    }
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        const start = startTime?.toDate?.() ? startTime.toDate() : new Date(startTime);
        const totalDuration = duration * 60 * 60 * 1000; // แปลงชั่วโมงเป็น milliseconds
        const endTime = new Date(start.getTime() + totalDuration);
        const now = new Date();
        const difference = endTime - now;

        // คำนวณเปอร์เซ็นต์เวลาที่เหลือ
        const elapsed = now - start;
        const newPercentage = Math.max(0, Math.min(100, ((totalDuration - elapsed) / totalDuration) * 100));
        setPercentage(newPercentage);

        if (difference <= 0) {
          handleTimeExpired();
          return 'หมดเวลา';
        }

        // คำนวณเวลาที่เหลือ
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } catch (error) {
        console.error('Error in CountdownTimer:', error);
        return '--:--:--';
      }
    };

    const timer = setInterval(() => {
      const currentTime = calculateTimeLeft();
      setTimeLeft(currentTime);
      
      // ถ้าหมดเวลา ให้เคลียร์ timer
      if (currentTime === 'หมดเวลา') {
        clearInterval(timer);
      }
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [startTime, duration, machineId, customerId]);

  if (timeLeft === 'หมดเวลา') {
    return <span className="text-red-500">{expiredText}</span>;
  }

  return (
    <div className="space-y-2">
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
              เวลาที่เหลือ
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-purple-600">
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
          <div
            style={{ width: `${percentage}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500 transition-all duration-500"
          />
        </div>
      </div>
      <div className="text-center">
        <span className={`font-mono text-2xl font-bold ${
          timeLeft === 'หมดเวลา' 
            ? 'text-red-500'
            : 'bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent'
        }`}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
};

export default CountdownTimer; 