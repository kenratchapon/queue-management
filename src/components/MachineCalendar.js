"use client"
import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import useMachineStore from '../store/machineStore';

const MachineCalendar = () => {
  const machines = useMachineStore(state => state.machines);
  const queue = useMachineStore(state => state.queue);

  // แปลง Firestore Timestamp เป็น Date
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

  // แปลงข้อมูลเครื่องและคิวเป็น events
  const getEvents = () => {
    const events = [];

    // เพิ่ม events จากเครื่องที่กำลังใช้งาน
    machines.forEach(machine => {
      if (machine.currentCustomer) {
        const startTime = getDateFromTimestamp(machine.currentCustomer.startTime);
        if (startTime) {
          const endTime = new Date(startTime.getTime() + 
            (machine.currentCustomer.duration * 60 * 60 * 1000));
          
          events.push({
            title: `${machine.name} - ${machine.currentCustomer.name}`,
            start: startTime,
            end: endTime,
            backgroundColor: '#f97316', // สีส้มสำหรับกำลังใช้งาน
            borderColor: '#ea580c',
            textColor: '#ffffff',
            extendedProps: {
              machineId: machine.id,
              customerName: machine.currentCustomer.name,
              duration: machine.currentCustomer.duration,
              status: 'using'
            }
          });
        }
      }
    });

    // เพิ่ม events จากคิวที่รอ
    queue.forEach(customer => {
      if (customer.status === 'waiting' && customer.requestedTime) {
        const startTime = getDateFromTimestamp(customer.requestedTime);
        if (startTime) {
          const endTime = new Date(startTime.getTime() + 
            (customer.duration * 60 * 60 * 1000));
          
          events.push({
            title: `รอคิว - ${customer.name}`,
            start: startTime,
            end: endTime,
            backgroundColor: '#eab308', // สีเหลืองสำหรับรอคิว
            borderColor: '#ca8a04',
            textColor: '#ffffff',
            extendedProps: {
              customerId: customer.id,
              customerName: customer.name,
              duration: customer.duration,
              status: 'waiting'
            }
          });
        }
      }
    });

    return events;
  };

  const renderEventContent = (eventInfo) => {
    const { extendedProps } = eventInfo.event;
    const startTime = eventInfo.event.start;
    const endTime = eventInfo.event.end;
    const formattedStart = startTime.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const formattedEnd = endTime.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <div className="p-1">
        <div className="font-semibold">{eventInfo.event.title}</div>
        <div className="text-xs space-y-1">
          <div>เวลา: {formattedStart} - {formattedEnd}</div>
          <div>ระยะเวลา: {extendedProps.duration} ชั่วโมง</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl mb-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-6">
        ปฏิทินการใช้งานเครื่อง
      </h2>
      <div className="calendar-container dark-theme bg-gray-800/50 rounded-xl p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek'
          }}
          locale="th"
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          events={getEvents()}
          eventContent={renderEventContent}
          height="auto"
          allDaySlot={false}
          slotDuration="01:00:00"
          nowIndicator={true}
          eventOverlap={false}
          slotEventOverlap={false}
          expandRows={true}
          stickyHeaderDates={true}
          dayMaxEvents={true}
          buttonText={{
            today: 'วันนี้',
            day: 'วัน',
            week: 'สัปดาห์'
          }}
        />
      </div>
    </div>
  );
};

export default MachineCalendar; 