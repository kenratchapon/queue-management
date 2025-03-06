"use client"
import React from 'react';
import useMachineStore from '../store/machineStore';
import { formatTime, formatDateTime } from '../utils/formatTime';

const QueueList = ({ onRemove }) => {
  const queue = useMachineStore(state => state.queue);
  const forceUpdate = useMachineStore(state => state.forceUpdate);

  const formatDuration = (duration, durationDetails) => {
    if (durationDetails) {
      const hours = durationDetails.hours ? `${durationDetails.hours}h ` : '';
      const minutes = durationDetails.minutes ? `${durationDetails.minutes}m ` : '';
      const seconds = durationDetails.seconds ? `${durationDetails.seconds}s` : '';
      return `${hours}${minutes}${seconds}`.trim() || '0h';
    }
    return duration ? `${duration}h` : '0h';
  };

  // แยกคิวตามสถานะ
  const waitingQueue = queue.filter(customer => customer.status === 'waiting');
  const inProgressQueue = queue.filter(customer => customer.status === 'in_progress');
  const completedQueue = queue.filter(customer => customer.status === 'completed');

  const QueueItem = ({ customer, status }) => (
    <li className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:bg-gray-800/70 transition-all duration-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-medium text-white">{customer.name}</h3>
          <p className="text-sm text-gray-400">ติดต่อ: {customer.contact}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium
          ${status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            status === 'in_progress' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
          {status === 'waiting' ? 'รอคิว' :
           status === 'in_progress' ? 'กำลังใช้งาน' : 'เสร็จสิ้น'}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">ระยะเวลา:</span>
          <span className="text-white">
            {formatDuration(customer.duration, customer.durationDetails)}
          </span>
        </div>
        {customer.requestedTime && (
          <div className="flex justify-between">
            <span className="text-gray-400">เวลาที่ขอจอง:</span>
            <span className="text-white">{formatDateTime(customer.requestedTime)}</span>
          </div>
        )}
        {customer.startTime && (
          <div className="flex justify-between">
            <span className="text-gray-400">เวลาเริ่ม:</span>
            <span className="text-white">{formatDateTime(customer.startTime)}</span>
          </div>
        )}
        {customer.endTime && (
          <div className="flex justify-between">
            <span className="text-gray-400">เวลาสิ้นสุด:</span>
            <span className="text-white">{formatDateTime(customer.endTime)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">เพิ่มเข้าคิวเมื่อ:</span>
          <span className="text-white">{formatDateTime(customer.createdAt)}</span>
        </div>
        {customer.assignedMachine && (
          <div className="flex justify-between">
            <span className="text-gray-400">เครื่อง:</span>
            <span className="text-white">#{customer.assignedMachine}</span>
          </div>
        )}
      </div>

      {status === 'waiting' && (
        <button 
          onClick={() => onRemove(customer.id)}
          className="mt-3 w-full px-4 py-2 bg-red-500/10 text-red-400 rounded-lg
                   hover:bg-red-500/20 border border-red-500/20 transition-all duration-200"
        >
          ยกเลิกคิว
        </button>
      )}
    </li>
  );

  return (
    <div className="p-6 h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-6 sticky top-0 bg-gray-900 py-2">
        รายการคิว
      </h2>

      <div className="h-[calc(100%-4rem)] overflow-y-auto pr-2 space-y-8 
                    scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50
                    hover:scrollbar-thumb-gray-500">
        {/* คิวที่กำลังรอ */}
        {waitingQueue.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-4 sticky top-0 bg-gray-900 py-2">
              กำลังรอ ({waitingQueue.length})
            </h3>
            <ul className="space-y-4">
              {waitingQueue.map(customer => (
                <QueueItem key={customer.id} customer={customer} status="waiting" />
              ))}
            </ul>
          </div>
        )}

        {/* คิวที่กำลังใช้งาน */}
        {inProgressQueue.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-4 sticky top-0 bg-gray-900 py-2">
              กำลังใช้งาน ({inProgressQueue.length})
            </h3>
            <ul className="space-y-4">
              {inProgressQueue.map(customer => (
                <QueueItem key={customer.id} customer={customer} status="in_progress" />
              ))}
            </ul>
          </div>
        )}

        {/* คิวที่เสร็จแล้ว */}
        {completedQueue.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-4 sticky top-0 bg-gray-900 py-2">
              เสร็จสิ้น ({completedQueue.length})
            </h3>
            <ul className="space-y-4">
              {completedQueue.map(customer => (
                <QueueItem key={customer.id} customer={customer} status="completed" />
              ))}
            </ul>
          </div>
        )}

        {queue.length === 0 && (
          <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="inline-block p-4 rounded-full bg-gray-700/50 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">ไม่มีคิว</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueList;