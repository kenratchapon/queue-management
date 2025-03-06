"use client"
import React, { useState, useEffect } from 'react';
import useMachineStore from '../store/machineStore';

const WaitingTimer = ({ startTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const triggerUpdate = useMachineStore(state => state.triggerUpdate);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!startTime?.toDate) return null;
      
      const start = startTime.toDate();
      const now = new Date();
      const difference = start - now;

      if (difference <= 0) {
        setIsStarted(true);
        if (onExpire) onExpire();
        return null;
      }

      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    };

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (!newTimeLeft) {
        clearInterval(timer);
      }
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [startTime, onExpire]);

  useEffect(() => {
    if (isStarted) {
      triggerUpdate();
    }
  }, [isStarted, triggerUpdate]);

  if (!timeLeft) return null;

  return (
    <div className="font-mono text-yellow-400">
      {timeLeft.hours > 0 && (
        <span>{String(timeLeft.hours).padStart(2, '0')}:</span>
      )}
      <span>{String(timeLeft.minutes).padStart(2, '0')}:</span>
      <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
    </div>
  );
};

export default WaitingTimer; 