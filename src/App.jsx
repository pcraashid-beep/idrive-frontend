import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
import './App.css';

const backendURL = "https://idrive-api.onrender.com";
const trainersList = ["Imran", "Sarah", "David"]; // Your fleet drivers

// ==========================================
// 1. THE ADMIN DASHBOARD COMPONENT
// ==========================================
function AdminDashboard() {
  const [bookings, setBookings] = useState([]);

  // Fetch all data when the admin page loads
  useEffect(() => {
    fetch(`${backendURL}/api/admin/bookings`)
      .then(res => res.json())
      .then(data => setBookings(data))
      .catch(err => console.error("Error fetching admin data:", err));
  }, []);

  const handleAssignTrainer = async (bookingId, trainerName) => {
    try {
      const res = await fetch(`${backendURL}/api/admin/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainer: trainerName, status: "Assigned" })
      });
      
      if (res.ok) {
        // Update the screen instantly without reloading
        setBookings(bookings.map(b => 
          b._id === bookingId ? { ...b, trainer: trainerName, status: "Assigned" } : b
        ));
      } else {
        alert("Failed to assign trainer.");
      }
    } catch (err) {
      alert("Network error.");
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>iDrive Command Center</h1>
        <Link to="/" className="view-live-btn">View Live Site</Link>
      </div>
      
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Course</th>
              <th>Start Date</th>
              <th>Status</th>
              <th>Assign Trainer</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(booking => (
              <tr key={booking._id} className={booking.status === "Unassigned" ? "row-warning" : "row-success"}>
                <td><strong>{booking.fullName}</strong></td>
                <td>{booking.phone}<br/><span className="text-sm">{booking.email}</span></td>
                <td>{booking.courseType} Days</td>
                <td>{booking.startDate}</td>
                <td>
                  <span className={`status-badge ${booking.status.toLowerCase()}`}>
                    {booking.status}
                  </span>
                </td>
                <td>
                  {booking.status === "Unassigned" ? (
                    <select 
                      className="admin-dropdown"
                      onChange={(e) => handleAssignTrainer(booking._id, e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Select Driver...</option>
                      {trainersList.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <strong>{booking.trainer} ✅</strong>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <p className="no-data">No bookings yet.</p>}
      </div>
    </div>
  );
}

// ==========================================
// 2. THE PUBLIC BOOKING FLOW (What we built yesterday)
// ==========================================
function BookingFlow() {
  const [step, setStep] = useState('COURSE');
  const [courseType, setCourseType] = useState(10);
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [preferredTime, setPreferredTime] = useState("09:00 AM");
  const [itinerary, setItinerary] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [conflictDate, setConflictDate] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '' });

  const timeSlots = ["09:00 AM", "10:30 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM"];

  useEffect(() => {
    fetch(`${backendURL}/api/availability`)
      .then(res => res.json())
      .then(data => setBusySlots(data || []));
  }, []);

  const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const addDays = (date, days) => { const r = new Date(date); r.setDate(r.getDate() + days); return r; };

  const isSlotBusy = (dateStr, time) => {
    const count = busySlots.filter(s => s.date === dateStr && s.timeSlot === time).length;
    return count >= 4; 
  };

  const startSmartFill = (startDate, time) => {
    if (!startDate) return alert("Please select a date!");
    let tempItinerary = [];
    let currentDate = new Date(startDate);
    let lessonsFound = 0; let limitSafety = 0; 
    while (lessonsFound < courseType && limitSafety < 60) {
      let dateString = formatDate(currentDate);
      if (isSlotBusy(dateString, time)) {
        setConflictDate(dateString); setItinerary(tempItinerary); setStep('CONFLICT'); return;
      } else {
        tempItinerary.push({ date: dateString, timeSlot: time }); lessonsFound++;
      }
      currentDate = addDays(currentDate, 1); limitSafety++;
    }
    setItinerary(tempItinerary); setStep('REGISTRATION');
  };

  const resolveConflict = (newTime) => {
    const updatedItinerary = [...itinerary, { date: conflictDate, timeSlot: newTime }];
    setItinerary(updatedItinerary); setConflictDate(null);
    if (updatedItinerary.length < courseType) {
      let currentDate = addDays(new Date(conflictDate), 1);
      let finalItin = [...updatedItinerary];
      let lessonsFound = finalItin.length; let limitSafety = 0;
      while (lessonsFound < courseType && limitSafety < 60) {
        let dateString = formatDate(currentDate);
        if (isSlotBusy(dateString, preferredTime)) {
          setConflictDate(dateString); setItinerary(finalItin); setStep('CONFLICT'); return;
        } else {
          finalItin.push({ date: dateString, timeSlot: preferredTime }); lessonsFound++;
        }
        currentDate = addDays(currentDate, 1); limitSafety++;
      }
      setItinerary(finalItin); setStep('REGISTRATION');
    } else {
      setStep('REGISTRATION');
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (itinerary.length === 0) return alert("Itinerary empty!");
    const finalData = { ...formData, courseType, itinerary, startDate: itinerary[0].date, endDate: itinerary[itinerary.length - 1].date, status: "Unassigned", trainer: "Pending" };
    try {
      const res = await fetch(`${backendURL}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalData) });
      if (res.ok) setStep('SUCCESS');
    } catch (err) { alert("Network error"); }
  };

  return (
    <div className="app-container">
      <h1 className="main-title">iDrive Smart Portal</h1>
      {/* ... Keeping the UI exactly the same as the previous version ... */}
      {step === 'COURSE' && (<div className="step-container fade-in"><h2>Step 1: Select Your Package</h2><div className="course-options"><button className="course-card" onClick={() => {setCourseType(10); setStep('CALENDAR')}}>10 Lessons</button><button className="course-card" onClick={() => {setCourseType(15); setStep('CALENDAR')}}>15 Lessons</button><button className="course-card" onClick={() => {setCourseType(22); setStep('CALENDAR')}}>22 Lessons</button></div></div>)}
      {step === 'CALENDAR' && (<div className="step-container fade-in"><h2>Step 2: Start Date & Time</h2><div className="calendar-wrapper"><Calendar onChange={setSelectedDate} value={selectedDate} minDate={new Date()} /></div><div className="time-select-section"><p>Preferred Time:</p><select className="time-dropdown" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div className="action-buttons"><button className="back-btn" onClick={() => setStep('COURSE')}>← Back</button><button className="primary-button" onClick={() => startSmartFill(selectedDate, preferredTime)}>Generate Schedule</button></div></div>)}
      {step === 'CONFLICT' && (<div className="step-container fade-in"><h2 className="warning">⚠️ Capacity Reached on {conflictDate}</h2><p>Please pick an alternative time for <strong>only this day</strong>:</p><div className="time-slot-grid">{timeSlots.map(t => (<button key={t} className={`slot-button ${isSlotBusy(conflictDate, t) ? 'booked' : 'available'}`} disabled={isSlotBusy(conflictDate, t)} onClick={() => resolveConflict(t)}>{t} {isSlotBusy(conflictDate, t) ? '(Full)' : ''}</button>))}</div></div>)}
      {step === 'REGISTRATION' && (<div className="step-container fade-in"><h2>Step 3: Confirm & Book</h2><div className="itinerary-preview">{itinerary.map((item, idx) => (<div key={idx} className="itin-row"><span>{item.date}</span> <strong>{item.timeSlot}</strong></div>))}</div><form className="registration-form" onSubmit={handleFinalSubmit}><input type="text" placeholder="Full Name" required onChange={e => setFormData({...formData, fullName: e.target.value})} /><input type="email" placeholder="Email" required onChange={e => setFormData({...formData, email: e.target.value})} /><input type="tel" placeholder="Phone Number" required onChange={e => setFormData({...formData, phone: e.target.value})} /><button type="submit" className="primary-button submit-btn">Confirm Booking</button></form></div>)}
      {step === 'SUCCESS' && (<div className="step-container success-msg fade-in"><h2>🎉 Congratulations!</h2><p>Your {courseType}-lesson course is confirmed!</p><button className="primary-button" onClick={() => window.location.reload()}>Book Another</button></div>)}
    </div>
  );
}

// ==========================================
// 3. THE APP ROUTER (The Traffic Cop)
// ==========================================
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BookingFlow />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}