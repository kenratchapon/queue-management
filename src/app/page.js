"use client";
import "./globals.css";
import QueueList from '@components/QueueList';
import AddCustomer from '../components/AddCustomer';
import AssignMachine from '@components/AssignMachine';
import MachineStatus from '../components/MachineStatus';
import MachineCalendar from '@components/MachineCalendar';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/firebaseConfig';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import QueueStatus from '../components/QueueStatus';
import { 
  checkAndInitializeMachines,
  getMachines,
  getQueue,
  updateMachineStatus,
  assignCustomerToMachine,
  resetMachine
} from '../services/firebaseService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import useMachineStore from '../store/machineStore';

export default function Home() {
  const {
    machines,
    queue,
    loading,
    error,
    setMachines,
    setQueue,
    setLoading,
    setError,
    subscribeToData
  } = useMachineStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        // ตรวจสอบและสร้างข้อมูลเครื่องเริ่มต้น
        const machines = await checkAndInitializeMachines();
        setMachines(machines);
        // เริ่มการติดตามการเปลี่ยนแปลงข้อมูล
        subscribeToData();
      } catch (error) {
        console.error('Error initializing app:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Cleanup subscriptions
    return () => {
      // ถ้ามี unsubscribe functions ให้เรียกที่นี่
    };
  }, []);

  const addCustomer = async (customerData) => {
    try {
      // แปลง duration เป็นจำนวนชั่วโมง
      const totalHours = 
        Number(customerData.duration.hours || 0) + 
        Number(customerData.duration.minutes || 0) / 60 + 
        Number(customerData.duration.seconds || 0) / 3600;

      const queueRef = collection(db, 'queue');
      await addDoc(queueRef, {
        name: customerData.name,
        contact: customerData.contact,
        duration: totalHours, // เก็บเป็นจำนวนชั่วโมง
        durationDetails: { // เก็บรายละเอียดแยก
          hours: Number(customerData.duration.hours || 0),
          minutes: Number(customerData.duration.minutes || 0),
          seconds: Number(customerData.duration.seconds || 0)
        },
        estimatedTime: customerData.estimatedTime,
        createdAt: serverTimestamp(),
        status: 'waiting'
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const handleResetMachine = async (machineId) => {
    try {
      await resetMachine(machineId);
    } catch (error) {
      console.error('Error resetting machine:', error);
      alert('Failed to reset machine');
    }
  };

  const removeFromQueue = async (queueId) => {
    try {
      const queueRef = doc(db, 'queue', queueId);
      await deleteDoc(queueRef);
      // ไม่ต้อง fetch ข้อมูลใหม่เพราะ onSnapshot จะทำให้อัตโนมัติ
    } catch (error) {
      console.error('Error removing from queue:', error);
      throw error;
    }
  };

  const updateQueueStatus = async (queueId, status) => {
    try {
      const queueRef = doc(db, 'queue', queueId);
      await updateDoc(queueRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
      // ไม่ต้อง fetch ข้อมูลใหม่เพราะ onSnapshot จะทำให้อัตโนมัติ
    } catch (error) {
      console.error('Error updating queue status:', error);
      throw error;
    }
  };

  const handleAssignCustomer = async (machineId, customerId, startTime) => {
    try {
      const queueData = queue.find(customer => customer.id === customerId);
      const machineData = machines.find(machine => machine.id === machineId);
      
      if (!queueData || !machineData) {
        throw new Error('Invalid customer or machine data');
      }

      await assignCustomerToMachine(machineId, customerId, queueData, machineData, startTime);
    } catch (error) {
      console.error('Error in handleAssignCustomer:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-block">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2 tracking-tight">
              Queue Management System
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mx-auto rounded-full"></div>
          </div>
          <p className="text-lg text-gray-400">
            Next-Generation Boosteroid Machine Management
          </p>
        </div>

        {/* Machine Status - Full Width */}
        <MachineStatus 
          machines={machines} 
          onReset={handleResetMachine} 
          onAssign={handleAssignCustomer}
          queue={queue}
        />

        {/* Machine Calendar - Full Width */}
        <div className="mb-8">
          <MachineCalendar machines={machines} queue={queue} />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Machines', value: machines.length },
            { label: 'In Use', value: machines.filter(m => m.inUse).length },
            { label: 'Available', value: machines.filter(m => !m.inUse).length },
            { label: 'In Queue', value: queue.length }
          ].map((stat, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <AddCustomer 
                onAddCustomer={addCustomer} 
                machines={machines}
                queue={queue}
              />
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <QueueList 
                queue={queue} 
                onRemove={removeFromQueue}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <AssignMachine
                queue={queue}
                machines={machines}
                onAssignCustomer={handleAssignCustomer}
              />
            </div>
          </div>
        </div>

        <QueueStatus 
          queue={queue}
          onRemove={removeFromQueue}
          onUpdateStatus={updateQueueStatus}
        />
      </div>
    </div>
  );
}