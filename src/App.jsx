import { useState, useEffect } from 'react'
import './App.css'

export default function App() {
  const [step, setStep] = useState('COURSE')
  const [courseType, setCourseType] = useState(10)
  const [selectedDate, setSelectedDate] = useState(null)
  const [preferredTime, setPreferredTime] = useState("09:00 AM")
  const [itinerary, setItinerary] = useState([])
  const [busySlots, setBusySlots] = useState([]) // Data from Cloud
  const [conflictDate, setConflictDate] = useState(null)
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '' })

  const timeSlots = ["09:00 AM", "10:30 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM"]

  useEffect(() => {
    // 🚀 YOUR RENDER URL HERE 🚀
    fetch('https://idrive-backend-live.onrender.com/api/availability')
      .then(res => res.json())
      .then(data => setBusySlots(data));
  }, []);

  const isSlotBusy = (date, time) => {
    return busySlots.some(s => s.date === date && s.timeSlot === time);
  }

  // The Smart-Fill Engine
  const startSmartFill = (startDate, time) => {
    let tempItinerary = [];
    let dayCounter = parseInt(startDate);
    
    for (let i = 0; i < courseType; i++) {
      let dateString = `May ${dayCounter}`;
      
      if (isSlotBusy(dateString, time)) {
        // STOP! Conflict found.
        setConflictDate(dateString);
        setItinerary(tempItinerary); // Save what we have so far
        setStep('CONFLICT');
        return;
      } else {
        tempItinerary.push({ date: dateString, timeSlot: time });
        dayCounter++;
      }
    }
    setItinerary(tempItinerary);
    setStep('REGISTRATION');
  }

  const resolveConflict = (newTime) => {
    const updatedItinerary = [...itinerary, { date: conflictDate, timeSlot: newTime }];
    setItinerary(updatedItinerary);
    setConflictDate(null);
    
    // Check if we need more lessons
    if (updatedItinerary.length < courseType) {
      // Continue filling from the NEXT day
      const nextDay = parseInt(updatedItinerary[updatedItinerary.length - 1].date.split(' ')[1]) + 1;
      setStep('CALENDAR'); // Briefly show calendar or just auto-continue
      startSmartFill(nextDay, preferredTime);
    } else {
      setStep('REGISTRATION');
    }
  }

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      courseType,
      itinerary,
      startDate: itinerary[0].date,
      endDate: itinerary[itinerary.length - 1].date
    };

    // 🚀 YOUR RENDER URL HERE 🚀
    const res = await fetch('https://idrive-backend-live.onrender.com/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalData)
    });
    if (res.ok) setStep('SUCCESS');
  }

  return (
    <div className="app-container">
      <h1>iDrive Smart Portal</h1>

      {step === 'COURSE' && (
        <div className="card">
          <h2>Select Course</h2>
          <button onClick={() => {setCourseType(10); setStep('CALENDAR')}}>10 Lessons</button>
          <button onClick={() => {setCourseType(15); setStep('CALENDAR')}}>15 Lessons</button>
        </div>
      )}

      {step === 'CALENDAR' && (
        <div className="card">
          <h2>Select Start Date & Preferred Time</h2>
          <div className="calendar-grid">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="day" onClick={() => setSelectedDate(i+1)}>{i+1}</div>
            ))}
          </div>
          <select onChange={(e) => setPreferredTime(e.target.value)}>
            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => startSmartFill(selectedDate, preferredTime)}>Generate Schedule</button>
        </div>
      )}

      {step === 'CONFLICT' && (
        <div className="card conflict-ui">
          <h2 className="warning">⚠️ Slot Conflict!</h2>
          <p>Your preferred time (<strong>{preferredTime}</strong>) is busy on <strong>{conflictDate}</strong>.</p>
          <p>Please pick an alternative time for this specific day:</p>
          <div className="slot-grid">
            {timeSlots.map(t => (
              <button 
                key={t} 
                disabled={isSlotBusy(conflictDate, t)}
                onClick={() => resolveConflict(t)}
              >
                {t} {isSlotBusy(conflictDate, t) ? "(Busy)" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'REGISTRATION' && (
        <div className="card">
          <h2>Confirm Your Itinerary</h2>
          <div className="itinerary-list">
            {itinerary.map((item, idx) => (
              <div key={idx} className="itin-item">{item.date}: <strong>{item.timeSlot}</strong></div>
            ))}
          </div>
          <form onSubmit={handleFinalSubmit}>
            <input type="text" placeholder="Full Name" required onChange={e => setFormData({...formData, fullName: e.target.value})} />
            <input type="email" placeholder="Email" required onChange={e => setFormData({...formData, email: e.target.value})} />
            <button type="submit">Book Now</button>
          </form>
        </div>
      )}

      {step === 'SUCCESS' && <h2>🎉 Booking Confirmed!</h2>}
    </div>
  )
}