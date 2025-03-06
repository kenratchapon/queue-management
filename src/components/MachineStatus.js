"use client"
import React, { useMemo } from 'react';
import CountdownTimer from './CountdownTimer';
import WaitingTimer from './WaitingTimer';
import useMachineStore from '../store/machineStore';
import { formatTime, formatDateTime } from '../utils/formatTime';

const MachineStatus = ({ readOnly = false }) => {
  const machines = useMachineStore(state => state.machines);
  const updateMachineStatus = useMachineStore(state => state.updateMachineStatus);
  const updateCustomerStatus = useMachineStore(state => state.updateCustomerStatus);

  // จัดกลุ่มเครื่องตามประเภทและสถานะ
  const machineGroups = useMemo(() => {
    const groups = {
      geforce_now: {
        available: [],
        inUse: [],
        reserved: []
      },
      boosteroid: {
        available: [],
        inUse: [],
        reserved: []
      }
    };
    
    machines.forEach(machine => {
      const type = machine.type || 'geforce_now';
      const now = new Date();
      
      if (!machine.inUse) {
        groups[type].available.push(machine);
      } else if (machine.currentCustomer?.startTime) {
        const startTime = machine.currentCustomer.startTime.toDate?.() || new Date(machine.currentCustomer.startTime);
        if (startTime > now) {
          groups[type].reserved.push(machine);
        } else {
          groups[type].inUse.push(machine);
        }
      } else {
        groups[type].inUse.push(machine);
      }
    });
    
    return groups;
  }, [machines]);

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

  // ฟังก์ชันแสดงการ์ดข้อมูลเครื่อง
  const renderMachineCard = (machine) => {
    const status = getMachineStatus(machine);
    const startTime = machine.currentCustomer?.startTime;
    const duration = machine.currentCustomer?.duration;
    const now = new Date();
    const isWaiting = startTime?.toDate?.() 
      ? startTime.toDate() > now 
      : startTime ? new Date(startTime) > now : false;
    
    return (
      <div
        key={machine.id}
        className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border transition-all duration-300 p-6 shadow-lg hover:shadow-xl
                  ${status.color === 'green' 
                    ? 'border-green-500/30 hover:border-green-500/60'
                    : status.color === 'yellow'
                      ? 'border-yellow-500/30 hover:border-yellow-500/60' 
                      : 'border-gray-500/30 hover:border-gray-600/60'}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-semibold text-white group-hover:text-white/90">
              {machine.name}
            </h3>
            <div className="flex items-center mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${machine.type === 'geforce_now'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`
              }>
                {machine.type === 'geforce_now' ? 'GeForce Now' : 'Boosteroid'}
              </span>
            </div>
          </div>
          <span className={`px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1
            ${status.color === 'green'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : status.color === 'yellow'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
            <span className={`w-2 h-2 rounded-full mr-1.5 
              ${status.color === 'green' 
                ? 'bg-green-400 animate-pulse' 
                : status.color === 'yellow' 
                  ? 'bg-yellow-400' 
                  : 'bg-gray-400'}`}></span>
            {status.text}
          </span>
        </div>

        {machine.inUse && machine.currentCustomer && (
          <div className="space-y-4">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 space-y-2 border border-gray-700/50">
              <div className="flex justify-between items-center">
                <p className="text-gray-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  ลูกค้าปัจจุบัน
                </p>
                {machine.currentCustomer.type === 'vip' && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    VIP
                  </span>
                )}
                {machine.currentCustomer.type === 'premium' && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Premium
                  </span>
                )}
              </div>
              <p className="text-lg text-white font-medium">
                {machine.currentCustomer?.name?.length > 2 
                  ? machine.currentCustomer.name.substring(0,2) + '*'.repeat(Math.max(0, machine.currentCustomer.name.length-2))
                  : machine.currentCustomer?.name || 'ไม่ระบุชื่อ'}
              </p>
              <p className="text-sm text-gray-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                ติดต่อ: {
                  machine.currentCustomer?.contact?.length > 2
                    ? machine.currentCustomer.contact.substring(0,2) + '*'.repeat(Math.max(0, machine.currentCustomer.contact.length-2)) 
                    : machine.currentCustomer?.contact || 'ไม่ระบุข้อมูลติดต่อ'}
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-3 bg-gray-800/40 rounded-lg p-3">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 mb-0.5 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    เวลาขอใช้
                  </span>
                  <span className="text-sm text-white font-medium">
                    {formatDateTime(machine.currentCustomer.requestedTime)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 mb-0.5 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    ระยะเวลา
                  </span>
                  <span className="text-sm text-white font-medium">
                    {formatDuration(machine.currentCustomer.duration, machine.currentCustomer.durationDetails)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700/50">
                {isWaiting ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        เวลารอก่อนเริ่ม:
                      </span>
                      <WaitingTimer startTime={startTime} />
                    </div>
                    <div className="text-sm text-gray-400 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      จะเริ่มใช้งานเมื่อ {formatDateTime(startTime)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-3 border border-gray-700/30">
                      <CountdownTimer
                        startTime={machine.currentCustomer.startTime}
                        duration={machine.currentCustomer.duration}
                        machineId={machine.id}
                        customerId={machine.currentCustomer.id}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 px-1">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5.59L4.03 9.7a.75.75 0 00-.02 1.06l.7.7c.292.294.77.294 1.062 0L10 7.94l4.19 4.19c.292.294.77.294 1.062 0l.7-.7a.75.75 0 00-.02-1.06l-5.19-5.2V5z" clipRule="evenodd" />
                        </svg>
                        เริ่ม: 
                        <span className="ml-1 font-medium text-white">
                          {formatDateTime(machine.currentCustomer.startTime)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 10-1.5 0v4.59L4.03 9.7a.75.75 0 00-.02 1.06l.7.7c.292.294.77.294 1.062 0L10 7.94l4.19 4.19c.292.294.77.294 1.062 0l.7-.7a.75.75 0 00-.02-1.06l-5.19-5.2V6.75z" clipRule="evenodd" />
                        </svg>
                        สิ้นสุด: 
                        <span className="ml-1 font-medium text-white">
                          {formatDateTime(calculateEndTime(machine.currentCustomer.startTime, machine.currentCustomer.duration))}
                        </span>
                      </div>
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
                     border border-gray-500/30 hover:border-red-500/50
                     rounded-lg text-gray-300 hover:text-white flex items-center justify-center group
                     transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 group-hover:text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            คืนเครื่อง
          </button>
        )}
      </div>
    );
  };

  // ฟังก์ชันแสดงกลุ่มเครื่อง
  const renderMachineGroup = (title, machines, icon, color) => {
    if (!machines || machines.length === 0) return null;
    
    return (
      <div className="mt-6">
        <div className={`flex items-center mb-4 space-x-2 text-${color}-400`}>
          {icon}
          <h3 className="text-xl font-semibold">{title} ({machines.length})</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map(renderMachineCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          สถานะเครื่อง
        </h2>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-green-400"></span>
            <span className="text-sm text-gray-300">กำลังใช้งาน ({
              machineGroups.geforce_now.inUse.length + machineGroups.boosteroid.inUse.length
            })</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
            <span className="text-sm text-gray-300">จองแล้ว ({
              machineGroups.geforce_now.reserved.length + machineGroups.boosteroid.reserved.length
            })</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
            <span className="text-sm text-gray-300">ว่าง ({
              machineGroups.geforce_now.available.length + machineGroups.boosteroid.available.length
            })</span>
          </div>
        </div>
      </div>
      
      {/* GeForce Now เครื่อง */}
      <div className="mb-8">
        <div className="flex items-center mb-6 space-x-2">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            GeForce Now
          </span>
          <h3 className="text-xl font-semibold text-white">
            ({machineGroups.geforce_now.available.length + machineGroups.geforce_now.inUse.length + machineGroups.geforce_now.reserved.length})
          </h3>
        </div>
      
        {renderMachineGroup(
          "กำลังใช้งาน", 
          machineGroups.geforce_now.inUse,
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>,
          "green"
        )}
        
        {renderMachineGroup(
          "จองแล้ว", 
          machineGroups.geforce_now.reserved,
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>,
          "yellow"
        )}
        
        {renderMachineGroup(
          "ว่าง", 
          machineGroups.geforce_now.available,
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>,
          "gray"
        )}
      </div>
      
      {/* Boosteroid เครื่อง */}
      <div className="mt-10">
        <div className="flex items-center mb-6 space-x-2">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
            Boosteroid
          </span>
          <h3 className="text-xl font-semibold text-white">
            ({machineGroups.boosteroid.available.length + machineGroups.boosteroid.inUse.length + machineGroups.boosteroid.reserved.length})
          </h3>
        </div>
        
        {renderMachineGroup(
          "กำลังใช้งาน", 
          machineGroups.boosteroid.inUse,
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>,
          "green"
        )}
        
        {renderMachineGroup(
          "จองแล้ว", 
          machineGroups.boosteroid.reserved,
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>,
          "yellow"
        )}
        
        {renderMachineGroup(
          "ว่าง", 
          machineGroups.boosteroid.available,
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>,
          "gray"
        )}
      </div>
    </div>
  );
};

export default MachineStatus;