import { useState, useEffect } from 'react'
import './App.css'

export default function App() {
  const [step, setStep] = useState('COURSE')
  const [courseType, setCourseType] = useState(10)
  const [selectedDate, setSelectedDate] = useState(null)
  const [preferredTime, setPreferredTime] = useState("09:00 AM")
  const [itinerary, setItinerary] = useState([])
  const [busySlots, setBusySlots] = useState([])
  const [conflictDate, setConflictDate] = useState(null)
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '' })

  const timeSlots = ["09:00 AM", "10:30 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM"]
  const backendURL = "https://idrive-api.onrender.com"; // 🚀 DOUBLE CHECK THIS

  useEffect(() => {
    fetch(`${backendURL}/api/availability`)
      .then(res => res.json())
      .then(data => setBusySlots(data || []))
      .catch(err => console.error("Error fetching availability:", err));
  }, []);

  const isSlotBusy = (date, time) => {
    return busySlots.some(s => s.date === date && s.timeSlot === time);
  }

  const startSmartFill = (startDate, time) => {
    if (!startDate) return alert("Please select a date first!");
    
    let tempItinerary = [];
    let dayCounter = parseInt(startDate);
    
    for (let i = 0; i < courseType; i++) {
      let dateString = `May ${dayCounter}`;
      if (isSlotBusy(dateString, time)) {
        setConflictDate(dateString);
        setItinerary(tempItinerary);
        setStep('CONFLICT');
        return;
      } else {
        tempItinerary.push({ date: dateString, timeSlot: time });
        dayCounter++;
      }
    }
    setItinerary(tempItinerary);
    console.table(tempItinerary); // See your schedule in the F12 Console!
    setStep('REGISTRATION');
  }

  const resolveConflict = (newTime) => {
    const updatedItinerary = [...itinerary, { date: conflictDate, timeSlot: newTime }];
    setItinerary(updatedItinerary);
    const nextDay = parseInt(conflictDate.split(' ')[1]) + 1;
    setConflictDate(null);
    
    if (updatedItinerary.length < courseType) {
      // Re-run fill for remaining lessons
      let dayCounter = nextDay;
      let finalItin = [...updatedItinerary];
      for (let i = updatedItinerary.length; i < courseType; i++) {
        let dateString = `May ${dayCounter}`;
        if (isSlotBusy(dateString, preferredTime)) {
          setConflictDate(dateString);
          setItinerary(finalItin);
          setStep('CONFLICT');
          return;
        } else {
          finalItin.push({ date: dateString, timeSlot: preferredTime });
          dayCounter++;
        }
      }
      setItinerary(finalItin);
      setStep('REGISTRATION');
    } else {
      setStep('REGISTRATION');
    }
  }

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (itinerary.length === 0) return alert("Itinerary is empty!");

    const finalData = {
      ...formData,
      courseType,
      itinerary,
      startDate: itinerary[0].date,
      endDate: itinerary[itinerary.length - 1].date
    };

    try {
      const res = await fetch(`${backendURL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });
      if (res.ok) setStep('SUCCESS');
      else alert("Submission failed. Check backend logs.");
    } catch (err) {
      alert("Network error: " + err.message);
    }
  }

  return (
    <div className="app-container">
      <h1 className="main-title">iDrive Smart Portal</h1>

      {step === 'COURSE' && (
        <div className="step-container">
          <h2>Step 1: Select Your Package</h2>
          <div className="course-options">
            <button className="course-card" onClick={() => {setCourseType(10); setStep('CALENDAR')}}>10 Lessons</button>
            <button className="course-card" onClick={() => {setCourseType(15); setStep('CALENDAR')}}>15 Lessons</button>
            <button className="course-card" onClick={() => {setCourseType(22); setStep('CALENDAR')}}>22 Lessons</button>
          </div>
        </div>
      )}

      {step === 'CALENDAR' && (
        <div className="step-container">
          <h2>Step 2: When do you want to start?</h2>
          <div className="calendar-grid">
            {[...Array(30)].map((_, i) => (
              <button 
                key={i} 
                className={`calendar-day ${selectedDate === (i+1) ? 'selected' : ''}`}
                onClick={() => setSelectedDate(i+1)}
              >
                {i+1}
              </button>
            ))}
          </div>
          <div className="time-select-section">
            <p>Preferred Daily Time:</p>
            <select className="time-dropdown" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
              {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="primary-button" onClick={() => startSmartFill(selectedDate, preferredTime)}>Generate My Schedule</button>
        </div>
      )}

      {step === 'CONFLICT' && (
        <div className="step-container">
          <h2 className="warning">⚠️ Slot Conflict on {conflictDate}</h2>
          <p>Your preferred time ({preferredTime}) is taken. Pick an alternative for <strong>only this day</strong>:</p>
          <div className="time-slot-grid">
            {timeSlots.map(t => (
              <button 
                key={t} 
                className={`slot-button ${isSlotBusy(conflictDate, t) ? 'booked' : 'available'}`}
                disabled={isSlotBusy(conflictDate, t)}
                onClick={() => resolveConflict(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'REGISTRATION' && (
        <div className="step-container">
          <h2>Step 3: Confirm & Book</h2>
          <div className="itinerary-preview">
            {itinerary.map((item, idx) => (
              <div key={idx} className="itin-row">
                <span>{item.date}</span> <strong>{item.timeSlot}</strong>
              </div>
            ))}
          </div>
          <form className="registration-form" onSubmit={handleFinalSubmit}>
            <input type="text" placeholder="Full Name" required onChange={e => setFormData({...formData, fullName: e.target.value})} />
            <input type="email" placeholder="Email" required onChange={e => setFormData({...formData, email: e.target.value})} />
            <input type="tel" placeholder="Phone Number" required onChange={e => setFormData({...formData, phone: e.target.value})} />
            <button type="submit" className="primary-button">Confirm Booking</button>
          </form>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div className="step-container success-msg">
          <h2>🎉 Congratulations!</h2>
          <p>Your iDrive course is confirmed. See you on {itinerary[0]?.date}!</p>
          <button onClick={() => window.location.reload()}>Start Over</button>
        </div>
      )}
    </div>
  )
}
