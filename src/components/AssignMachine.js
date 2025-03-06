"use client"
import React, { useState, useEffect } from 'react';
import useMachineStore from '../store/machineStore';
import { formatTime, formatDateTime } from '../utils/formatTime';

const AssignMachine = () => {
  const machines = useMachineStore(state => state.machines);
  const queue = useMachineStore(state => state.queue);
  const updateMachineStatus = useMachineStore(state => state.updateMachineStatus);
  const updateCustomerStatus = useMachineStore(state => state.updateCustomerStatus);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [recommendations, setRecommendations] = useState([]);

  const availableMachines = machines;
  const waitingCustomers = queue.filter(customer => customer.status === 'waiting');

  // แปลง timestamp เป็น Date object
  const getDateFromTimestamp = (timestamp) => {
    if (!timestamp) return null;
    try {
      // กรณีเป็น Firestore Timestamp
      if (timestamp.toDate) {
        return timestamp.toDate();
      }
      // กรณีเป็น string หรือ number
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
      }
      // กรณีเป็น Date object
      if (timestamp instanceof Date) {
        return timestamp;
      }
      return null;
    } catch (error) {
      console.error('Error converting timestamp:', error);
      return null;
    }
  };

  // คำนวณเวลารอ (นาที)
  const calculateWaitingTime = (availableTime) => {
    const now = new Date();
    const time = getDateFromTimestamp(availableTime);
    if (!time) return 0;
    return Math.max(0, (time.getTime() - now.getTime()) / (1000 * 60));
  };

  // คำนวณคะแนนความเหมาะสม
  const calculateAssignmentScore = (customer, machine, waitingTime) => {
    let score = waitingTime;
    
    if (!machine.inUse) {
      score -= 1000; // เครื่องว่างได้คะแนนดีกว่า
    }
    
    const requestedTime = getDateFromTimestamp(customer.requestedTime);
    if (requestedTime) {
      const now = new Date();
      const waitingDuration = (now.getTime() - requestedTime.getTime()) / (1000 * 60);
      score -= waitingDuration * 0.5; // ลูกค้าที่รอนานได้คะแนนดีกว่า
    }

    return score;
  };

  // คำนวณเวลาที่เครื่องจะว่างหลังจากใช้งานปัจจุบันและคิวที่รออยู่
  const calculateMachineAvailability = (machine, queuedCustomers) => {
    let availableTime = new Date();
    let currentQueue = [];

    // ถ้าเครื่องกำลังใช้งาน คำนวณเวลาที่จะว่างหลังใช้งานปัจจุบัน
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

    // คำนวณเวลาสำหรับคิวที่รออยู่
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

  // สร้างข้อความแสดงรายละเอียดคิว
  const generateQueueDetails = (currentQueue) => {
    if (currentQueue.length === 0) return "เครื่องว่างพร้อมใช้งานทันที";

    return currentQueue.map((queue, index) => {
      const endTime = formatDateTime(queue.endTime);
      const duration = queue.duration ? ` (${queue.duration} ชั่วโมง)` : '';
      return `${index + 1}. ${queue.name}${duration} จะเสร็จเมื่อ ${endTime}`;
    }).join('\n');
  };

  // สร้างคำแนะนำ
  const generateRecommendations = () => {
    const waitingCustomers = queue
      .filter(customer => customer.status === 'waiting')
      .sort((a, b) => {
        const timeA = getDateFromTimestamp(a.requestedTime)?.getTime() || 0;
        const timeB = getDateFromTimestamp(b.requestedTime)?.getTime() || 0;
        return timeA - timeB;
      });

    // สร้าง map เก็บคิวที่จะถูกจัดให้แต่ละเครื่อง
    const machineQueues = new Map(machines.map(machine => [machine.id, []]));
    
    // คำนวณเวลาเริ่มต้นของแต่ละเครื่อง
    const machineStatus = machines.map(machine => {
      const { availableTime, currentQueue } = calculateMachineAvailability(machine, []);
      return {
        ...machine,
        availableTime,
        currentQueue,
        nextAvailableTime: availableTime // เวลาที่จะว่างหลังจากจัดคิวเพิ่ม
      };
    });

    // สร้างคำแนะนำสำหรับแต่ละลูกค้าในคิว
    const newRecommendations = waitingCustomers.map(customer => {
      // หาเครื่องที่เหมาะสมที่สุดสำหรับลูกค้าคนนี้
      const machineOptions = machineStatus
        .map(machine => {
          // คำนวณเวลารอจากเวลาที่เครื่องจะว่างถัดไป
          const waitingTime = calculateWaitingTime(machine.nextAvailableTime);
          const score = calculateAssignmentScore(customer, machine, waitingTime);

          return {
            machine,
            waitingTime,
            score,
            queueDetails: generateQueueDetails([
              ...machine.currentQueue,
              ...machineQueues.get(machine.id)
            ])
          };
        })
        .sort((a, b) => a.score - b.score);

      if (machineOptions.length > 0) {
        const bestOption = machineOptions[0];
        const recommendedMachine = bestOption.machine;

        // คำนวณเวลาเริ่มและเวลาจบสำหรับลูกค้านี้
        const startTime = new Date(recommendedMachine.nextAvailableTime);
        const endTime = new Date(startTime.getTime() + (customer.duration * 60 * 60 * 1000));

        // อัพเดทเวลาที่เครื่องจะว่างถัดไป
        const machineIndex = machineStatus.findIndex(m => m.id === recommendedMachine.id);
        machineStatus[machineIndex].nextAvailableTime = endTime;

        // เพิ่มลูกค้าเข้าคิวของเครื่องที่แนะนำ
        machineQueues.get(recommendedMachine.id).push({
          name: customer.name,
          endTime: endTime,
          duration: customer.duration
        });

        return {
        customer,
          recommendedMachine,
          waitingTime: bestOption.waitingTime,
          queueDetails: bestOption.queueDetails,
          startTime: startTime
        };
      }
      return null;
    }).filter(Boolean);

    setRecommendations(newRecommendations);
  };

  // อัพเดทคำแนะนำเมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    if (machines.length > 0 && queue.length > 0) {
      generateRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [machines, queue]);

  // สร้าง default start time ในโซนเวลาประเทศไทย
  const getDefaultStartTime = () => {
    const now = new Date();
    // ปรับเวลาเป็นโซนประเทศไทย
    const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    
    // จัดรูปแบบให้เป็น YYYY-MM-DDThh:mm
    const year = bangkokTime.getFullYear();
    const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
    const day = String(bangkokTime.getDate()).padStart(2, '0');
    const hours = String(bangkokTime.getHours()).padStart(2, '0');
    const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // ฟังก์ชันจัดการการ assign ลูกค้าให้กับเครื่อง
  const onAssignCustomer = async (machineId, customerId, startTime) => {
    try {
      // หาข้อมูลลูกค้าและเครื่องที่เลือก
      const customer = queue.find(c => c.id === customerId);
      const machine = machines.find(m => m.id === machineId);

      if (!customer || !machine) {
        throw new Error('ไม่พบข้อมูลลูกค้าหรือเครื่อง');
      }

      // สร้างข้อมูลลูกค้าที่จะอัพเดท โดยตรวจสอบค่า undefined
      const customerData = {
        id: customer.id,
        name: customer.name || '',
        contact: customer.contact || '',
        startTime: startTime || new Date(),
        duration: customer.duration || 0
      };

      // เพิ่มข้อมูลเพิ่มเติมถ้ามี
      if (customer.requestedTime) {
        customerData.requestedTime = customer.requestedTime;
      }
      if (customer.durationDetails) {
        customerData.durationDetails = customer.durationDetails;
      }

      // อัพเดทสถานะเครื่อง
      await updateMachineStatus(machineId, {
        inUse: true,
        currentCustomer: customerData
      });

      // อัพเดทสถานะลูกค้า
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

  // รีเซ็ตฟอร์ม
  const resetForm = () => {
      setSelectedCustomer('');
      setSelectedMachine('');
    setSelectedStartTime('');
  };

  // จัดการการ assign
  const handleAssign = async () => {
    if (!selectedCustomer || !selectedMachine || !selectedStartTime) {
      alert('กรุณาเลือกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      await onAssignCustomer(selectedMachine, selectedCustomer, new Date(selectedStartTime));
      resetForm();
    } catch (error) {
      console.error('Error assigning customer:', error);
      alert('เกิดข้อผิดพลาดในการจัดสรรเครื่อง');
    }
  };

  // เมื่อเลือกลูกค้า ให้ set startTime เป็นเวลาที่ลูกค้าขอจอง
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

      {/* แสดงคำแนะนำ */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div key={index} className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/30">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {rec.customer?.name || 'ไม่ระบุชื่อ'}
                </h3>
                <p className="text-sm text-gray-400">
                  เวลาที่ขอจอง: {formatDateTime(rec.customer?.requestedTime)}
                </p>
              </div>
              <span className="px-4 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                ลำดับที่ {index + 1}
              </span>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 mt-4">
              <p className={`font-medium ${rec.recommendedMachine.inUse ? 'text-yellow-400' : 'text-green-400'}`}>
                {rec.recommendedMachine.inUse 
                  ? `แนะนำให้รอ: ${rec.recommendedMachine.name}`
                  : `แนะนำให้ใช้: ${rec.recommendedMachine.name}`
                }
              </p>
              <div className="text-gray-400 mt-2 whitespace-pre-line">
                <p className="font-medium mb-2">รายละเอียดคิว:</p>
                {rec.queueDetails}
              </div>
              {rec.waitingTime > 0 && (
                <p className="text-gray-400 mt-2">
                  เวลารอโดยประมาณ: {Math.round(rec.waitingTime)} นาที
                </p>
              )}
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">คาดว่าจะเริ่มได้เมื่อ:</span>
                <span className="text-white">{formatDateTime(rec.startTime)}</span>
              </div>
            </div>

            {rec.customer?.id && rec.recommendedMachine?.id && (
              <button
                onClick={() => {
                  setSelectedCustomer(rec.customer.id);
                  setSelectedMachine(rec.recommendedMachine.id);
                }}
                className="mt-4 w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 
                         hover:from-purple-600 hover:to-pink-600 rounded-lg text-white
                         transition-all duration-200"
              >
                เลือกตามคำแนะนำ
              </button>
            )}
          </div>
        ))}
        
        {recommendations.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            ไม่มีคำแนะนำในขณะนี้
          </div>
        )}
      </div>

      {/* ส่วนเลือกด้วยตนเอง */}
      <div className="mt-8 space-y-6">
        <h3 className="text-xl font-semibold text-white">หรือเลือกด้วยตนเอง</h3>
        <div className="space-y-4">
          {/* เลือกลูกค้า */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              เลือกลูกค้า
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full p-3 bg-gray-800/50 border border-purple-500/30 rounded-xl
                       text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">เลือกลูกค้า</option>
              {queue
                .filter(customer => customer.status === 'waiting')
                .map(customer => (
                <option key={customer.id} value={customer.id}>
                    {customer.name} - {formatDateTime(customer.requestedTime)}
                </option>
              ))}
            </select>
          </div>

          {/* เลือกเครื่อง */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              เลือกเครื่อง
            </label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
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
                  {machine.name} {machine.inUse ? '(กำลังใช้งาน)' : '(ว่าง)'}
                </option>
              ))}
            </select>
          </div>

          {/* เลือกเวลาเริ่ม */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              เวลาเริ่มต้น
            </label>
            <input
              type="datetime-local"
              value={selectedStartTime}
              onChange={(e) => setSelectedStartTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full p-3 bg-gray-800/50 border border-purple-500/30 rounded-xl
                       text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* ปุ่มจัดสรรเครื่อง */}
          <button
            onClick={handleAssign}
            disabled={!selectedCustomer || !selectedMachine || !selectedStartTime}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                     hover:from-purple-600 hover:to-pink-600 rounded-lg text-white
                     font-semibold transition-all duration-200 disabled:opacity-50
                     disabled:cursor-not-allowed"
          >
            จัดสรรเครื่อง
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignMachine;