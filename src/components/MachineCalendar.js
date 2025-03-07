"use client"
import React, { useMemo, useState, useEffect } from 'react';
import useMachineStore from '../store/machineStore';

const MachineTimeline = () => {
  const machines = useMachineStore(state => state.machines);
  const queue = useMachineStore(state => state.queue);

  // นำข้อมูลจากฟังก์ชัน calculateQueueForMachineType มาใช้ร่วมกัน
  // ใช้ฟังก์ชันชุดเดียวกับที่ใช้ในการคำนวณคิวรอทั้งหมด
  const queueDetails = useMemo(() => {
    return {
      geforce_now: calculateQueueForMachineType('geforce_now'),
      boosteroid: calculateQueueForMachineType('boosteroid')
    };
  }, [machines, queue]);
  
  // ใช้ฟังก์ชันและลอจิกเดียวกับ AssignMachine.js
  function calculateQueueForMachineType(machineType) {
    // กรองเครื่องที่อยู่ในสถานะ online และมีประเภทตรงตามที่ต้องการ
    const machinesOfType = machines.filter(m => 
      m.status === 'online' && m.type === machineType
    );
    
    if (machinesOfType.length === 0) {
      return {
        available: false,
        message: `ไม่มีเครื่อง ${machineType === 'geforce_now' ? 'GeForce Now' : 'Boosteroid'} ออนไลน์ในขณะนี้`
      };
    }
    
    // คำนวณเวลาว่างของแต่ละเครื่อง
    const machineAvailability = [];
    
    machinesOfType.forEach(machine => {
      let availableTime = new Date();
      
      // ถ้าเครื่องกำลังใช้งานอยู่
      if (machine.inUse && machine.currentCustomer) {
        const startTime = machine.currentCustomer.startTime 
          ? new Date(machine.currentCustomer.startTime.seconds * 1000) 
          : new Date();
        const duration = machine.currentCustomer.duration || 1; // ชั่วโมง
        availableTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
      }
      
      machineAvailability.push({
        machine: machine.id,
        name: machine.name,
        availableTime,
        inUse: machine.inUse
      });
    });
    
    // เรียงลำดับเครื่องตามเวลาที่จะว่างเร็วที่สุด
    machineAvailability.sort((a, b) => a.availableTime - b.availableTime);
    
    // คำนวณคิวและเวลารอสำหรับลูกค้าที่ต้องการเครื่องประเภทนี้
    const customerQueue = [];
    
    // คัดกรองลูกค้าที่รอเครื่องประเภทนี้
    const customersForMachineType = queue.filter(customer => 
      customer.status === 'waiting' && 
      (!customer.preferredMachineType || customer.preferredMachineType === machineType)
    );
    
    // จัดลำดับความสำคัญของลูกค้า (VIP ก่อน, ตามด้วยระยะเวลารอ)
    const prioritizedCustomers = [...customersForMachineType].sort((a, b) => {
      // ให้ความสำคัญกับประเภทลูกค้าก่อน
      const typeScore = {
        'vip': 3,
        'premium': 2,
        'general': 1
      };
      
      const scoreA = typeScore[a.type] || 0;
      const scoreB = typeScore[b.type] || 0;
      
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // ถ้าประเภทเหมือนกัน ดูเวลารอ
      const waitTimeA = a.createdAt ? new Date() - new Date(a.createdAt.seconds * 1000) : 0;
      const waitTimeB = b.createdAt ? new Date() - new Date(b.createdAt.seconds * 1000) : 0;
      
      return waitTimeB - waitTimeA;
    });
    
    // จัดสรรลูกค้าให้กับเครื่อง
    let currentMachineIndex = 0;
    
    prioritizedCustomers.forEach((customer, index) => {
      // ใช้เครื่องที่ว่างเร็วที่สุด (เรียงใหม่ทุกครั้ง)
      machineAvailability.sort((a, b) => a.availableTime - b.availableTime);
      const machineData = machineAvailability[0];
      
      // คำนวณเวลารอ (นาที)
      const waitTime = Math.max(0, (machineData.availableTime - new Date()) / (1000 * 60));
      
      // อัปเดตเวลาที่เครื่องจะว่างครั้งต่อไป
      const customerDuration = customer.duration || 1; // ชั่วโมง
      machineData.availableTime = new Date(machineData.availableTime.getTime() + customerDuration * 60 * 60 * 1000);
      
      // บันทึกข้อมูลคิว
      customerQueue.push({
        customer: customer.name,
              customerId: customer.id,
        type: customer.type,
        machineId: machineData.machine,
        machineName: machineData.name,
        waitTime: Math.round(waitTime),
        startTime: new Date(machineData.availableTime.getTime() - customerDuration * 60 * 60 * 1000),
        endTime: new Date(machineData.availableTime)
      });
    });
    
    return {
      available: true,
      machineCount: machinesOfType.length,
      availableMachines: machinesOfType.filter(m => !m.inUse).length,
      queue: customerQueue
    };
  }
  
  // ฟังก์ชันแปลงเวลาให้อยู่ในรูปแบบที่อ่านง่าย
  const formatDateAndTime = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ฟังก์ชันแสดงเฉพาะเวลา
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ฟังก์ชันแสดงวันที่แบบสั้น
  const formatDateShort = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // เพิ่มฟังก์ชันและ state ที่จำเป็น
  const [timelineView, setTimelineView] = useState('week'); // 'day', 'week', 'month'
  const [currentStartDate, setCurrentStartDate] = useState(new Date());

  // ฟังก์ชันเลื่อนวันที่
  const moveDate = (direction) => {
    const newDate = new Date(currentStartDate);
    if (timelineView === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (timelineView === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (timelineView === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentStartDate(newDate);
  };

  // คำนวณวันสิ้นสุดตามมุมมองปัจจุบัน
  const getCurrentEndDate = () => {
    const endDate = new Date(currentStartDate);
    if (timelineView === 'day') {
      endDate.setDate(endDate.getDate() + 1);
    } else if (timelineView === 'week') {
      endDate.setDate(endDate.getDate() + 7);
    } else if (timelineView === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    return endDate;
  };

  // ปรับฟังก์ชันคำนวณตำแหน่งบนไทม์ไลน์
  const calculateTimelinePosition = (startTime, endTime, isQueue = false) => {
    if (!startTime || !endTime) return { left: '0%', width: '0%' };
    
    const viewStartDate = new Date(currentStartDate);
    viewStartDate.setHours(0, 0, 0, 0);
    
    const viewEndDate = getCurrentEndDate();
    viewEndDate.setHours(0, 0, 0, 0);
    
    const totalDuration = viewEndDate - viewStartDate;
    
    // ปรับค่าให้อยู่ในช่วงของวันที่แสดง
    const adjustedStart = startTime < viewStartDate ? viewStartDate : startTime;
    const adjustedEnd = endTime > viewEndDate ? viewEndDate : endTime;
    
    // คำนวณความกว้างและตำแหน่งของไทม์ไลน์
    const startPosition = ((adjustedStart - viewStartDate) / totalDuration) * 100;
    const width = ((adjustedEnd - adjustedStart) / totalDuration) * 100;
    
    // เพิ่มระยะห่างเล็กน้อยสำหรับคิวที่รอ (0.05% ของความกว้าง)
    // เพื่อไม่ให้ทับกับช่วงก่อนหน้า
    const offset = isQueue ? 0.1 : 0;
    
    return {
      left: `${startPosition + offset}%`,
      width: `${Math.max(width - offset, 0.5)}%` // ให้มีความกว้างขั้นต่ำเพื่อให้มองเห็นได้
    };
  };

  // ฟังก์ชันสำหรับแสดงเครื่องหมายวันที่
  const renderDateMarkers = () => {
    const markers = [];
    const endDate = getCurrentEndDate();
    let currentDate = new Date(currentStartDate);
    
    // แสดงเฉพาะวันที่ (ไม่แสดงเวลา)
    while (currentDate < endDate) {
      const positionPercent = ((currentDate - currentStartDate) / (endDate - currentStartDate)) * 100;
      
      markers.push(
        <div 
          key={currentDate.toISOString()}
          className="absolute text-xs text-gray-400 -translate-x-1/2"
          style={{ left: `${positionPercent}%` }}
        >
          {currentDate.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            weekday: 'short'
          })}
      </div>
    );
      
      // เลื่อนไปวันถัดไป
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return markers;
  };

  // อัปเดตเวลาปัจจุบันแบบเรียลไทม์
  useEffect(() => {
    const updateCurrentTime = () => {
      const timeDisplay = document.getElementById('current-time');
      if (timeDisplay) {
        timeDisplay.textContent = formatDateAndTime(new Date());
      }
    };
    
    const timer = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // นิยามฟังก์ชันโดยตรงในคอมโพเนนต์
  const maskCustomerName = (name) => {
    if (!name) return '';
    return `${name.substring(0, 2)}${'*'.repeat(8)}`;
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl mb-8">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          ตารางเวลาการใช้งานเครื่อง
      </h2>
        
        <div className="text-lg text-white font-medium">
          วันที่ {formatDateShort(new Date())}
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-300">กำลังใช้งาน</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-sm text-gray-300">คิวที่กำลังรอ</span>
          </div>
        </div>
        
        <div className="text-white flex items-center space-x-2 bg-gray-700/50 rounded-lg px-3 py-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span id="current-time" className="text-sm font-medium">
            {formatDateAndTime(new Date())}
          </span>
        </div>
      </div>
      
      {/* เพิ่มส่วนควบคุมไทม์ไลน์และมุมมอง (หลังจากส่วนแสดงเวลาปัจจุบัน) */}
      <div className="flex items-center justify-between mb-4 mt-6">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => moveDate(-1)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg p-2"
            aria-label="ย้อนกลับ"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <div className="text-white px-3 py-1 rounded-lg bg-gray-700">
            {timelineView === 'day' 
              ? currentStartDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
              : timelineView === 'week'
                ? `${currentStartDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${new Date(currentStartDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : `${currentStartDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`
            }
          </div>
          
          <button 
            onClick={() => moveDate(1)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg p-2"
            aria-label="ถัดไป"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <button 
            onClick={() => setCurrentStartDate(new Date())}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1 text-sm"
          >
            วันนี้
          </button>
        </div>
        
        <div className="flex border border-gray-600 rounded-lg overflow-hidden">
          <button 
            onClick={() => setTimelineView('day')}
            className={`px-3 py-1 text-sm ${timelineView === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            วัน
          </button>
          <button 
            onClick={() => setTimelineView('week')}
            className={`px-3 py-1 text-sm ${timelineView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            สัปดาห์
          </button>
          <button 
            onClick={() => setTimelineView('month')}
            className={`px-3 py-1 text-sm ${timelineView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            เดือน
          </button>
        </div>
      </div>
      
      {/* ส่วนแสดงเครื่อง GeForce Now */}
      <div className="mb-8">
        <div className="flex items-center mb-4 space-x-2">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            GeForce Now
          </span>
          <h3 className="text-xl font-semibold text-white">
            ({queueDetails.geforce_now.machineCount || 0})
          </h3>
        </div>
        
        {/* แสดงเครื่อง GeForce Now */}
        {machines.filter(m => m.type === 'geforce_now').map(machine => (
          <div key={machine.id} className="mb-6">
            <div className="flex items-center mb-2">
              <h4 className="text-md font-medium text-white">{machine.name}</h4>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium 
                ${machine.inUse 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                {machine.inUse ? 'กำลังใช้งาน' : 'ว่าง'}
              </span>
            </div>
            
            <div className="relative mb-4">
              <div className="timeline-container overflow-x-auto">
                <div className="relative h-8 w-full min-w-[1000px]">
                  {/* ไทม์ไลน์พื้นหลัง */}
                  <div className="absolute inset-x-0 h-8 bg-gray-700/50 rounded-lg overflow-hidden">
                    {/* เส้นแบ่งวัน */}
                    {Array.from({ length: timelineView === 'day' ? 24 : timelineView === 'week' ? 7 : 30 }, (_, i) => (
                      <div 
                        key={i} 
                        className="absolute top-0 bottom-0 w-px bg-gray-600/30"
                        style={{ 
                          left: `${(i + 1) * (100 / (timelineView === 'day' ? 24 : timelineView === 'week' ? 7 : 30))}%` 
                        }}
                      />
                    ))}
                    
                    {/* ตำแหน่งเวลาปัจจุบัน */}
                    {(() => {
                      const now = new Date();
                      const viewStartDate = new Date(currentStartDate);
                      viewStartDate.setHours(0, 0, 0, 0);
                      
                      const viewEndDate = getCurrentEndDate();
                      viewEndDate.setHours(0, 0, 0, 0);
                      
                      // แสดงเส้นเวลาปัจจุบันเฉพาะเมื่ออยู่ในช่วงเวลาที่แสดง
                      if (now >= viewStartDate && now < viewEndDate) {
                        return (
                          <div 
                            className="absolute top-0 bottom-0 w-px bg-red-500 z-20"
                            style={{ 
                              left: `${calculateTimelinePosition(now, now).left}` 
                            }}
                          >
                            <div className="absolute top-0 -ml-1.5 w-3 h-3 rounded-full bg-red-500" />
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* การใช้งานปัจจุบัน */}
                    {machine.inUse && machine.currentCustomer && (() => {
                      const startTime = machine.currentCustomer.startTime 
                        ? new Date(machine.currentCustomer.startTime.seconds * 1000) 
                        : new Date();
                      const duration = machine.currentCustomer.duration || 1;
                      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
                      
                      const position = calculateTimelinePosition(startTime, endTime, false);
                      
                      // แสดงเฉพาะเมื่ออยู่ในช่วงเวลาที่แสดง
                      if (position.width !== '0%') {
                        return (
                          <div 
                            className="absolute h-8 rounded-lg bg-green-600/70 border-2 border-green-500/70 flex items-center px-2 overflow-hidden z-10 tooltip-container"
                            style={position}
                          >
                            <div className="text-xs font-medium text-white truncate">
                              {maskCustomerName(machine.currentCustomer.name)}
                            </div>
                            {/* Tooltip สำหรับแสดงข้อมูลเพิ่มเติม */}
                            <div className="tooltip opacity-0 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg pointer-events-none transition-opacity duration-200 z-30">
                              <div className="font-medium">{maskCustomerName(machine.currentCustomer.name)}</div>
                              <div>เริ่ม: {formatDateAndTime(startTime)}</div>
                              <div>สิ้นสุด: {formatDateAndTime(endTime)}</div>
                              <div>ระยะเวลา: {duration} ชั่วโมง</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* คิวที่รอ */}
                    {queueDetails.geforce_now.queue && 
                      queueDetails.geforce_now.queue
                        .filter(item => item.machineId === machine.id)
                        .map((item, index) => {
                          const position = calculateTimelinePosition(item.startTime, item.endTime, true);
                          
                          // แสดงเฉพาะเมื่ออยู่ในช่วงเวลาที่แสดง
                          if (position.width !== '0%') {
                            return (
                              <div 
                                key={item.customerId}
                                className="absolute h-8 rounded-lg bg-yellow-500/70 border-2 border-yellow-400/70 flex items-center px-2 overflow-hidden z-10 tooltip-container"
                                style={position}
                              >
                                <div className="text-xs font-medium text-white truncate">
                                  {maskCustomerName(item.customer)}
                                </div>
                                {/* Tooltip */}
                                <div className="tooltip opacity-0 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg pointer-events-none transition-opacity duration-200 z-30">
                                  <div className="font-medium">{maskCustomerName(item.customer)}</div>
                                  <div>เริ่ม: {formatDateAndTime(item.startTime)}</div>
                                  <div>สิ้นสุด: {formatDateAndTime(item.endTime)}</div>
                                  <div>รอ: {item.waitTime} นาที</div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* เครื่องหมายวันที่สำหรับ GeForce Now (แสดงครั้งเดียวต่อกลุ่ม) */}
        <div className="relative h-8 min-w-[1000px] mt-2 overflow-x-auto mb-8">
          <div className="absolute w-full">
            {renderDateMarkers()}
          </div>
        </div>
        
        {/* เพิ่มตารางรายละเอียดคิว GeForce Now */}
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-300 mb-2">รายละเอียดคิว GeForce Now</h4>
          {queueDetails.geforce_now.queue && queueDetails.geforce_now.queue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-sm text-gray-400 border-b border-gray-700">
                    <th className="py-2 px-4 text-left">ลำดับ</th>
                    <th className="py-2 px-4 text-left">ลูกค้า</th>
                    <th className="py-2 px-4 text-left">เครื่อง</th>
                    <th className="py-2 px-4 text-left">เวลารอ</th>
                    <th className="py-2 px-4 text-left">เริ่มใช้งาน</th>
                    <th className="py-2 px-4 text-left">สิ้นสุด</th>
                    <th className="py-2 px-4 text-left">ระยะเวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {queueDetails.geforce_now.queue.map((item, index) => (
                    <tr key={item.customerId} className="text-sm">
                      <td className="py-2 px-4">{index + 1}</td>
                      <td className="py-2 px-4">
                        <div className="font-medium text-white">
                          {maskCustomerName(item.customer)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.type === 'vip' 
                            ? 'VIP' 
                            : item.type === 'premium' 
                              ? 'Premium' 
                              : 'ทั่วไป'}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-gray-300">{item.machineName}</td>
                      <td className="py-2 px-4">
                        <span className="text-yellow-400">{item.waitTime} นาที</span>
                      </td>
                      <td className="py-2 px-4 text-gray-300">
                        <div>{formatDateAndTime(item.startTime)}</div>
                      </td>
                      <td className="py-2 px-4 text-gray-300">
                        <div>{formatDateAndTime(item.endTime)}</div>
                      </td>
                      <td className="py-2 px-4 text-gray-300">
                        {Math.round((item.endTime - item.startTime) / (1000 * 60 * 60))} ชั่วโมง
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-4">
              ไม่มีคิวรอสำหรับ GeForce Now
            </div>
          )}
        </div>
      </div>
      
      {/* เพิ่มส่วนแสดงเครื่อง Boosteroid */}
      <div className="mt-12">
        <div className="flex items-center mb-4 space-x-2">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
            Boosteroid
          </span>
          <h3 className="text-xl font-semibold text-white">
            ({queueDetails.boosteroid.machineCount || 0})
          </h3>
        </div>
        
        {/* แสดงเครื่อง Boosteroid */}
        {machines.filter(m => m.type === 'boosteroid').map(machine => (
          <div key={machine.id} className="mb-6">
            <div className="flex items-center mb-2">
              <h4 className="text-md font-medium text-white">{machine.name}</h4>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium 
                ${machine.inUse 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                {machine.inUse ? 'กำลังใช้งาน' : 'ว่าง'}
              </span>
            </div>
            
            <div className="relative mb-4">
              <div className="timeline-container overflow-x-auto">
                <div className="relative h-8 w-full min-w-[1000px]">
                  {/* ไทม์ไลน์พื้นหลัง */}
                  <div className="absolute inset-x-0 h-8 bg-gray-700/50 rounded-lg overflow-hidden">
                    {/* เส้นแบ่งวัน */}
                    {Array.from({ length: timelineView === 'day' ? 24 : timelineView === 'week' ? 7 : 30 }, (_, i) => (
                      <div 
                        key={i} 
                        className="absolute top-0 bottom-0 w-px bg-gray-600/30"
                        style={{ 
                          left: `${(i + 1) * (100 / (timelineView === 'day' ? 24 : timelineView === 'week' ? 7 : 30))}%` 
                        }}
                      />
                    ))}
                    
                    {/* ตำแหน่งเวลาปัจจุบัน */}
                    {(() => {
                      const now = new Date();
                      const viewStartDate = new Date(currentStartDate);
                      viewStartDate.setHours(0, 0, 0, 0);
                      
                      const viewEndDate = getCurrentEndDate();
                      viewEndDate.setHours(0, 0, 0, 0);
                      
                      // แสดงเส้นเวลาปัจจุบันเฉพาะเมื่ออยู่ในช่วงเวลาที่แสดง
                      if (now >= viewStartDate && now < viewEndDate) {
                        return (
                          <div 
                            className="absolute top-0 bottom-0 w-px bg-red-500 z-20"
                            style={{ 
                              left: `${calculateTimelinePosition(now, now).left}` 
                            }}
                          >
                            <div className="absolute top-0 -ml-1.5 w-3 h-3 rounded-full bg-red-500" />
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* การใช้งานปัจจุบัน */}
                    {machine.inUse && machine.currentCustomer && (() => {
                      const startTime = machine.currentCustomer.startTime 
                        ? new Date(machine.currentCustomer.startTime.seconds * 1000) 
                        : new Date();
                      const duration = machine.currentCustomer.duration || 1;
                      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
                      
                      const position = calculateTimelinePosition(startTime, endTime, false);
                      
                      // แสดงเฉพาะเมื่ออยู่ในช่วงเวลาที่แสดง
                      if (position.width !== '0%') {
                        return (
                          <div 
                            className="absolute h-8 rounded-lg bg-green-600/70 border-2 border-green-500/70 flex items-center px-2 overflow-hidden z-10 tooltip-container"
                            style={position}
                          >
                            <div className="text-xs font-medium text-white truncate">
                              {maskCustomerName(machine.currentCustomer.name)}
                            </div>
                            {/* Tooltip สำหรับแสดงข้อมูลเพิ่มเติม */}
                            <div className="tooltip opacity-0 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg pointer-events-none transition-opacity duration-200 z-30">
                              <div className="font-medium">{maskCustomerName(machine.currentCustomer.name)}</div>
                              <div>เริ่ม: {formatDateAndTime(startTime)}</div>
                              <div>สิ้นสุด: {formatDateAndTime(endTime)}</div>
                              <div>ระยะเวลา: {duration} ชั่วโมง</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* คิวที่รอ */}
                    {queueDetails.boosteroid.queue && 
                      queueDetails.boosteroid.queue
                        .filter(item => item.machineId === machine.id)
                        .map((item, index) => {
                          const position = calculateTimelinePosition(item.startTime, item.endTime, true);
                          
                          // แสดงเฉพาะเมื่ออยู่ในช่วงเวลาที่แสดง
                          if (position.width !== '0%') {
                            return (
                              <div 
                                key={item.customerId}
                                className="absolute h-8 rounded-lg bg-yellow-500/70 border-2 border-yellow-400/70 flex items-center px-2 overflow-hidden z-10 tooltip-container"
                                style={position}
                              >
                                <div className="text-xs font-medium text-white truncate">
                                  {maskCustomerName(item.customer)}
                                </div>
                                {/* Tooltip */}
                                <div className="tooltip opacity-0 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg pointer-events-none transition-opacity duration-200 z-30">
                                  <div className="font-medium">{maskCustomerName(item.customer)}</div>
                                  <div>เริ่ม: {formatDateAndTime(item.startTime)}</div>
                                  <div>สิ้นสุด: {formatDateAndTime(item.endTime)}</div>
                                  <div>รอ: {item.waitTime} นาที</div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* เครื่องหมายวันที่สำหรับ Boosteroid */}
        <div className="relative h-8 min-w-[1000px] mt-2 overflow-x-auto mb-8">
          <div className="absolute w-full">
            {renderDateMarkers()}
          </div>
        </div>
        
        {/* ตารางรายละเอียดคิว Boosteroid (ปรับปรุงให้เหมือนกับ GeForce Now) */}
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-300 mb-2">รายละเอียดคิว Boosteroid</h4>
          {queueDetails.boosteroid.queue && queueDetails.boosteroid.queue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-sm text-gray-400 border-b border-gray-700">
                    <th className="py-2 px-4 text-left">ลำดับ</th>
                    <th className="py-2 px-4 text-left">ลูกค้า</th>
                    <th className="py-2 px-4 text-left">เครื่อง</th>
                    <th className="py-2 px-4 text-left">เวลารอ</th>
                    <th className="py-2 px-4 text-left">เริ่มใช้งาน</th>
                    <th className="py-2 px-4 text-left">สิ้นสุด</th>
                    <th className="py-2 px-4 text-left">ระยะเวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {queueDetails.boosteroid.queue.map((item, index) => (
                    <tr key={item.customerId} className="text-sm">
                      <td className="py-2 px-4">{index + 1}</td>
                      <td className="py-2 px-4">
                        <div className="font-medium text-white">
                          {maskCustomerName(item.customer)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.type === 'vip' 
                            ? 'VIP' 
                            : item.type === 'premium' 
                              ? 'Premium' 
                              : 'ทั่วไป'}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-gray-300">{item.machineName}</td>
                      <td className="py-2 px-4">
                        <span className="text-yellow-400">{item.waitTime} นาที</span>
                      </td>
                      <td className="py-2 px-4 text-gray-300">
                        <div>{formatDateAndTime(item.startTime)}</div>
                      </td>
                      <td className="py-2 px-4 text-gray-300">
                        <div>{formatDateAndTime(item.endTime)}</div>
                      </td>
                      <td className="py-2 px-4 text-gray-300">
                        {Math.round((item.endTime - item.startTime) / (1000 * 60 * 60))} ชั่วโมง
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-4">
              ไม่มีคิวรอสำหรับ Boosteroid
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MachineTimeline;

<style jsx global>{`
  .tooltip-container:hover .tooltip {
    opacity: 1;
  }
`}</style> 