import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
import './App.css';

export default function App() {
  const [step, setStep] = useState('COURSE');
  const [courseType, setCourseType] = useState(10);
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [preferredTime, setPreferredTime] = useState("09:00 AM");
  const [itinerary, setItinerary] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [conflictDate, setConflictDate] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '' });

  const timeSlots = ["09:00 AM", "10:30 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM"];
  const backendURL = "https://idrive-api.onrender.com";

  // Fetch all bookings from the server
  useEffect(() => {
    fetch(`${backendURL}/api/availability`)
      .then(res => res.json())
      .then(data => setBusySlots(data || []))
      .catch(err => console.error("Error fetching availability:", err));
  }, []);

  // Helper functions for Dates
  const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // 🚀 THE NEW ENTERPRISE FLEET LOGIC 🚀
  const isSlotBusy = (dateStr, time) => {
    // Count how many people are already booked for this exact date and time
    const count = busySlots.filter(s => s.date === dateStr && s.timeSlot === time).length;
    // Return TRUE (Busy) ONLY if 4 cars are already taken
    return count >= 4; 
  };

  // The Smart-Fill Engine
  const startSmartFill = (startDate, time) => {
    if (!startDate) return alert("Please select a date first!");
    
    let tempItinerary = [];
    let currentDate = new Date(startDate);
    let lessonsFound = 0;
    let limitSafety = 0; 

    while (lessonsFound < courseType && limitSafety < 60) {
      let dateString = formatDate(currentDate);

      if (isSlotBusy(dateString, time)) {
        setConflictDate(dateString);
        setItinerary(tempItinerary);
        setStep('CONFLICT');
        return;
      } else {
        tempItinerary.push({ date: dateString, timeSlot: time });
        lessonsFound++;
      }
      currentDate = addDays(currentDate, 1);
      limitSafety++;
    }
    
    setItinerary(tempItinerary);
    setStep('REGISTRATION');
  };

  const resolveConflict = (newTime) => {
    const updatedItinerary = [...itinerary, { date: conflictDate, timeSlot: newTime }];
    setItinerary(updatedItinerary);
    setConflictDate(null);
    
    if (updatedItinerary.length < courseType) {
      let lastDate = new Date(conflictDate);
      let currentDate = addDays(lastDate, 1);
      let finalItin = [...updatedItinerary];
      let lessonsFound = finalItin.length;
      let limitSafety = 0;

      while (lessonsFound < courseType && limitSafety < 60) {
        let dateString = formatDate(currentDate);
        if (isSlotBusy(dateString, preferredTime)) {
          setConflictDate(dateString);
          setItinerary(finalItin);
          setStep('CONFLICT');
          return;
        } else {
          finalItin.push({ date: dateString, timeSlot: preferredTime });
          lessonsFound++;
        }
        currentDate = addDays(currentDate, 1);
        limitSafety++;
      }
      setItinerary(finalItin);
      setStep('REGISTRATION');
    } else {
      setStep('REGISTRATION');
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (itinerary.length === 0) return alert("Itinerary is empty!");

    const finalData = {
      ...formData,
      courseType,
      itinerary,
      startDate: itinerary[0].date,
      endDate: itinerary[itinerary.length - 1].date,
      status: "Unassigned" // New field! You will assign a trainer in the Admin Panel later
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
  };

  return (
    <div className="app-container">
      <h1 className="main-title">iDrive Smart Portal</h1>

      {step === 'COURSE' && (
        <div className="step-container fade-in">
          <h2>Step 1: Select Your Package</h2>
          <div className="course-options">
            <button className="course-card" onClick={() => {setCourseType(10); setStep('CALENDAR')}}>10 Lessons</button>
            <button className="course-card" onClick={() => {setCourseType(15); setStep('CALENDAR')}}>15 Lessons</button>
            <button className="course-card" onClick={() => {setCourseType(22); setStep('CALENDAR')}}>22 Lessons</button>
          </div>
        </div>
      )}

      {step === 'CALENDAR' && (
        <div className="step-container fade-in">
          <h2>Step 2: Select Start Date & Time</h2>
          
          <div className="calendar-wrapper">
            <Calendar 
              onChange={setSelectedDate} 
              value={selectedDate} 
              minDate={new Date()} 
            />
          </div>

          <div className="time-select-section">
            <p>Preferred Daily Time:</p>
            <select className="time-dropdown" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
              {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div className="action-buttons">
            <button className="back-btn" onClick={() => setStep('COURSE')}>← Back</button>
            <button className="primary-button" onClick={() => startSmartFill(selectedDate, preferredTime)}>Generate Schedule</button>
          </div>
        </div>
      )}

      {step === 'CONFLICT' && (
        <div className="step-container fade-in">
          <h2 className="warning">⚠️ Capacity Reached on {conflictDate}</h2>
          <p>All vehicles are booked at <strong>{preferredTime}</strong> on this day. Please pick an alternative time for <strong>only this day</strong>:</p>
          <div className="time-slot-grid">
            {timeSlots.map(t => (
              <button 
                key={t} 
                className={`slot-button ${isSlotBusy(conflictDate, t) ? 'booked' : 'available'}`}
                disabled={isSlotBusy(conflictDate, t)}
                onClick={() => resolveConflict(t)}
              >
                {t} {isSlotBusy(conflictDate, t) ? '(Full)' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'REGISTRATION' && (
        <div className="step-container fade-in">
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
            <button type="submit" className="primary-button submit-btn">Confirm Booking</button>
          </form>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div className="step-container success-msg fade-in">
          <h2>🎉 Congratulations!</h2>
          <p>Your {courseType}-lesson course is confirmed!</p>
          <p>First lesson: {itinerary[0]?.date} at {itinerary[0]?.timeSlot}</p>
          <p><em>Your instructor details will be emailed to you shortly.</em></p>
          <button className="primary-button" onClick={() => window.location.reload()}>Book Another</button>
        </div>
      )}
    </div>
  );
}