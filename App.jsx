import { useState, useEffect } from 'react'
import './App.css'

export default function App() {
  const [currentStep, setCurrentStep] = useState('COURSE')
  const [courseType, setCourseType] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [existingBookings, setExistingBookings] = useState([])
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '' })

  const availableTimes = ["09:00 AM", "10:30 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM"]

  // Business Rules
  const limits = { 10: 15, 15: 20, 22: 30 };

  useEffect(() => {
    // 🚀 NEW CLOUD URL HERE 🚀 (Double check this matches your Render dashboard!)
    fetch('https://idrive-api.onrender.com/api/bookings')
      .then(res => res.json())
      .then(data => setExistingBookings(data));
  }, []);

  // --- THE SMART-FILL ENGINE ---
  const getSmartSchedule = (start, type, time) => {
    let schedule = [];
    let dayToCheck = parseInt(start);
    let lessonsFound = 0;

    while (lessonsFound < type && dayToCheck <= 40) { // Check up to 40 days out
      const isBusy = existingBookings.some(b => 
        b.timeSlot === time && b.scheduledDates.includes(dayToCheck.toString())
      );

      if (!isBusy) {
        schedule.push(dayToCheck.toString());
        lessonsFound++;
      }
      dayToCheck++;
    }

    const totalSpan = dayToCheck - parseInt(start);
    return {
      dates: schedule,
      span: totalSpan,
      isValid: totalSpan <= limits[type],
      endDate: schedule[schedule.length - 1]
    };
  };

  const handleTimeSelection = (time) => {
    const schedule = getSmartSchedule(selectedDate, courseType, time);
    if (!schedule.isValid) {
      alert(`This slot is too busy! A ${courseType}-day course would take ${schedule.span} days, exceeding our ${limits[courseType]}-day limit. Please try another time or date.`);
      return;
    }
    setSelectedTime(time);
    setCurrentStep('REGISTRATION');
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    const schedule = getSmartSchedule(selectedDate, courseType, selectedTime);
    
    const finalData = {
      ...formData,
      courseType,
      timeSlot: selectedTime,
      startDate: selectedDate,
      endDate: schedule.endDate,
      scheduledDates: schedule.dates
    };

    // 🚀 NEW CLOUD URL HERE 🚀 (Double check this matches your Render dashboard!)
    const res = await fetch('https://idrive-api.onrender.com/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalData)
    });

    if (res.ok) setCurrentStep('SUCCESS');
  };

  return (
    <div className="app-container">
      <h1>iDrive Driving Institute</h1>

      {currentStep === 'COURSE' && (
        <div className="step-container">
          <h2>Select Your Package</h2>
          <div className="course-options">
            <div className="course-card" onClick={() => {setCourseType(10); setCurrentStep('CALENDAR')}}><h3>10 Lessons (Max 15 Days)</h3></div>
            <div className="course-card" onClick={() => {setCourseType(15); setCurrentStep('CALENDAR')}}><h3>15 Lessons (Max 20 Days)</h3></div>
            <div className="course-card" onClick={() => {setCourseType(22); setCurrentStep('CALENDAR')}}><h3>22 Lessons (Max 30 Days)</h3></div>
          </div>
        </div>
      )}

      {currentStep === 'CALENDAR' && (
        <div className="step-container">
          <button onClick={() => setCurrentStep('COURSE')}>← Back</button>
          <h2>Start Date: May {selectedDate || '...'}</h2>
          <div className="calendar-grid">
            {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
              <div key={day} className={`calendar-day ${selectedDate === day ? 'selected' : ''}`} onClick={() => setSelectedDate(day)}>{day}</div>
            ))}
          </div>

          {selectedDate && (
            <div className="time-selection">
              <h3>Available Daily Slots:</h3>
              <div className="time-slot-grid">
                {availableTimes.map(time => {
                  const s = getSmartSchedule(selectedDate, courseType, time);
                  return (
                    <button 
                      key={time} 
                      className={`slot-button ${!s.isValid ? 'booked' : 'available'}`}
                      onClick={() => handleTimeSelection(time)}
                    >
                      {time} {!s.isValid && "(Limit Exceeded)"}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 'REGISTRATION' && (
        <div className="step-container">
          <h2>Review Your Schedule</h2>
          <div className="schedule-box">
            <p><strong>Time:</strong> {selectedTime}</p>
            <p><strong>Duration:</strong> {getSmartSchedule(selectedDate, courseType, selectedTime).span} days total</p>
            <div className="date-chips">
              {getSmartSchedule(selectedDate, courseType, selectedTime).dates.map(d => <span key={d} className="chip">May {d}</span>)}
            </div>
            <p className="note">*If a slot becomes unavailable later, you can switch times in your dashboard.</p>
          </div>
          <form onSubmit={submitBooking} className="registration-form">
            <input type="text" placeholder="Full Name" required onChange={e => setFormData({...formData, fullName: e.target.value})} />
            <input type="email" placeholder="Email" required onChange={e => setFormData({...formData, email: e.target.value})} />
            <input type="tel" placeholder="Phone" required onChange={e => setFormData({...formData, phone: e.target.value})} />
            <button type="submit" className="primary-button">Confirm & Pay</button>
          </form>
        </div>
      )}

      {currentStep === 'SUCCESS' && (
        <div className="step-container">
          <h2>🎉 Booking Confirmed!</h2>
          <p>Check your email for your personalized smart-schedule.</p>
          <button onClick={() => window.location.reload()}>Finish</button>
        </div>
      )}
    </div>
  )
}