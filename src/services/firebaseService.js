import { db } from '../utils/firebaseConfig';

import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  setDoc, 
  getDocs,
  getDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

const QUEUE_COLLECTION = 'queue';
const MACHINES_COLLECTION = 'machines';

export const initializeMachines = async () => {
  try {
    const initialMachines = [
      {
        id: 'machine1',
        name: 'เครื่อง 1',
        inUse: false,
        currentCustomer: null,
        type: 'standard',
        status: 'available'
      },
      {
        id: 'machine2',
        name: 'เครื่อง 2',
        inUse: false,
        currentCustomer: null,
        type: 'standard',
        status: 'available'
      },
      {
        id: 'machine3',
        name: 'เครื่อง 3',
        inUse: false,
        currentCustomer: null,
        type: 'standard',
        status: 'available'
      }
    ];

    for (const machine of initialMachines) {
      await setDoc(doc(db, MACHINES_COLLECTION, machine.id), machine);
    }
    return initialMachines;
  } catch (error) {
    console.error('Error initializing machines:', error);
    throw error;
  }
};

export const checkAndInitializeMachines = async () => {
  try {
    const machinesRef = collection(db, MACHINES_COLLECTION);
    const snapshot = await getDocs(machinesRef);

    if (snapshot.empty) {
      return await initializeMachines();
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error checking machines:', error);
    throw error;
  }
};

export const getMachines = async () => {
  try {
    const machinesRef = collection(db, MACHINES_COLLECTION);
    const snapshot = await getDocs(machinesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting machines:", error);
    throw error;
  }
};

export const getQueue = async () => {
  try {
    const queueRef = collection(db, QUEUE_COLLECTION);
    const q = query(queueRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || null
    }));
  } catch (error) {
    console.error("Error getting queue:", error);
    throw error;
  }
};

// ฟังก์ชันสำหรับตรวจสอบและทำความสะอาดข้อมูลก่อนส่งไป Firestore
const cleanDataForFirestore = (data) => {
  const cleanData = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // ถ้าค่าไม่ใช่ undefined ให้เก็บไว้
    if (value !== undefined) {
      // ถ้าเป็น object ให้ทำความสะอาดซ้ำ
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        cleanData[key] = cleanDataForFirestore(value);
      } else {
        cleanData[key] = value;
      }
    }
  });
  
  return cleanData;
};

// อัพเดทสถานะเครื่อง
export const updateMachineStatus = async (machineId, updateData) => {
  try {
    const machineRef = doc(db, MACHINES_COLLECTION, machineId);
    // ทำความสะอาดข้อมูลก่อนส่งไป Firestore
    const cleanedData = cleanDataForFirestore(updateData);
    await updateDoc(machineRef, cleanedData);
  } catch (error) {
    console.error('Error updating machine status:', error);
    throw error;
  }
};

// อัพเดทสถานะในคิว
export const updateQueueStatus = async (queueId, updateData) => {
  try {
    const queueRef = doc(db, QUEUE_COLLECTION, queueId);
    // ทำความสะอาดข้อมูลก่อนส่งไป Firestore
    const cleanedData = cleanDataForFirestore(updateData);
    await updateDoc(queueRef, cleanedData);
  } catch (error) {
    console.error('Error updating queue status:', error);
    throw error;
  }
};

export const firebaseService = {
  async addToQueue(customer) {
    if (!customer || !customer.name || !customer.requestedTime) {
      throw new Error('Invalid customer data');
    }
    try {
      const customerData = {
        name: customer.name,
        joinedAt: new Date().toISOString(),
        requestedTime: customer.requestedTime,
        estimatedTime: customer.estimatedTime
      };
      const docRef = await addDoc(collection(db, QUEUE_COLLECTION), customerData);
      return { ...customerData, id: docRef.id };
    } catch (error) {
      console.error("Error adding customer to queue: ", error);
      throw error;
    }
  },

  async assignCustomerToMachine(machineId, customerId, startTime, duration = 1) {
    try {
      const machineRef = doc(db, MACHINES_COLLECTION, machineId);
      const customerRef = doc(db, QUEUE_COLLECTION, customerId);
      
      // อัปเดตสถานะเครื่อง
      await updateDoc(machineRef, {
        inUse: true,
        currentCustomer: customerId,
        startTime: startTime || serverTimestamp(),
        duration: duration || 1, // ใช้ค่าเริ่มต้นหากไม่มีการส่งค่า
        updatedAt: serverTimestamp()
      });
      
      // อัปเดตสถานะลูกค้า
      await updateDoc(customerRef, {
        status: 'in_progress',
        assignedMachine: machineId,
        startTime: startTime || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error assigning customer to machine:', error);
      throw error;
    }
  },

  async removeFromQueue(customerId) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    try {
      await deleteDoc(doc(db, QUEUE_COLLECTION, customerId));
    } catch (error) {
      console.error("Error removing customer from queue:", error);
      throw error;
    }
  },

  async resetMachine(machineId) {
    try {
      const machineRef = doc(db, 'machines', machineId);
      const machineDoc = await getDoc(machineRef);
      
      if (!machineDoc.exists()) {
        throw new Error('Machine not found');
      }

      const machineData = machineDoc.data();
      if (!machineData.inUse) {
        throw new Error('Machine is not in use');
      }

      const batch = writeBatch(db);

      // Reset machine status
      batch.update(machineRef, {
        inUse: false,
        currentCustomer: null
      });

      // Update customer status in queue if exists
      if (machineData.currentCustomer?.id) {
        const queueRef = doc(db, 'queue', machineData.currentCustomer.id);
        const queueDoc = await getDoc(queueRef);
        
        if (queueDoc.exists()) {
          batch.update(queueRef, {
            status: 'completed',
            completedAt: new Date()
          });
        }
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error resetting machine:', error);
      throw error;
    }
  },

  async addToQueue(customerData) {
    try {
      const queueRef = collection(db, 'queue');
      const now = serverTimestamp();
      
      const newCustomer = {
        ...customerData,
        createdAt: now,
        lastUpdated: now,
        assignedMachine: null,
        startTime: null
      };
      
      await addDoc(queueRef, newCustomer);
      return true;
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  },

  async subscribeToUpdates(callback) {
    const queueRef = collection(db, 'queue');
    const machinesRef = collection(db, 'machines');

    const queueUnsubscribe = onSnapshot(
      query(queueRef, orderBy('createdAt', 'asc')),
      (snapshot) => {
        const queueData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const machinesUnsubscribe = onSnapshot(machinesRef, (machinesSnapshot) => {
          const machinesData = machinesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(queueData, machinesData);
        });
        return () => {
          queueUnsubscribe();
          machinesUnsubscribe();
        };
      }
    );
  }
};

export const removeFromQueue = async (queueId) => {
  try {
    if (!queueId) {
      throw new Error('Queue ID is required');
    }
    
    const queueRef = doc(db, 'queue', queueId);
    await deleteDoc(queueRef);
    
    return true;
  } catch (error) {
    console.error('Error removing from queue:', error);
    throw error;
  }
};

export const assignCustomerToMachine = async (machineId, customerId, startTime, duration = 1) => {
  try {
    // เพิ่มค่าเริ่มต้นให้กับ duration
    const machineRef = doc(db, MACHINES_COLLECTION, machineId);
    const customerRef = doc(db, QUEUE_COLLECTION, customerId);
    
    // อัปเดตสถานะเครื่อง
    await updateDoc(machineRef, {
      inUse: true,
      currentCustomer: customerId,
      startTime: startTime || serverTimestamp(),
      duration: duration || 1, // ใช้ค่าเริ่มต้นหากไม่มีการส่งค่า
      updatedAt: serverTimestamp()
    });
    
    // อัปเดตสถานะลูกค้า
    await updateDoc(customerRef, {
      status: 'in_progress',
      assignedMachine: machineId,
      startTime: startTime || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error assigning customer to machine:', error);
    throw error;
  }
};

export const resetMachine = async (machineId) => {
  try {
    const machineRef = doc(db, 'machines', machineId);
    const machineDoc = await getDoc(machineRef);
    
    if (!machineDoc.exists()) {
      throw new Error('Machine not found');
    }

    const machineData = machineDoc.data();
    if (!machineData.inUse) {
      throw new Error('Machine is not in use');
    }

    const batch = writeBatch(db);

    // Reset machine status
    batch.update(machineRef, {
      inUse: false,
      currentCustomer: null,
      lastUpdated: serverTimestamp()
    });

    // Update customer status in queue if exists
    if (machineData.currentCustomer?.id) {
      const queueRef = doc(db, 'queue', machineData.currentCustomer.id);
      const queueDoc = await getDoc(queueRef);
      
      if (queueDoc.exists()) {
        batch.update(queueRef, {
          status: 'completed',
          completedAt: serverTimestamp()
        });
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error resetting machine:', error);
    throw error;
  }
};

export const subscribeMachines = (callback) => {
  const machinesRef = collection(db, MACHINES_COLLECTION);
  return onSnapshot(machinesRef, (snapshot) => {
    const machines = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(machines);
  });
};

export const subscribeQueue = (callback) => {
  const queueRef = collection(db, QUEUE_COLLECTION);
  const queueQuery = query(queueRef, orderBy('createdAt', 'asc'));
  return onSnapshot(queueQuery, (snapshot) => {
    const queue = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(queue);
  });
};

// เพิ่มเครื่องใหม่
export const addMachine = async (machineData) => {
  try {
    const machinesRef = collection(db, MACHINES_COLLECTION);
    const docRef = await addDoc(machinesRef, {
      ...machineData,
      status: 'offline', // เริ่มต้นด้วยสถานะ offline
      inUse: false,
      currentCustomer: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...machineData };
  } catch (error) {
    console.error('Error adding machine:', error);
    throw error;
  }
};

export const deleteMachine = async (machineId) => {
  try {
    const machineRef = doc(db, MACHINES_COLLECTION, machineId);
    await deleteDoc(machineRef);
    return true;
  } catch (error) {
    console.error('Error deleting machine:', error);
    throw error;
  }
};

// เพิ่มลูกค้าเข้าคิว
export const addCustomerToQueue = async (customerData) => {
  try {
    // ป้องกันกรณี customerData เป็น undefined
    if (!customerData) {
      throw new Error("ข้อมูลลูกค้าไม่ถูกต้อง");
    }
    
    // กำหนดค่า duration เริ่มต้นถ้าไม่มีค่า
    const finalData = {
      ...customerData,
      duration: customerData.duration || 1,
      status: 'waiting',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const queueRef = collection(db, QUEUE_COLLECTION);
    const docRef = await addDoc(queueRef, finalData);
    return { id: docRef.id, ...finalData };
  } catch (error) {
    console.error('Error adding customer to queue:', error);
    throw error;
  }
};