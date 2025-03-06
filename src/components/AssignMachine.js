"use client"
import React, { useState, useEffect, useMemo } from 'react';
import useMachineStore from '../store/machineStore';
import { formatTime, formatDateTime } from '../utils/formatTime';
import { assignCustomerToMachine } from '../services/firebaseService';

// ฟังก์ชันสำหรับฟอร์แมตเวลารอให้อยู่ในรูปแบบที่อ่านง่าย
const formatWaitTime = (milliseconds) => {
  if (!milliseconds) return 'ไม่มีข้อมูล';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} ชั่วโมง ${minutes} นาที`;
  } else if (minutes > 0) {
    return `${minutes} นาที`;
  } else {
    return 'น้อยกว่า 1 นาที';
  }
};

// ฟังก์ชันสำหรับฟอร์แมตวันที่และเวลา
const formatDateAndTime = (dateTime) => {
  if (!dateTime) return 'ไม่ระบุ';
  
  const date = new Date(dateTime);
  
  // ฟอร์แมตวันที่
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  // ฟอร์แมตเวลา
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const AssignMachine = () => {
  const machines = useMachineStore(state => state.machines);
  const queue = useMachineStore(state => state.queue);
  const updateMachineStatus = useMachineStore(state => state.updateMachineStatus);
  const updateCustomerStatus = useMachineStore(state => state.updateCustomerStatus);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [startTime, setStartTime] = useState('');

  const availableMachines = useMemo(() => {
    return machines.filter(machine => 
      machine?.status === 'online' && 
      !machine?.inUse &&
      (selectedMachineType === 'all' || machine?.type === selectedMachineType)
    );
  }, [machines, selectedMachineType]);

  const waitingCustomers = useMemo(() => {
    return queue.filter(customer => customer?.status === 'waiting');
  }, [queue]);

  const estimatedWaitingTime = useMemo(() => {
    const waitTime = {
      geforce_now: null,
      boosteroid: null
    };
    
    const inUseMachines = machines.filter(machine => 
      machine?.status === 'online' && machine?.inUse
    );
    
    if (inUseMachines.length > 0) {
      const geforceInUse = inUseMachines.filter(m => m.type === 'geforce_now');
      if (geforceInUse.length > 0) {
        const earliestAvailable = geforceInUse.reduce((earliest, machine) => {
          const startTime = machine.startTime ? new Date(machine.startTime.seconds * 1000) : new Date();
          const duration = machine.duration || 1;
          const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
          const remainingTime = (endTime - new Date()) / (60 * 1000);
          
          return remainingTime < earliest.time ? { machine: machine.id, time: remainingTime } : earliest;
        }, { machine: null, time: Infinity });
        
        if (earliestAvailable.machine) {
          waitTime.geforce_now = Math.max(0, Math.round(earliestAvailable.time));
        }
      }
      
      const boosteroidInUse = inUseMachines.filter(m => m.type === 'boosteroid');
      if (boosteroidInUse.length > 0) {
        const earliestAvailable = boosteroidInUse.reduce((earliest, machine) => {
          const startTime = machine.startTime ? new Date(machine.startTime.seconds * 1000) : new Date();
          const duration = machine.duration || 1;
          const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
          const remainingTime = (endTime - new Date()) / (60 * 1000);
          
          return remainingTime < earliest.time ? { machine: machine.id, time: remainingTime } : earliest;
        }, { machine: null, time: Infinity });
        
        if (earliestAvailable.machine) {
          waitTime.boosteroid = Math.max(0, Math.round(earliestAvailable.time));
        }
      }
    }
    
    return waitTime;
  }, [machines]);

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

  const calculateWaitingTime = (availableTime) => {
    const now = new Date();
    const time = getDateFromTimestamp(availableTime);
    if (!time) return 0;
    return Math.max(0, (time.getTime() - now.getTime()) / (1000 * 60));
  };

  const calculateMachineScore = (machine, customer) => {
    let score = 0;
    
    if (customer?.preferredMachineType) {
      if (customer.preferredMachineType === machine.type) {
        score += 20;
      } else {
        score -= 10;
      }
    }
    
    if (customer?.type === 'vip') {
      score += 3;
    } else if (customer?.type === 'premium') {
      score += 2;
    } else {
      score += 1;
    }
    
    if (customer?.createdAt) {
      const waitTime = new Date() - new Date(customer.createdAt.seconds * 1000);
      const waitHours = waitTime / (1000 * 60 * 60);
      score += Math.min(waitHours, 5);
    }

    return score;
  };

  const calculateMachineAvailability = (machine, queuedCustomers) => {
    let availableTime = new Date();
    let currentQueue = [];

    if (machine.inUse && machine.currentCustomer) {
      const startTime = getDateFromTimestamp(machine.currentCustomer.startTime);
      if (startTime && machine.currentCustomer.duration) {
        availableTime = new Date(startTime.getTime() + (machine.currentCustomer.duration * 60 * 60 * 1000));
        currentQueue.push({
          name: machine.currentCustomer.name,
          endTime: availableTime,
          duration: machine.currentCustomer.duration
        });
      }
    }

    const assignedToMachine = queuedCustomers.filter(c => c.assignedMachine === machine.id);
    assignedToMachine.forEach(customer => {
      const customerEndTime = new Date(availableTime.getTime() + (customer.duration * 60 * 60 * 1000));
      currentQueue.push({
        name: customer.name,
        endTime: customerEndTime,
        duration: customer.duration
      });
      availableTime = customerEndTime;
    });

    return {
      availableTime,
      currentQueue
    };
  };

  const generateQueueDetails = (currentQueue) => {
    if (currentQueue.length === 0) return "เครื่องว่างพร้อมใช้งานทันที";

    return currentQueue.map((queue, index) => {
      const endTime = formatDateTime(queue.endTime);
      const duration = queue.duration ? ` (${queue.duration} ชั่วโมง)` : '';
      return `${index + 1}. ${queue.name}${duration} จะเสร็จเมื่อ ${endTime}`;
    }).join('\n');
  };

  const recommendations = useMemo(() => {
    if (!availableMachines.length || !waitingCustomers.length) return [];
    
    const result = [];
    
    waitingCustomers.forEach(customer => {
      if (customer?.preferredMachineType) {
        const matchingMachines = availableMachines.filter(
          machine => machine.type === customer.preferredMachineType
        );
        
        if (matchingMachines.length > 0) {
          const scoredMachines = matchingMachines.map(machine => {
            let score = 0;
            
            if (customer.type === 'vip') score += 3;
            else if (customer.type === 'premium') score += 2;
            else score += 1;
            
            if (customer.createdAt) {
              const waitTime = new Date() - new Date(customer.createdAt.seconds * 1000);
              const waitHours = waitTime / (1000 * 60 * 60);
              score += Math.min(waitHours, 5);
            }
            
      return {
        ...machine,
              score,
              customer
            };
          }).sort((a, b) => b.score - a.score);
          
          result.push(...scoredMachines);
        }
      } else {
        const scoredMachines = availableMachines.map(machine => {
          let score = 0;
          
          if (customer.type === 'vip') score += 3;
          else if (customer.type === 'premium') score += 2;
          else score += 1;
          
          if (customer.createdAt) {
            const waitTime = new Date() - new Date(customer.createdAt.seconds * 1000);
            const waitHours = waitTime / (1000 * 60 * 60);
            score += Math.min(waitHours, 5);
          }

          return {
            ...machine,
            score,
            customer
          };
        }).sort((a, b) => b.score - a.score);
        
        result.push(...scoredMachines.slice(0, 2));
      }
    });
    
    const uniqueRecommendations = [];
    const seen = new Set();
    
    result.forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueRecommendations.push(item);
      }
    });
    
    return uniqueRecommendations.sort((a, b) => b.score - a.score);
  }, [availableMachines, waitingCustomers]);

  useEffect(() => {
    // ไม่ต้องทำอะไรเพราะเราใช้ useMemo ในการคำนวณ recommendations แล้ว
  }, [machines, queue]);

  const getDefaultStartTime = () => {
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    
    const year = bangkokTime.getFullYear();
    const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
    const day = String(bangkokTime.getDate()).padStart(2, '0');
    const hours = String(bangkokTime.getHours()).padStart(2, '0');
    const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const onAssignCustomer = async (machineId, customerId, startTime) => {
    try {
      const customer = queue.find(c => c.id === customerId);
      const machine = machines.find(m => m.id === machineId);

      if (!customer || !machine) {
        throw new Error('ไม่พบข้อมูลลูกค้าหรือเครื่อง');
      }

      const customerData = {
        id: customer.id,
        name: customer.name || '',
        contact: customer.contact || '',
        startTime: startTime || new Date(),
        duration: customer.duration || 0
      };

      if (customer.requestedTime) {
        customerData.requestedTime = customer.requestedTime;
      }
      if (customer.durationDetails) {
        customerData.durationDetails = customer.durationDetails;
      }

      await updateMachineStatus(machineId, {
        inUse: true,
        currentCustomer: customerData
      });

      await updateCustomerStatus(customerId, {
        status: 'using',
        machineId: machineId,
        startTime: startTime || new Date()
      });

    } catch (error) {
      console.error('Error in onAssignCustomer:', error);
      throw error;
    }
  };

  const resetForm = () => {
      setSelectedCustomer('');
      setSelectedMachine('');
    setSelectedStartTime('');
  };

  const handleAssign = async (machineId, customerId) => {
    try {
      setLoading(true);
      setError(null);
      
      const customer = waitingCustomers.find(c => c?.id === customerId);
      if (!customer) {
        throw new Error('ไม่พบข้อมูลลูกค้า');
      }

      const customerDuration = customer.duration || 1;
      
      // แปลงเวลาที่ผู้ใช้เลือกจาก input field
      const selectedStartTimeObj = startTime ? new Date(startTime) : new Date();
      
      // ตรวจสอบว่าเวลาที่เลือกถูกต้อง
      if (isNaN(selectedStartTimeObj.getTime())) {
        throw new Error('รูปแบบเวลาไม่ถูกต้อง');
      }
      
      // ใช้เวลาที่ผู้ใช้เลือกแทนเวลาปัจจุบัน
      await assignCustomerToMachine(machineId, customerId, selectedStartTimeObj, customerDuration);
      onAssignCustomer(machineId, customerId, selectedStartTimeObj);
      
      // แสดงข้อความแจ้งเตือนเมื่อตั้งเวลาในอนาคต
      const now = new Date();
      if (selectedStartTimeObj > now) {
        alert(`ตั้งเวลาเริ่มใช้งานเรียบร้อย: ${formatDateAndTime(selectedStartTimeObj)}`);
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการมอบหมายเครื่อง');
      console.error('Error assigning machine:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      const customer = queue.find(c => c.id === selectedCustomer);
      if (customer?.requestedTime) {
        const requestedDate = getDateFromTimestamp(customer.requestedTime);
        if (requestedDate) {
          setSelectedStartTime(requestedDate.toISOString().slice(0, 16));
          return;
        }
      }
      setSelectedStartTime(getDefaultStartTime());
    }
  }, [selectedCustomer]);

  const renderNoAvailableMessage = (customer) => {
    if (!customer?.preferredMachineType) return null;
    
    const waitTime = estimatedWaitingTime[customer.preferredMachineType];
    const machineTypeName = customer.preferredMachineType === 'geforce_now' ? 'GeForce Now' : 'Boosteroid';
    
    if (waitTime !== null) {
      const hours = Math.floor(waitTime / 60);
      const minutes = waitTime % 60;
      let timeText = '';
      
      if (hours > 0) {
        timeText += `${hours} ชั่วโมง `;
      }
      if (minutes > 0 || hours === 0) {
        timeText += `${minutes} นาที`;
      }
      
      return (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 mt-4">
          <p className="font-medium">ไม่มีเครื่อง {machineTypeName} ว่างในขณะนี้</p>
          <p>เครื่องจะว่างในอีกประมาณ <span className="font-bold">{timeText}</span></p>
        </div>
      );
    } else {
      return (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 mt-4">
          <p className="font-medium">ไม่มีเครื่อง {machineTypeName} ออนไลน์ในขณะนี้</p>
          <p>กรุณาติดต่อเจ้าหน้าที่</p>
        </div>
      );
    }
  };

  const calculateQueueForMachineType = (machineType) => {
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
        const startTime = machine.startTime 
          ? new Date(machine.startTime.seconds * 1000) 
          : new Date();
        const duration = machine.duration || 1; // ชั่วโมง
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
    const customersForMachineType = waitingCustomers.filter(customer => 
      !customer.preferredMachineType || customer.preferredMachineType === machineType
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
    
    // จัดสรรลูกค้าให้กับเครื่องที่จะว่างเร็วที่สุด
    prioritizedCustomers.forEach((customer, index) => {
      // เรียงลำดับเครื่องใหม่ทุกครั้งตามเวลาที่จะว่าง
      machineAvailability.sort((a, b) => a.availableTime - b.availableTime);
      
      // เลือกเครื่องที่ว่างเร็วที่สุด
      const machineData = machineAvailability[0];
      
      // คำนวณเวลารอ (นาที)
      const waitTime = Math.max(0, (machineData.availableTime - new Date()) / (1000 * 60));
      
      // คำนวณเวลาเริ่มต้น
      const startTime = new Date(machineData.availableTime);
      
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
        startTime: startTime,
        endTime: new Date(machineData.availableTime)
      });
    });
    
    return {
      available: true,
      machineCount: machinesOfType.length,
      availableMachines: machinesOfType.filter(m => !m.inUse).length,
      queue: customerQueue
    };
  };

  // เรียกใช้ฟังก์ชันในส่วน useMemo เพื่อคำนวณข้อมูลคิว
  const queueDetails = useMemo(() => {
    return {
      geforce_now: calculateQueueForMachineType('geforce_now'),
      boosteroid: calculateQueueForMachineType('boosteroid')
    };
  }, [machines, waitingCustomers]);

  const selectRecommendation = (machine, customer) => {
    console.log('เลือกคำแนะนำ:', { machine, customer });
    
    // ตรวจสอบว่าได้รับข้อมูลเครื่องหรือไม่
    if (!machine || !machine.id) {
      console.error('ไม่พบข้อมูลเครื่อง', machine);
      alert('ไม่สามารถเลือกคำแนะนำนี้ได้ เนื่องจากไม่พบข้อมูลเครื่อง');
      return;
    }
    
    // ตรวจสอบว่าได้รับข้อมูลลูกค้าหรือไม่
    if (!customer || !customer.id) {
      // ถ้าไม่มีข้อมูลลูกค้า ให้เลือกแค่เครื่อง
      setSelectedMachineId(machine.id);
      alert('เลือกเครื่อง ' + (machine.name || machine.id) + ' แล้ว กรุณาเลือกลูกค้าด้วยตนเอง');
    } else {
      // ถ้ามีข้อมูลครบถ้วน ให้เลือกทั้งลูกค้าและเครื่อง
      setSelectedCustomerId(customer.id);
      setSelectedMachineId(machine.id);
    }
    
    // ตั้งค่าเวลาเริ่มต้นเป็นเวลาปัจจุบัน
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    setStartTime(formattedDateTime);
    
    // เลื่อนหน้าจอไปที่ฟอร์มกรอกด้วยตนเอง
    setTimeout(() => {
      document.getElementById('manual-assignment-form')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }, 100);
  };

  if (waitingCustomers.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-6">
          Assign Machine
        </h2>
        <p className="text-gray-400 text-center py-8">ไม่มีลูกค้าในคิว</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
        คำแนะนำการจัดสรรเครื่อง
      </h2>

      {recommendations.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white mb-2">คำแนะนำการจัดสรรเครื่อง</h3>
          <p className="text-gray-400 mb-4">
            ระบบได้วิเคราะห์คิวและเครื่องที่มีอยู่ ขอแนะนำการจัดสรรดังนี้:
          </p>
          
        {recommendations.map((rec, index) => (
            <div
              key={`${rec?.customer?.id || index}-${rec?.machine?.id || index}`}
              className={`bg-gray-800/50 rounded-xl border 
                        ${rec?.matchesPreference ? 'border-green-500/50' : 'border-gray-600/30'} 
                        p-4 hover:bg-gray-800/70 transition-all duration-200`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-grow">
                  <div className="text-lg text-white font-medium mb-2">คำแนะนำที่ {index + 1}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ข้อมูลลูกค้า */}
                    <div className="bg-gray-900/40 rounded-lg p-3">
                      <div className="text-gray-400 text-sm mb-1">ลูกค้า</div>
                      {rec?.customer ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <div className="text-white font-medium">{rec.customer.name || 'ไม่ระบุชื่อ'}</div>
                            {rec.customer.type === 'vip' && 
                              <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                VIP
                              </span>
                            }
                            {rec.customer.type === 'premium' && 
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Premium
                              </span>
                            }
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            รอแล้ว: {formatWaitTime ? formatWaitTime(rec.waitTime) : 'ไม่ระบุ'}
                          </div>
                          {rec.customer.preferredMachineType && (
                            <div className="text-sm text-gray-400">
                              ต้องการใช้เครื่อง: {rec.customer.preferredMachineType === 'geforce_now' ? 'GeForce Now' : 'Boosteroid'}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">ไม่มีข้อมูลลูกค้า</div>
                      )}
                    </div>
                    
                    {/* ข้อมูลเครื่อง */}
                    <div className="bg-gray-900/40 rounded-lg p-3">
                      <div className="text-gray-400 text-sm mb-1">เครื่อง</div>
                      {rec?.machine ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <div className="text-white font-medium">{rec.machine.name || 'ไม่ระบุชื่อ'}</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                              ${rec.machine.type === 'geforce_now' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                              {rec.machine.type === 'geforce_now' ? 'GeForce Now' : 'Boosteroid'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            สถานะ: <span className="text-green-400">ว่าง</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400">ไม่มีข้อมูลเครื่อง</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-400">คะแนนความเหมาะสม:</span> 
                      <span className="ml-1 text-white font-medium">{rec?.score ? rec.score.toFixed(1) : '0.0'} / 10</span>
                    </div>
                    {rec?.matchesPreference && (
                      <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        ตรงตามความต้องการของลูกค้า
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="bg-gray-800/30 rounded-xl border border-yellow-500/20 p-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="text-yellow-400 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-yellow-300 font-medium">หมายเหตุ</p>
                <p className="text-gray-300 mt-1">
                  คำแนะนำนี้อ้างอิงจากประเภทลูกค้า, เวลารอคิว, และความต้องการใช้เครื่องเฉพาะ 
                  โดยให้ความสำคัญกับลูกค้า VIP มาเป็นอันดับแรก ตามด้วย Premium และลูกค้าทั่วไป
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl border border-gray-600/30 p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-300 mb-1">ไม่มีคำแนะนำ</h3>
              <p className="text-sm">
                {waitingCustomers.length === 0 
                  ? 'ไม่มีลูกค้าในคิวที่รอใช้งาน' 
                  : availableMachines.length === 0 
                    ? 'ไม่มีเครื่องว่างที่สามารถจัดสรรได้' 
                    : 'ไม่สามารถสร้างคำแนะนำได้ในขณะนี้'}
              </p>
            </div>
          </div>
          </div>
        )}

      <div id="manual-assignment-form" className="mt-8 space-y-6">
        <h3 className="text-xl font-semibold text-white">หรือเลือกด้วยตนเอง</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              เลือกลูกค้า
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-3 bg-gray-800/50 border border-purple-500/30 rounded-xl
                       text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">เลือกลูกค้า</option>
              {waitingCustomers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.contact || '-'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              เลือกเครื่อง
            </label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full p-3 bg-gray-800/50 border border-purple-500/30 rounded-xl
                       text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">เลือกเครื่อง</option>
              {machines.map(machine => (
                <option 
                  key={machine.id} 
                  value={machine.id}
                  disabled={machine.inUse}
                >
                  {machine.name} ({machine.inUse ? 'กำลังใช้งาน' : 'ว่าง'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              เวลาเริ่มต้น (ค่าเริ่มต้น: เวลาปัจจุบัน)
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-3 bg-gray-800/50 border border-purple-500/30 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              หากต้องการกำหนดเวลาล่วงหน้า สามารถปรับเปลี่ยนได้
            </p>
          </div>

          <button
            onClick={() => handleAssign(selectedMachineId, selectedCustomerId)}
            disabled={!selectedCustomerId || !selectedMachineId || !startTime}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                     hover:from-purple-600 hover:to-pink-600 rounded-lg text-white
                     font-semibold transition-all duration-200 disabled:opacity-50
                     disabled:cursor-not-allowed"
          >
            จัดสรรเครื่อง
          </button>
        </div>
      </div>

      <div className="space-y-6 mt-8">
        <h3 className="text-xl font-semibold text-white">สถานะคิวรอทั้งหมด</h3>
        
        {/* คิวของ GeForce Now */}
        <div className="bg-gray-800/50 rounded-xl border border-blue-500/30 p-5">
          <h4 className="text-lg font-medium text-blue-400 mb-4">
            คิว GeForce Now
            {queueDetails.geforce_now.available && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({queueDetails.geforce_now.availableMachines} ว่าง จากทั้งหมด {queueDetails.geforce_now.machineCount} เครื่อง)
              </span>
            )}
          </h4>
          
          {!queueDetails.geforce_now.available ? (
            <p className="text-gray-400">{queueDetails.geforce_now.message}</p>
          ) : queueDetails.geforce_now.queue.length === 0 ? (
            <p className="text-gray-400">ไม่มีลูกค้ารอคิว GeForce Now</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4 py-2 text-sm text-gray-400 border-b border-gray-700">
                <div>ลำดับ</div>
                <div className="col-span-2">ลูกค้า</div>
                <div>เครื่อง</div>
                <div>เวลารอ</div>
                <div>เริ่มใช้งาน</div>
              </div>
              {queueDetails.geforce_now.queue.map((item, index) => (
                <div key={item.customerId} className="grid grid-cols-6 gap-4 py-2 text-sm items-center">
                  <div>{index + 1}</div>
                  <div className="col-span-2">
                    <div className="font-medium text-white">{item.customer}</div>
                    <div className="text-xs text-gray-400">
                      {item.type === 'vip' 
                        ? 'VIP' 
                        : item.type === 'premium' 
                          ? 'Premium' 
                          : 'ทั่วไป'}
                    </div>
                  </div>
                  <div className="text-gray-300">{item.machineName}</div>
                  <div>
                    {item.waitTime > 0 
                      ? <span className="text-yellow-400">{item.waitTime} นาที</span> 
                      : <span className="text-green-400">พร้อมใช้งาน</span>}
                  </div>
                  <div className="text-gray-300">
                    <div>{formatDateAndTime(item.startTime)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* คิวของ Boosteroid */}
        <div className="bg-gray-800/50 rounded-xl border border-purple-500/30 p-5">
          <h4 className="text-lg font-medium text-purple-400 mb-4">
            คิว Boosteroid
            {queueDetails.boosteroid.available && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({queueDetails.boosteroid.availableMachines} ว่าง จากทั้งหมด {queueDetails.boosteroid.machineCount} เครื่อง)
              </span>
            )}
          </h4>
          
          {!queueDetails.boosteroid.available ? (
            <p className="text-gray-400">{queueDetails.boosteroid.message}</p>
          ) : queueDetails.boosteroid.queue.length === 0 ? (
            <p className="text-gray-400">ไม่มีลูกค้ารอคิว Boosteroid</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4 py-2 text-sm text-gray-400 border-b border-gray-700">
                <div>ลำดับ</div>
                <div className="col-span-2">ลูกค้า</div>
                <div>เครื่อง</div>
                <div>เวลารอ</div>
                <div>เริ่มใช้งาน</div>
              </div>
              {queueDetails.boosteroid.queue.map((item, index) => (
                <div key={item.customerId} className="grid grid-cols-6 gap-4 py-2 text-sm items-center">
                  <div>{index + 1}</div>
                  <div className="col-span-2">
                    <div className="font-medium text-white">{item.customer}</div>
                    <div className="text-xs text-gray-400">
                      {item.type === 'vip' 
                        ? 'VIP' 
                        : item.type === 'premium' 
                          ? 'Premium' 
                          : 'ทั่วไป'}
                    </div>
                  </div>
                  <div className="text-gray-300">{item.machineName}</div>
                  <div>
                    {item.waitTime > 0 
                      ? <span className="text-yellow-400">{item.waitTime} นาที</span> 
                      : <span className="text-green-400">พร้อมใช้งาน</span>}
                  </div>
                  <div className="text-gray-300">
                    <div>{formatDateAndTime(item.startTime)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {availableMachines.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="text-xl font-semibold text-white">เครื่องที่ว่าง</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableMachines.map(machine => (
              <div 
                key={machine.id}
                className={`bg-gray-800/50 rounded-xl border border-gray-500/30 p-4 hover:bg-gray-800/70 transition-all duration-200`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-white">{machine.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${machine.type === 'geforce_now' 
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                        {machine.type === 'geforce_now' ? 'GeForce Now' : 'Boosteroid'}
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    ว่าง
                  </span>
                </div>
                
                <button
                  onClick={() => selectRecommendation(machine, null)}
                  className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-medium transition-all duration-200"
                >
                  เลือกเครื่องนี้
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignMachine;