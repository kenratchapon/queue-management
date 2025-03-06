import { create } from 'zustand';
import { 
  updateMachineStatus as updateMachineInDB,
  updateQueueStatus as updateQueueInDB,
  subscribeMachines,
  subscribeQueue 
} from '../services/firebaseService';

const useMachineStore = create((set) => ({
  machines: [],
  queue: [],
  loading: false,
  error: null,

  triggerUpdate: () => {
    set((state) => ({
      ...state,
      machines: [...state.machines],
      queue: [...state.queue]
    }));
  },

  setMachines: (machines) => set({ machines }),
  setQueue: (queue) => set({ queue }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // สำหรับ reset ค่าทั้งหมด
  resetStore: () => set({
    machines: [],
    queue: [],
    loading: false,
    error: null
  }),

  // Subscribe to data changes
  subscribeToData: () => {
    subscribeMachines((machines) => set({ machines }));
    subscribeQueue((queue) => set({ queue }));
  },

  updateMachineStatus: async (machineId, updateData) => {
    try {
      await updateMachineInDB(machineId, updateData);
      // อัพเดท state ใน store ทันที
      set(state => ({
        machines: state.machines.map(machine =>
          machine.id === machineId
            ? { ...machine, ...updateData }
            : machine
        )
      }));
    } catch (error) {
      console.error('Error updating machine status:', error);
      throw error;
    }
  },

  updateCustomerStatus: async (customerId, updateData) => {
    try {
      await updateQueueInDB(customerId, updateData);
      // อัพเดท state ใน store ทันที
      set(state => ({
        queue: state.queue.map(customer =>
          customer.id === customerId
            ? { ...customer, ...updateData }
            : customer
        )
      }));
    } catch (error) {
      console.error('Error updating customer status:', error);
      throw error;
    }
  }
}));

export default useMachineStore; 