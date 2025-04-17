import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';

const Dashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    flightNumber: '',
    dateTime: '',
    lat: '',
    lon: '',
    airportCode: '',
    description: '',
    severity: 'Low',
  });
  const [comment, setComment] = useState('');
  const [editFields, setEditFields] = useState({}); // For inline editing

  useEffect(() => {
    // Fetch user info
    axios.get('http://localhost:5000/api/user', { withCredentials: true })
      .then(res => {
        setUser(res.data);
        // Fetch incidents
        return axios.get('http://localhost:5000/api/incidents', { withCredentials: true });
      })
      .then(res => {
        setIncidents(res.data);
        // Fetch users if admin
        if (user?.role === 'admin') {
          return axios.get('http://localhost:5000/api/users', { withCredentials: true });
        }
      })
      .then(res => {
        if (res) setUsers(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load dashboard');
        setLoading(false);
        console.error(err);
      });
  }, [user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/incidents', {
        flightNumber: form.flightNumber,
        dateTime: new Date(form.dateTime),
        location: {
          lat: parseFloat(form.lat),
          lon: parseFloat(form.lon),
          airportCode: form.airportCode,
        },
        description: form.description,
        severity: form.severity,
      }, { withCredentials: true });
      setIncidents([response.data, ...incidents]);
      setForm({
        flightNumber: '',
        dateTime: '',
        lat: '',
        lon: '',
        airportCode: '',
        description: '',
        severity: 'Low',
      });
      alert('Incident submitted successfully!');
    } catch (error) {
      console.error(error);
    }
  };

  const handleComment = async (incidentId) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/incidents/${incidentId}/comments`, { text: comment }, {
        withCredentials: true,
      });
      setIncidents(incidents.map(inc => inc._id === incidentId ? response.data : inc));
      setComment('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSuggestAction = async (incidentId) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/incidents/${incidentId}/suggest-action`, {
        action: editFields[incidentId]?.suggestedAction || '',
      }, { withCredentials: true });
      setIncidents(incidents.map(inc => inc._id === incidentId ? response.data : inc));
      setEditFields({ ...editFields, [incidentId]: { ...editFields[incidentId], suggestedAction: '' } });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssignAction = async (incidentId) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/incidents/${incidentId}/assign-action`, {
        action: editFields[incidentId]?.assignedAction || '',
      }, { withCredentials: true });
      setIncidents(incidents.map(inc => inc._id === incidentId ? response.data : inc));
      setEditFields({ ...editFields, [incidentId]: { ...editFields[incidentId], assignedAction: '' } });
    } catch (error) {
      console.error(error);
    }
  };

  const handleActionStatus = async (incidentId) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/incidents/${incidentId}/action-status`, {
        status: editFields[incidentId]?.actionStatus || 'Pending',
      }, { withCredentials: true });
      setIncidents(incidents.map(inc => inc._id === incidentId ? response.data : inc));
      setEditFields({ ...editFields, [incidentId]: { ...editFields[incidentId], actionStatus: 'Pending' } });
    } catch (error) {
      console.error(error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/incidents/export', {
        withCredentials: true,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'incidents.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateUserRole = async (userId, role) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/users/${userId}`, { role }, {
        withCredentials: true,
      });
      setUsers(users.map(u => u._id === userId ? response.data : u));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/logout', {}, { withCredentials: true });
      window.location.href = '/login';
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}. Please <a href="/login" className="text-blue-600">login again</a>.</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* <div className="bg-green-500 p-4 text-white text-center">TailwindCSS Test</div> */}
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-blue-600">Flight Incident Reporting System</h1>
          <div>
            <span className="mr-4">Role: {user.role}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Incident Form */}
        {['crew', 'pilot'].includes(user.role) && (
          <div className="mb-12 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Report an Incident</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Flight Number (e.g., AI123)"
                value={form.flightNumber}
                onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder="Latitude (e.g., 28.6139)"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Longitude (e.g., 77.2090)"
                  value={form.lon}
                  onChange={(e) => setForm({ ...form, lon: e.target.value })}
                  className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Airport Code (e.g., DEL)"
                  value={form.airportCode}
                  onChange={(e) => setForm({ ...form, airportCode: e.target.value })}
                  className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <textarea
                placeholder="Description (e.g., Engine stopped working)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                required
              />
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Submit Incident
              </button>
            </form>
          </div>
        )}

        {/* Admin: User Management */}
        {user.role === 'admin' && (
          <div className="mb-12 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Manage Users</h2>
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-gray-200 p-3 text-left">Email</th>
                  <th className="border border-gray-200 p-3 text-left">Current Role</th>
                  <th className="border border-gray-200 p-3 text-left">Update Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-3">{u.email}</td>
                    <td className="border border-gray-200 p-3">{u.role}</td>
                    <td className="border border-gray-200 p-3">
                      <select
                        onChange={(e) => handleUpdateUserRole(u._id, e.target.value)}
                        defaultValue={u.role}
                        className="p-2 border rounded-lg"
                      >
                        <option value="crew">Crew</option>
                        <option value="pilot">Pilot</option>
                        <option value="admin">Admin</option>
                        <option value="ground_staff">Ground Staff</option>
                        <option value="auditor">Auditor</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dashboard */}
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Incident Dashboard</h2>
            {['admin', 'auditor'].includes(user.role) && (
              <button
                onClick={handleExport}
                className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"
              >
                Export to Excel
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-gray-200 p-3 text-left">Flight</th>
                  <th className="border border-gray-200 p-3 text-left">Date</th>
                  <th className="border border-gray-200 p-3 text-left">Location</th>
                  <th className="border border-gray-200 p-3 text-left">Type</th>
                  <th className="border border-gray-200 p-3 text-left">Severity</th>
                  <th className="border border-gray-200 p-3 text-left">Description</th>
                  <th className="border border-gray-200 p-3 text-left">Created By</th>
                  <th className="border border-gray-200 p-3 text-left">Comments</th>
                  <th className="border border-gray-200 p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(incident => (
                  <tr key={incident._id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-3">{incident.flightNumber}</td>
                    <td className="border border-gray-200 p-3">{new Date(incident.dateTime).toLocaleString()}</td>
                    <td className="border border-gray-200 p-3">{`${incident.location.airportCode} (${incident.location.lat}, ${incident.location.lon})`}</td>
                    <td className="border border-gray-200 p-3">{incident.incidentType}</td>
                    <td className="border border-gray-200 p-3">{incident.severity}</td>
                    <td className="border border-gray-200 p-3">{incident.description}</td>
                    <td className="border border-gray-200 p-3">{incident.createdBy?.email || 'Unknown'}</td>
                    <td className="border border-gray-200 p-3">
                      <div className="space-y-2">
                        {incident.comments.map((c, i) => (
                          <div key={i} className="text-sm">{c.text} (by {c.user?.email || 'Unknown'})</div>
                        ))}
                        {['crew', 'pilot'].includes(user.role) && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Add comment"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              className="p-2 border rounded-lg w-full"
                            />
                            <button
                              onClick={() => handleComment(incident._id)}
                              className="mt-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                            >
                              Comment
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 p-3">
                      <div className="space-y-2">
                        {['admin', 'auditor'].includes(user.role) ? (
                          <>
                            <div>
                              Suggested:
                              <input
                                type="text"
                                value={editFields[incident._id]?.suggestedAction || incident.suggestedAction || ''}
                                onChange={(e) => setEditFields({
                                  ...editFields,
                                  [incident._id]: { ...editFields[incident._id], suggestedAction: e.target.value },
                                })}
                                className="p-2 border rounded-lg w-full"
                              />
                              <button
                                onClick={() => handleSuggestAction(incident._id)}
                                className="mt-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                              >
                                Save
                              </button>
                            </div>
                            <div>
                              Assigned:
                              <input
                                type="text"
                                value={editFields[incident._id]?.assignedAction || incident.assignedAction || ''}
                                onChange={(e) => setEditFields({
                                  ...editFields,
                                  [incident._id]: { ...editFields[incident._id], assignedAction: e.target.value },
                                })}
                                className="p-2 border rounded-lg w-full"
                              />
                              <button
                                onClick={() => handleAssignAction(incident._id)}
                                className="mt-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                              >
                                Save
                              </button>
                            </div>
                            <div>
                              Status:
                              <select
                                value={editFields[incident._id]?.actionStatus || incident.actionStatus}
                                onChange={(e) => setEditFields({
                                  ...editFields,
                                  [incident._id]: { ...editFields[incident._id], actionStatus: e.target.value },
                                })}
                                className="p-2 border rounded-lg w-full"
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                              <button
                                onClick={() => handleActionStatus(incident._id)}
                                className="mt-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                              >
                                Save
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>Suggested: {incident.suggestedAction || 'None'}</div>
                            <div>Assigned: {incident.assignedAction || 'None'}</div>
                            <div>Status: {incident.actionStatus}</div>
                          </>
                        )}
                        {user.role === 'pilot' && !['admin', 'auditor'].includes(user.role) && (
                          <div>
                            <input
                              type="text"
                              placeholder="Suggest action"
                              value={editFields[incident._id]?.suggestedAction || ''}
                              onChange={(e) => setEditFields({
                                ...editFields,
                                [incident._id]: { ...editFields[incident._id], suggestedAction: e.target.value },
                              })}
                              className="p-2 border rounded-lg w-full"
                            />
                            <button
                              onClick={() => handleSuggestAction(incident._id)}
                              className="mt-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                            >
                              Suggest
                            </button>
                          </div>
                        )}
                        {user.role === 'ground_staff' && !['admin', 'auditor'].includes(user.role) && (
                          <div>
                            <select
                              value={editFields[incident._id]?.actionStatus || incident.actionStatus}
                              onChange={(e) => setEditFields({
                                ...editFields,
                                [incident._id]: { ...editFields[incident._id], actionStatus: e.target.value },
                              })}
                              className="p-2 border rounded-lg w-full"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                            <button
                              onClick={() => handleActionStatus(incident._id)}
                              className="mt-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                            >
                              Update Status
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;