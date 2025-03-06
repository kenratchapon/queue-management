"use client"
import "../../app/globals.css";
import React, { useEffect, useState } from 'react';
import useMachineStore from '../../store/machineStore';
import { formatDateTime, formatDuration } from '../../utils/formatTime';
import MachineCalendar from '../../components/MachineCalendar';
import MachineStatus from '../../components/MachineStatus';
import { maskCustomerName } from '../../utils/formatters';
import { MdComputer } from "react-icons/md";
import { BsCalendarWeek } from "react-icons/bs";
import { BsListUl } from "react-icons/bs";

const CustomerPage = () => {
  const {
    machines,
    queue,
    loading,
    error,
    subscribeToData
  } = useMachineStore();

  // แยกเครื่องตามประเภท
  const geforceNowMachines = machines.filter(m => m.type === 'geforce_now');
  const boosteroidMachines = machines.filter(m => m.type === 'boosteroid');

  // ข้อมูลคิวรอ
  const waitingQueue = queue.filter(q => q.status === 'waiting');
  
  // Tab สำหรับสลับการแสดงผล
  const [activeTab, setActiveTab] = useState('status');
  
  // คำนวณเวลารอสำหรับทุกคิว
  const [queueWithWaitTimes, setQueueWithWaitTimes] = useState([]);
  
  // เพิ่มตัวแปร state สำหรับเวลาปัจจุบัน
  const [currentTime, setCurrentTime] = useState('');

  // เปลี่ยนการเรียกใช้ฟังก์ชันในการแสดงผล
  const [waitTimes, setWaitTimes] = useState({
    geforce_now: '',
    boosteroid: ''
  });

  useEffect(() => {
    subscribeToData();
  }, []);

  // อัปเดตเวลาปัจจุบันเมื่อ component mount เท่านั้น (client-side)
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('th-TH'));
    
    // อัปเดตเวลาทุก 1 นาที (ไม่จำเป็นต้องอัปเดตทุกวินาที)
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('th-TH'));
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // คำนวณเวลารอของแต่ละคิว
  useEffect(() => {
    if (machines.length > 0 && waitingQueue.length > 0) {
      calculateQueueWaitTimes();
    }
  }, [machines, queue]);

  // อัปเดตค่าเมื่อข้อมูลเปลี่ยนแปลง
  useEffect(() => {
    if (machines.length > 0) {
      setWaitTimes({
        geforce_now: calculateLatestWaitTime('geforce_now'),
        boosteroid: calculateLatestWaitTime('boosteroid')
      });
    }
  }, [machines, queue]);

  // แปลง timestamp เป็น Date object
  const getDateFromTimestamp = (timestamp) => {
    if (!timestamp) return null;
    try {
      if (timestamp.toDate) {
        return timestamp.toDate();
      }
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
      }
      if (timestamp instanceof Date) {
        return timestamp;
      }
      return null;
    } catch (error) {
      console.error('Error converting timestamp:', error);
      return null;
    }
  };

  // คำนวณเวลารอสำหรับแต่ละคิว
  const calculateQueueWaitTimes = () => {
    // แยกเครื่องตามประเภท
    const geforceNowQueue = [...machines.filter(m => m.type === 'geforce_now')];
    const boosteroidQueue = [...machines.filter(m => m.type === 'boosteroid')];
    
    // คำนวณเวลาที่แต่ละเครื่องจะว่าง
    const machineAvailabilityMap = new Map();
    
    // กำหนดเวลาว่างของแต่ละเครื่อง
    machines.forEach(machine => {
    let availableTime = new Date();

    if (machine.inUse && machine.currentCustomer) {
        const startTime = getDateFromTimestamp(machine.currentCustomer.startTime) || new Date();
        const duration = machine.currentCustomer.duration || 1; // ชั่วโมง
        availableTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
      }
      
      machineAvailabilityMap.set(machine.id, {
        type: machine.type,
        availableTime,
        inUse: machine.inUse
      });
    });
    
    // คำนวณเวลารอสำหรับแต่ละคนในคิว
    const waitingCustomersByType = {
      'geforce_now': waitingQueue.filter(c => c.preferredMachineType === 'geforce_now'),
      'boosteroid': waitingQueue.filter(c => c.preferredMachineType === 'boosteroid')
    };
    
    const processedCustomers = [];
    
    // จัดลำดับความสำคัญของลูกค้าแต่ละประเภท
    for (const machineType of ['geforce_now', 'boosteroid']) {
      // จัดลำดับความสำคัญ VIP ก่อน, Premium และท้ายสุดคือ General
      const sortedCustomers = [...waitingCustomersByType[machineType]].sort((a, b) => {
        const typeOrder = { 'vip': 0, 'premium': 1, 'general': 2 };
        const typeComparison = typeOrder[a.type || 'general'] - typeOrder[b.type || 'general'];
        
        if (typeComparison !== 0) return typeComparison;
        
        // ถ้าประเภทเดียวกัน จัดเรียงตามเวลาที่เข้าคิว
        const aTime = getDateFromTimestamp(a.createdAt)?.getTime() || 0;
        const bTime = getDateFromTimestamp(b.createdAt)?.getTime() || 0;
        return aTime - bTime;
      });
      
      // จัดสรรลูกค้าเข้าสู่เครื่องตามลำดับ
      const machinesOfType = machines.filter(m => m.type === machineType);
      
      for (const customer of sortedCustomers) {
        // เรียงลำดับเครื่องตามเวลาที่ว่าง
        const availableMachines = machinesOfType
          .map(m => ({
            id: m.id,
            name: m.name,
            ...machineAvailabilityMap.get(m.id)
          }))
          .sort((a, b) => a.availableTime - b.availableTime);
        
        if (availableMachines.length === 0) continue;
        
        // ใช้เครื่องที่จะว่างเร็วที่สุด
        const assignedMachine = availableMachines[0];
        
        // คำนวณเวลารอ
        const waitTimeMinutes = Math.max(0, (assignedMachine.availableTime - new Date()) / (1000 * 60));
        
        // คำนวณเวลาสิ้นสุดการใช้งาน
        const endTime = new Date(assignedMachine.availableTime.getTime() + (customer.duration || 1) * 60 * 60 * 1000);
        
        // อัปเดตเวลาว่างของเครื่อง
        machineAvailabilityMap.set(assignedMachine.id, {
          ...machineAvailabilityMap.get(assignedMachine.id),
          availableTime: endTime
        });
        
        // เก็บข้อมูลลูกค้าพร้อมเวลารอ
        processedCustomers.push({
          ...customer,
          waitTimeMinutes: Math.round(waitTimeMinutes),
          estimatedStartTime: assignedMachine.availableTime,
          estimatedEndTime: endTime,
          assignedMachineName: assignedMachine.name
        });
      }
    }
    
    // เรียงลำดับตามเวลารอ
    processedCustomers.sort((a, b) => a.waitTimeMinutes - b.waitTimeMinutes);
    
    setQueueWithWaitTimes(processedCustomers);
  };

  // แก้ไขฟังก์ชันคำนวณเวลารอสำหรับแต่ละประเภทเครื่อง
  const calculateLatestWaitTime = (machineType) => {
    const machinesOfType = machines.filter(m => m.type === machineType && m.status === 'online');
    if (machinesOfType.length === 0) return "ไม่มีเครื่องออนไลน์";
    
    // เครื่องที่ว่าง
    const availableMachines = machinesOfType.filter(m => !m.inUse);
    if (availableMachines.length > 0) return "พร้อมใช้งานทันที";
    
    // คำนวณเวลาที่แต่ละเครื่องจะว่าง รวมถึงคิวทั้งหมด
    const machineWaitTimes = [];
    
    machinesOfType.forEach(machine => {
      let endTime = new Date();
      
      // ถ้าเครื่องกำลังใช้งานอยู่
      if (machine.inUse && machine.currentCustomer) {
        const startTime = machine.currentCustomer.startTime 
          ? new Date(machine.currentCustomer.startTime.seconds * 1000) 
          : new Date();
        const duration = machine.currentCustomer.duration || 1; // ชั่วโมง
        endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
      }
      
      // เพิ่มเวลาสำหรับคิวที่ถูกกำหนดให้ใช้เครื่องนี้
      const machineQueue = queue.filter(q => 
        q.status === 'waiting' && 
        q.assignedMachine === machine.id
      );
      
      machineQueue.forEach(customer => {
        const customerDuration = customer.duration || 1;
        endTime = new Date(endTime.getTime() + customerDuration * 60 * 60 * 1000);
      });
      
      // เพิ่มเวลาสำหรับคิวที่รอที่ยังไม่ถูกกำหนดเครื่องแต่มีประเภทเครื่องตรงกัน
      const unassignedQueue = queue.filter(q => 
        q.status === 'waiting' && 
        !q.assignedMachine && 
        q.preferredMachineType === machineType
      );
      
      // เฉลี่ยคิวที่ไม่ได้ถูกกำหนดให้กับเครื่องทั้งหมดที่มีประเภทเดียวกัน
      if (unassignedQueue.length > 0 && machinesOfType.length > 0) {
        // กระจายคิวที่ไม่ได้ถูกกำหนดให้กับเครื่องทั้งหมดเท่าๆกัน
        const queuesPerMachine = Math.ceil(unassignedQueue.length / machinesOfType.length);
        
        // เพิ่มเวลาสำหรับคิวที่ไม่ได้ถูกกำหนดที่จะตกมาที่เครื่องนี้
        for (let i = 0; i < queuesPerMachine; i++) {
          // ถ้ามีคิวเหลือพอ
          if (i < unassignedQueue.length) {
            const customerDuration = unassignedQueue[i].duration || 1;
            endTime = new Date(endTime.getTime() + customerDuration * 60 * 60 * 1000);
          }
        }
      }
      
      // คำนวณเวลารอในนาที
      const waitTimeMinutes = Math.max(0, (endTime - new Date()) / (1000 * 60));
      machineWaitTimes.push(Math.round(waitTimeMinutes));
    });
    
    if (machineWaitTimes.length === 0) return "ไม่สามารถคำนวณได้";
    
    // เลือกเวลารอที่น้อยที่สุดจากเครื่องทั้งหมด (เครื่องที่จะว่างเร็วที่สุด)
    const shortestWaitTime = Math.min(...machineWaitTimes);
    
    // แปลงนาทีเป็นรูปแบบชั่วโมง:นาที
    return formatWaitTime(shortestWaitTime);
  };

  // ฟังก์ชันแปลงนาทีเป็นรูปแบบชั่วโมง:นาที
  const formatWaitTime = (minutes) => {
    if (minutes === 0) return "พร้อมใช้งานทันที";
    if (minutes < 60) return `${minutes} นาที`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) return `${hours} ชั่วโมง`;
    return `${hours} ชั่วโมง ${mins} นาที`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="absolute inset-0 bg-[url('/background.png')] bg-cover bg-center" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-slate-800/90" />
      
      {/* Content */}
      <div className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
                Cloud Gaming Status
              </h1>
            <p className="text-gray-400">
              ตรวจสอบสถานะและตารางการใช้งานเครื่องเกม
            </p>
          </div>

          {/* ส่วนแสดงภาพรวม */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">เครื่อง GeForce Now</span>
                <span className="text-2xl font-bold text-white">{geforceNowMachines.length}</span>
                <span className="text-sm text-green-400 mt-1">
                  {geforceNowMachines.filter(m => !m.inUse).length} เครื่องว่าง
                </span>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">เครื่อง Boosteroid</span>
                <span className="text-2xl font-bold text-white">{boosteroidMachines.length}</span>
                <span className="text-sm text-green-400 mt-1">
                  {boosteroidMachines.filter(m => !m.inUse).length} เครื่องว่าง
                </span>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">เวลารอคิวล่าสุด GeForce Now</span>
                <span className="text-xl font-bold text-yellow-400 mt-1">
                  {waitTimes.geforce_now}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  *เวลารอถ้าจองตอนนี้
                </span>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">เวลารอคิวล่าสุด Boosteroid</span>
                <span className="text-xl font-bold text-yellow-400 mt-1">
                  {waitTimes.boosteroid}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  *เวลารอถ้าจองตอนนี้
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-700 mb-6">
            <button 
              className={`py-3 px-6 font-medium text-sm flex items-center gap-2
                ${activeTab === 'status' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('status')}
            >
              <MdComputer className="text-lg" />
              สถานะเครื่อง
            </button>
            <button 
              className={`py-3 px-6 font-medium text-sm flex items-center gap-2
                ${activeTab === 'timeline' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('timeline')}
            >
              <BsCalendarWeek className="text-lg" />
              ตารางเวลาการใช้งาน
            </button>
            <button 
              className={`py-3 px-6 font-medium text-sm flex items-center gap-2
                ${activeTab === 'queue' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('queue')}
            >
              <BsListUl className="text-lg" />
              คิวที่รอ ({waitingQueue.length})
            </button>
          </div>

          {/* Content based on active tab */}
          <div className="mb-8">
            {activeTab === 'status' && (
              <div className="space-y-6">
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <h2 className="text-xl font-semibold text-white mb-4">สถานะเครื่องเกม</h2>
            <MachineStatus 
              machines={machines} 
              queue={queue}
              readOnly={true}
            />
          </div>
                
                {/* เพิ่มส่วนแสดงคิวสำหรับแต่ละประเภทเครื่อง */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                    <div className="flex items-center mb-4">
                      <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 mr-2">
                        GeForce Now
                      </div>
                      <span className="text-white font-medium">
                        คิวรอในขณะนี้: {queueWithWaitTimes.filter(q => q.preferredMachineType === 'geforce_now').length} คน
                      </span>
                    </div>

                    {queueWithWaitTimes.filter(q => q.preferredMachineType === 'geforce_now').length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {queueWithWaitTimes
                          .filter(q => q.preferredMachineType === 'geforce_now')
                          .map((customer, index) => (
                            <div key={customer.id} className="bg-gray-700/30 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-white font-medium">{maskCustomerName(customer.name)}</span>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {customer.type === 'vip' 
                                      ? 'VIP' 
                                      : customer.type === 'premium' 
                                        ? 'Premium' 
                                        : 'ทั่วไป'}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <div className="text-yellow-400 text-sm">
                                    ระยะเวลา: {customer.duration} ชั่วโมง
                                  </div>
                                  <div className="text-blue-400 text-sm font-medium mt-1">
                                    เวลารอ: {formatWaitTime(customer.waitTimeMinutes)}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-600/50 text-sm text-gray-400">
                                <div className="flex justify-between">
                                  <span>คาดว่าจะเริ่มได้:</span>
                                  <span className="text-gray-300">{formatDateTime(customer.estimatedStartTime)}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span>เครื่องที่จะใช้:</span>
                                  <span className="text-gray-300">{customer.assignedMachineName}</span>
                                </div>
                              </div>
                  </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        ไม่มีคิวรอสำหรับ GeForce Now
                    </div>
                    )}
                  </div>

                  <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                    <div className="flex items-center mb-4">
                      <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 mr-2">
                        Boosteroid
                      </div>
                      <span className="text-white font-medium">
                        คิวรอในขณะนี้: {queueWithWaitTimes.filter(q => q.preferredMachineType === 'boosteroid').length} คน
                      </span>
                    </div>

                    {queueWithWaitTimes.filter(q => q.preferredMachineType === 'boosteroid').length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {queueWithWaitTimes
                          .filter(q => q.preferredMachineType === 'boosteroid')
                          .map((customer, index) => (
                            <div key={customer.id} className="bg-gray-700/30 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-white font-medium">{maskCustomerName(customer.name)}</span>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {customer.type === 'vip' 
                                      ? 'VIP' 
                                      : customer.type === 'premium' 
                                        ? 'Premium' 
                                        : 'ทั่วไป'}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <div className="text-yellow-400 text-sm">
                                    ระยะเวลา: {customer.duration} ชั่วโมง
                                  </div>
                                  <div className="text-purple-400 text-sm font-medium mt-1">
                                    เวลารอ: {formatWaitTime(customer.waitTimeMinutes)}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-600/50 text-sm text-gray-400">
                                <div className="flex justify-between">
                                  <span>คาดว่าจะเริ่มได้:</span>
                                  <span className="text-gray-300">{formatDateTime(customer.estimatedStartTime)}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span>เครื่องที่จะใช้:</span>
                                  <span className="text-gray-300">{customer.assignedMachineName}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        ไม่มีคิวรอสำหรับ Boosteroid
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50">
                <MachineCalendar />
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-semibold text-white mb-4">รายละเอียดคิวที่รอ</h2>
                
                {queueWithWaitTimes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-sm text-gray-400 border-b border-gray-700">
                          <th className="py-2 px-4 text-left">ลำดับ</th>
                          <th className="py-2 px-4 text-left">ลูกค้า</th>
                          <th className="py-2 px-4 text-left">ประเภท</th>
                          <th className="py-2 px-4 text-left">เครื่อง</th>
                          <th className="py-2 px-4 text-left">ระยะเวลา</th>
                          <th className="py-2 px-4 text-left">เวลารอ</th>
                          <th className="py-2 px-4 text-left">คาดว่าจะเริ่ม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueWithWaitTimes.map((customer, index) => (
                          <tr key={customer.id} className="text-sm border-b border-gray-800">
                            <td className="py-3 px-4">{index + 1}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-white">{maskCustomerName(customer.name)}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                customer.type === 'vip' 
                                  ? 'bg-yellow-500/20 text-yellow-400' 
                                  : customer.type === 'premium' 
                                    ? 'bg-blue-500/20 text-blue-400' 
                                    : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {customer.type === 'vip' 
                                  ? 'VIP' 
                                  : customer.type === 'premium' 
                                    ? 'Premium' 
                                    : 'ทั่วไป'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-300">
                                {customer.assignedMachineName} 
                                <span className="text-xs ml-1 text-gray-500">
                                  ({customer.preferredMachineType === 'geforce_now' ? 'GeForce' : 'Boosteroid'})
                                </span>
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-yellow-400">{customer.duration} ชั่วโมง</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`font-medium ${
                                customer.waitTimeMinutes > 60 
                                  ? 'text-red-400' 
                                  : customer.waitTimeMinutes > 15 
                                    ? 'text-yellow-400' 
                                    : 'text-green-400'
                              }`}>
                                {formatWaitTime(customer.waitTimeMinutes)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-300">
                              {formatDateTime(customer.estimatedStartTime)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    ไม่มีคิวรอในขณะนี้
                </div>
              )}
            </div>
            )}
          </div>

          {/* Footer with time */}
          <div className="text-center text-gray-500 text-sm mt-8">
            <p>ข้อมูลอัปเดตล่าสุด: {currentTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPage;
