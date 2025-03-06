"use client"
import React from 'react';
import useMachineStore from '../store/machineStore';
import { formatTime, formatDateTime } from '../utils/formatTime';

const QueueStatus = ({ readOnly = false }) => {
  const queue = useMachineStore(state => state.queue);

  const formatDuration = (duration, durationDetails) => {
    if (durationDetails) {
      const hours = durationDetails.hours ? `${durationDetails.hours}h ` : '';
      const minutes = durationDetails.minutes ? `${durationDetails.minutes}m ` : '';
      const seconds = durationDetails.seconds ? `${durationDetails.seconds}s` : '';
      return `${hours}${minutes}${seconds}`.trim() || '0h';
    }
    if (typeof duration === 'number') {
      return `${duration}h`;
    }
    return '0h';
  };

  // แยกลูกค้าตามสถานะ
  const waitingCustomers = queue.filter(customer => customer.status === 'waiting');
  const usingCustomers = queue.filter(customer => customer.status === 'using');

  const handleRemove = () => {
    // Implementation of handleRemove function
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-6">
        สถานะคิว
      </h2>

      {/* รายการลูกค้าที่กำลังรอ */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-yellow-400 mb-4">
          กำลังรอ ({waitingCustomers.length})
        </h3>
        <div className="space-y-4">
          {waitingCustomers.map((customer, index) => (
            <div
              key={customer.id}
              className="bg-gray-800/50 rounded-xl p-4 border border-yellow-500/30 hover:bg-gray-800/70 transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-medium text-white">{customer.name}</h4>
                  <p className="text-sm text-gray-400">เบอร์ติดต่อ: {customer.contact}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  คิวที่ {index + 1}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">เวลาที่ขอจอง:</span>
                  <span className="text-white">{formatDateTime(customer.requestedTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ระยะเวลา:</span>
                  <span className="text-white">
                    {formatDuration(customer.duration, customer.durationDetails)}
                  </span>
                </div>
                {customer.estimatedTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">เวลาที่คาดว่าจะเริ่ม:</span>
                    <span className="text-white">{formatDateTime(customer.estimatedTime)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">เพิ่มเข้าคิวเมื่อ:</span>
                  <span className="text-white">{formatDateTime(customer.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
          {waitingCustomers.length === 0 && (
            <p className="text-center text-gray-400 py-4">ไม่มีลูกค้าที่กำลังรอ</p>
          )}
        </div>
      </div>

      {/* รายการลูกค้าที่กำลังใช้บริการ */}
      <div>
        <h3 className="text-xl font-semibold text-green-400 mb-4">
          กำลังใช้บริการ ({usingCustomers.length})
        </h3>
        <div className="space-y-4">
          {usingCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-gray-800/50 rounded-xl p-4 border border-green-500/30 hover:bg-gray-800/70 transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-medium text-white">{customer.name}</h4>
                  <p className="text-sm text-gray-400">เบอร์ติดต่อ: {customer.contact}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                  กำลังซัก
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">เวลาที่ขอจอง:</span>
                  <span className="text-white">{formatDateTime(customer.requestedTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">เวลาเริ่ม:</span>
                  <span className="text-white">{formatDateTime(customer.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ระยะเวลา:</span>
                  <span className="text-white">
                    {formatDuration(customer.duration, customer.durationDetails)}
                  </span>
                </div>
                {customer.machineId && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">เครื่องที่ใช้:</span>
                    <span className="text-white">เครื่อง {customer.machineId}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {usingCustomers.length === 0 && (
            <p className="text-center text-gray-400 py-4">ไม่มีลูกค้าที่กำลังใช้บริการ</p>
          )}
        </div>
      </div>

      {!readOnly && (
        <button onClick={handleRemove}>ลบ</button>
      )}
    </div>
  );
};

export default QueueStatus; 