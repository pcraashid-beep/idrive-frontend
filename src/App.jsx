import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // The default calendar styling
import './App.css';

export default function App() {
  const [step, setStep] = useState('COURSE');
  const [courseType, setCourseType] = useState(10);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date()); // Now a real Date object!
  const [preferredTime, setPreferredTime] = useState("09:00 AM");
  const [itinerary, setItinerary] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [conflictDate, setConflictDate] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '' });

  const timeSlots = ["09:00 AM", "10:30 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM"];
  const backendURL = "https://idrive-api.onrender.com";

  // --- MOCK TRAINER DATA ---
  const trainers = [
    { id: 1, name: "Imran", car: "Skoda Fabia", slotsOpen: 12 },
    { id: 2, name: "Sarah", car: "Toyota Prius", slotsOpen: 5 },
    { id: 3, name: "David", car: "Honda Civic", slotsOpen: 8 }
  ];

  useEffect(() => {
    fetch(`${backendURL}/api/availability`)
      .then(res => res.json())
      .then(data => setBusySlots(data || []))
      .catch(err => console.error("Error fetching availability:", err));
  }, []);

  // Helper functions for Real Dates
  const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const isSlotBusy = (dateStr, time) => {
    // In the future, we will also check: s.trainer === selectedTrainer.name
    return busySlots.some(s => s.date === dateStr && s.timeSlot === time);
  };

  // --- UPGRADED SMART-FILL ENGINE ---
  const startSmartFill = (startDate, time) => {
    if (!startDate) return alert("Please select a date first!");
    
    let tempItinerary = [];
    let currentDate = new Date(startDate);
    let lessonsFound = 0;
    let limitSafety = 0; // Prevents infinite loops if fully booked

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
    console.table(tempItinerary);
    setStep('REGISTRATION');
  };

  const resolveConflict = (newTime) => {
    const updatedItinerary = [...itinerary, { date: conflictDate, timeSlot: newTime }];
    setItinerary(updatedItinerary);
    setConflictDate(null);
    
    if (updatedItinerary.length < courseType) {
      // Resume from the day AFTER the conflict
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
      trainer: selectedTrainer.name, // Sending trainer to backend!
      car: selectedTrainer.car,
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
  };

  return (
    <div className="app-container">
      <h1 className="main-title">iDrive Smart Portal</h1>

      {step === 'COURSE' && (
        <div className="step-container fade-in">
          <h2>Step 1: Select Your Package</h2>
          <div className="course-options">
            <button className="course-card" onClick={() => {setCourseType(10); setStep('TRAINER')}}>10 Lessons</button>
            <button className="course-card" onClick={() => {setCourseType(15); setStep('TRAINER')}}>15 Lessons</button>
            <button className="course-card" onClick={() => {setCourseType(22); setStep('TRAINER')}}>22 Lessons</button>
          </div>
        </div>
      )}

      {step === 'TRAINER' && (
        <div className="step-container fade-in">
          <h2>Step 2: Choose Your Instructor</h2>
          <div className="trainer-grid">
            {trainers.map(trainer => (
              <div 
                key={trainer.id} 
                className="trainer-card"
                onClick={() => {setSelectedTrainer(trainer); setStep('CALENDAR')}}
              >
                <h3>{trainer.name}</h3>
                <p className="car-badge">🚗 {trainer.car}</p>
                <p className="availability-badge">📅 {trainer.slotsOpen} slots open</p>
              </div>
            ))}
          </div>
          <button className="back-btn" onClick={() => setStep('COURSE')}>← Back</button>
        </div>
      )}

      {step === 'CALENDAR' && (
        <div className="step-container fade-in">
          <h2>Step 3: Start Date & Time</h2>
          <p>Instructor: <strong>{selectedTrainer?.name}</strong> ({selectedTrainer?.car})</p>
          
          <div className="calendar-wrapper">
            <Calendar 
              onChange={setSelectedDate} 
              value={selectedDate} 
              minDate={new Date()} // Prevents picking dates in the past
            />
          </div>

          <div className="time-select-section">
            <p>Preferred Daily Time:</p>
            <select className="time-dropdown" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
              {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div className="action-buttons">
            <button className="back-btn" onClick={() => setStep('TRAINER')}>← Back</button>
            <button className="primary-button" onClick={() => startSmartFill(selectedDate, preferredTime)}>Generate Schedule</button>
          </div>
        </div>
      )}

      {step === 'CONFLICT' && (
        <div className="step-container fade-in">
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
                {t} {isSlotBusy(conflictDate, t) ? '(Busy)' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'REGISTRATION' && (
        <div className="step-container fade-in">
          <h2>Step 4: Confirm & Book</h2>
          <div className="review-box">
            <p>Instructor: <strong>{selectedTrainer?.name}</strong></p>
            <p>Vehicle: <strong>{selectedTrainer?.car}</strong></p>
          </div>
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
          <p>Your {courseType}-lesson course with {selectedTrainer?.name} is confirmed!</p>
          <p>First lesson: {itinerary[0]?.date} at {itinerary[0]?.timeSlot}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>Book Another</button>
        </div>
      )}
    </div>
  );
}