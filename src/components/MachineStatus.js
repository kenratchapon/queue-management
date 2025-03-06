"use client"
import React from 'react';
import CountdownTimer from './CountdownTimer';
import WaitingTimer from './WaitingTimer';
import useMachineStore from '../store/machineStore';
import { formatTime, formatDateTime } from '../utils/formatTime';

const MachineStatus = ({ readOnly = false }) => {
  const machines = useMachineStore(state => state.machines);
  const updateMachineStatus = useMachineStore(state => state.updateMachineStatus);
  const updateCustomerStatus = useMachineStore(state => state.updateCustomerStatus);

  // ฟังก์ชันรีเซ็ตเครื่อง
  const handleReset = async (machineId) => {
    try {
      const machine = machines.find(m => m.id === machineId);
      if (!machine || !machine.currentCustomer) return;

      // อัพเดทสถานะลูกค้าเป็น 'completed'
      await updateCustomerStatus(machine.currentCustomer.id, {
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
      console.error('Error resetting machine:', error);
      alert('เกิดข้อผิดพลาดในการรีเซ็ตเครื่อง');
    }
  };

  // ฟังก์ชันคำนวณเวลาที่เหลือ
  const calculateTimeLeft = (startTime, duration) => {
    if (!startTime || !duration) return null;
    
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
    const end = new Date(start.getTime() + (duration * 60 * 60 * 1000));
    const now = new Date();
    
    return end.getTime() - now.getTime();
  };

  const formatDuration = (duration, durationDetails) => {
    if (durationDetails) {
      const hours = durationDetails.hours ? `${durationDetails.hours}h ` : '';
      const minutes = durationDetails.minutes ? `${durationDetails.minutes}m ` : '';
      const seconds = durationDetails.seconds ? `${durationDetails.seconds}s` : '';
      return `${hours}${minutes}${seconds}`.trim() || '0h';
    }
    
    if (typeof duration === 'number') {
      const hours = Math.floor(duration);
      const minutes = Math.round((duration % 1) * 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    
    return '0h';
  };

  const getMachineStatus = (machine) => {
    if (!machine.inUse) {
      return {
        text: 'ว่าง',
        color: 'gray'
      };
    }

    const now = new Date();
    const startTime = machine.currentCustomer?.startTime?.toDate?.();
    
    if (!startTime) {
      return {
        text: 'กำลังใช้งาน',
        color: 'green'
      };
    }

    if (startTime > now) {
      return {
        text: 'จองแล้ว',
        color: 'yellow'
      };
    }

    return {
      text: 'กำลังใช้งาน',
      color: 'green'
    };
  };

  // เพิ่มฟังก์ชันคำนวณเวลาสิ้นสุด
  const calculateEndTime = (startTime, duration) => {
    if (!startTime || !duration) return null;
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
    return new Date(start.getTime() + (duration * 60 * 60 * 1000));
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl mb-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-6">
        สถานะเครื่อง
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines.map((machine) => {
          const status = getMachineStatus(machine);
          const startTime = machine.currentCustomer?.startTime;
          const duration = machine.currentCustomer?.duration;
          const now = new Date();
          const isWaiting = startTime?.toDate?.() 
            ? startTime.toDate() > now 
            : new Date(startTime) > now;
          
          return (
            <div
              key={machine.id}
              className={`bg-gray-800/50 rounded-xl border transition-all duration-300 p-6
                        ${status.color === 'green' 
                          ? 'border-green-500/30 hover:border-green-500/50'
                          : status.color === 'yellow'
                            ? 'border-yellow-500/30 hover:border-yellow-500/50' 
                            : 'border-gray-500/30 hover:border-gray-500/50'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-semibold text-white">
                  {machine.name}
                </h3>
                <span className={`px-4 py-1 rounded-full text-sm font-medium 
                  ${status.color === 'green'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : status.color === 'yellow'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                  {status.text}
                </span>
              </div>

              {machine.inUse && machine.currentCustomer && (
                <div className="space-y-4">
                  <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-gray-400">ลูกค้าปัจจุบัน</p>
                    </div>
                    <p className="text-lg text-white font-medium">
                      {machine.currentCustomer.name.length > 2 
                        ? machine.currentCustomer.name.substring(0,2) + '*'.repeat(Math.max(0, machine.currentCustomer.name.length-2))
                        : machine.currentCustomer.name}
                    </p>
                    <p className="text-sm text-gray-400">ติดต่อ: {
                      machine.currentCustomer.contact.length > 2
                        ? machine.currentCustomer.contact.substring(0,2) + '*'.repeat(Math.max(0, machine.currentCustomer.contact.length-2)) 
                        : machine.currentCustomer.contact}
                    </p>
                    
                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white">
                          {formatDateTime(machine.currentCustomer.requestedTime)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">ระยะเวลา:</span>
                        <span className="text-white">
                          {formatDuration(machine.currentCustomer.duration, machine.currentCustomer.durationDetails)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      {isWaiting ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-yellow-400">
                            <span>เวลารอก่อนเริ่ม:</span>
                            <WaitingTimer startTime={startTime} />
                          </div>
                          <div className="text-sm text-gray-400">
                            จะเริ่มใช้งานเมื่อ {formatDateTime(startTime)}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-gray-800/50 rounded-lg p-4">
                            <CountdownTimer
                              startTime={machine.currentCustomer.startTime}
                              duration={machine.currentCustomer.duration}
                              machineId={machine.id}
                              customerId={machine.currentCustomer.id}
                            />
                          </div>
                          <div className="text-sm text-gray-400 text-center">
                            เริ่ม: {formatDateTime(machine.currentCustomer.startTime)}
                            <br />
                            สิ้นสุด: {formatDateTime(calculateEndTime(machine.currentCustomer.startTime, machine.currentCustomer.duration))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {machine.inUse && !readOnly && (
                <button
                  onClick={() => handleReset(machine.id)}
                  className="mt-4 w-full py-3 bg-gray-900/50 hover:bg-gray-900/70
                           border border-gray-500/30 hover:border-gray-500/50
                           rounded-lg text-gray-300 transition-all duration-200"
                >
                  คืนเครื่อง
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MachineStatus;