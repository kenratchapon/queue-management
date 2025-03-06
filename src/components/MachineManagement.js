"use client"
import React, { useState } from 'react';
import { addMachine, updateMachineStatus, deleteMachine } from '../services/firebaseService';

const MachineManagement = ({ machines = [], onUpdate }) => {
  const [newMachine, setNewMachine] = useState({ name: '', type: 'geforce_now' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddMachine = async (e) => {
    e.preventDefault();
    if (!newMachine.name.trim()) {
      setError('กรุณาระบุชื่อเครื่อง');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await addMachine(newMachine);
      setNewMachine({ name: '', type: 'geforce_now' });
      onUpdate?.();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเพิ่มเครื่อง: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (machineId, newStatus) => {
    try {
      setLoading(true);
      await updateMachineStatus(machineId, { status: newStatus });
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการอัพเดทสถานะ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMachine = async (machineId) => {
    if (!window.confirm('คุณต้องการลบเครื่องนี้ใช่หรือไม่?')) return;
    
    try {
      setLoading(true);
      await deleteMachine(machineId);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการลบเครื่อง: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent mb-6">
        จัดการเครื่อง
      </h2>

      <form className="mb-8 space-y-4" onSubmit={handleAddMachine}>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ชื่อเครื่อง
          </label>
          <input
            className="w-full p-3 bg-gray-800/50 border border-gray-500/30 rounded-xl 
                    text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="ชื่อเครื่อง"
            value={newMachine.name}
            onChange={(e) => setNewMachine({...newMachine, name: e.target.value})}
            required
            type="text"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ประเภทเครื่อง
          </label>
          <select
            className="w-full p-3 bg-gray-800/50 border border-gray-500/30 rounded-xl 
                    text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            value={newMachine.type}
            onChange={(e) => setNewMachine({...newMachine, type: e.target.value})}
          >
            <option value="geforce_now">GeForce Now</option>
            <option value="boosteroid">Boosteroid</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-500 
                  hover:from-green-600 hover:to-teal-600 rounded-xl text-white 
                  font-semibold shadow-lg shadow-green-500/30 transition-all 
                  duration-200 transform hover:scale-[1.02] disabled:opacity-50"
          disabled={loading}
        >
          เพิ่มเครื่อง
        </button>
      </form>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-300 mb-4">รายการเครื่องทั้งหมด</h3>
        {machines.length === 0 ? (
          <p className="text-center text-gray-400 py-4">ยังไม่มีเครื่อง</p>
        ) : (
          <div className="space-y-4">
            {machines.map(machine => (
              <div key={machine.id} className="bg-gray-800/50 rounded-xl border border-gray-500/30 p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-white">{machine.name}</h4>
                    <p className="text-sm text-gray-400">
                      {machine.type === 'geforce_now' ? 'GeForce Now' : 'Boosteroid'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <select
                      className={`px-3 py-1 rounded-lg text-sm font-medium 
                                ${machine.status === 'online' 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                  : machine.status === 'maintenance'
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                      value={machine.status}
                      onChange={(e) => handleChangeStatus(machine.id, e.target.value)}
                      disabled={machine.inUse}
                    >
                      <option value="online">ออนไลน์</option>
                      <option value="offline">ออฟไลน์</option>
                      <option value="maintenance">บำรุงรักษา</option>
                    </select>
                    <button
                      onClick={() => handleDeleteMachine(machine.id)}
                      className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg
                              hover:bg-red-500/20 border border-red-500/20"
                      disabled={machine.inUse}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
                <div className="flex text-sm text-gray-400">
                  <div className="flex-1">
                    <p>สถานะ: {
                      machine.inUse 
                        ? <span className="text-green-400">กำลังใช้งาน</span> 
                        : <span className="text-gray-400">ว่าง</span>
                    }</p>
                  </div>
                  <div className="flex-1">
                    <p>อัพเดทล่าสุด: {
                      machine.updatedAt 
                        ? new Date(machine.updatedAt.seconds * 1000).toLocaleString('th-TH') 
                        : 'ไม่มีข้อมูล'
                    }</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MachineManagement; 