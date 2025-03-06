"use client"
import "../../app/globals.css";
import React, { useEffect, useState } from 'react';
import useMachineStore from '../../store/machineStore';
import { formatDateTime, formatDuration } from '../../utils/formatTime';
import MachineCalendar from '../../components/MachineCalendar';
import MachineStatus from '../../components/MachineStatus';

const CustomerView = () => {
  const {
    machines,
    queue,
    loading,
    error,
    subscribeToData
  } = useMachineStore();

  const [recommendations, setRecommendations] = useState([]);

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

  // คำนวณเวลาที่เครื่องจะว่าง
  const calculateMachineAvailability = (machine) => {
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

    const assignedToMachine = queue.filter(c => c.assignedMachine === machine.id);
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

    const machineQueues = new Map(machines.map(machine => [machine.id, []]));
    
    const machineStatus = machines.map(machine => {
      const { availableTime, currentQueue } = calculateMachineAvailability(machine);
      return {
        ...machine,
        availableTime,
        currentQueue,
        nextAvailableTime: availableTime
      };
    });

    const newRecommendations = waitingCustomers.map(customer => {
      const machineOptions = machineStatus
        .map(machine => {
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

        const startTime = new Date(recommendedMachine.nextAvailableTime);
        const endTime = new Date(startTime.getTime() + (customer.duration * 60 * 60 * 1000));

        const machineIndex = machineStatus.findIndex(m => m.id === recommendedMachine.id);
        machineStatus[machineIndex].nextAvailableTime = endTime;

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

  useEffect(() => {
    subscribeToData();
  }, []);

  useEffect(() => {
    if (machines.length > 0 && queue.length > 0) {
      generateRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [machines, queue]);

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
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-slate-800/80" />
      
      {/* Content */}
      <div className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 space-y-4">
            <div className="inline-block">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2 tracking-tight">
                Cloud Gaming Status
              </h1>
              <div className="h-1 w-32 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mx-auto rounded-full"></div>
            </div>
            <p className="text-lg text-gray-400">
              ระบบแสดงสถานะเครื่องและคิว
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'เครื่องทั้งหมด', value: machines.length },
              { label: 'กำลังใช้งาน', value: machines.filter(m => m.inUse).length },
              { label: 'ว่าง', value: machines.filter(m => !m.inUse).length },
              { label: 'คิวที่รอ', value: queue.filter(q => q.status === 'waiting').length }
            ].map((stat, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Machine Status */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-6">
              สถานะเครื่องเกม
            </h2>
            <MachineStatus 
              machines={machines} 
              queue={queue}
              readOnly={true}
            />
          </div>
          {/* Recommendations Section */}
          <div className="p-6 space-y-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              คิวที่รอ
            </h2>

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
                </div>
              ))}
              
              {recommendations.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  ไม่มีคิวในขณะนี้
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerView;
