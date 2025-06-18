const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const cookieParser = require('cookie-parser');
const axios = require('axios'); // Add axios

dotenv.config();

const app = express();
// app.use(cors());
app.use(cors({ origin: process.env.REACT_APP_API_BASE_URL, credentials: true }));

app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['crew', 'pilot', 'admin', 'ground_staff', 'auditor'], default: 'crew' },
});

const User = mongoose.model('User', userSchema);

// Session Schema
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  role: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

const Session = mongoose.model('Session', sessionSchema);

// Incident Schema
const incidentSchema = new mongoose.Schema({
  flightNumber: String,
  dateTime: Date,
  location: {
    lat: Number,
    lon: Number,
    airportCode: String,
  },
  description: String,
  severity: String,
  incidentType: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
    text: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
  suggestedAction: { type: String, default: '' },
  assignedAction: { type: String, default: '' },
  actionStatus: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
});

const Incident = mongoose.model('Incident', incidentSchema);

// Rule-based classification
const classifyIncident = (description) => {
  description = description.toLowerCase();
  if (description.includes('engine')) return 'Engine Failure';
  if (description.includes('turbulence')) return 'Turbulence';
  if (description.includes('human') || description.includes('pilot')) return 'Human Error';
  if (description.includes('weather') || description.includes('storm')) return 'Weather Issue';
  return 'Other';
};

// Middleware to verify JWT
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const session = await Session.findOne({ token });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// User Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await new Session({ userId: user._id, token, role: user.role, expiresAt }).save();

    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 60 * 60 * 1000 });
    res.status(201).json({ message: 'Signup successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await new Session({ userId: user._id, token, role: user.role, expiresAt }).save();

    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 60 * 60 * 1000 });
    res.json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.cookies.token;
    await Session.deleteOne({ token });
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('email role');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all users
app.get('/api/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update user role
app.put('/api/users/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Incident Routes
app.post('/api/incidents', authMiddleware, async (req, res) => {
  try {
    const { description, ...incidentData } = req.body;
    const incidentType = classifyIncident(description);

    const incident = new Incident({
      ...incidentData,
      description,
      incidentType,
      createdBy: req.user.id,
    });

    await incident.save();
    const populatedIncident = await Incident.findById(incident._id).populate('createdBy', 'email');
    res.status(201).json(populatedIncident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/incidents', authMiddleware, async (req, res) => {
  try {
    let incidents;
    if (req.user.role === 'crew') {
      incidents = await Incident.find({ createdBy: req.user.id })
        .populate('createdBy', 'email')
        .populate('comments.user', 'email');
    } else {
      incidents = await Incident.find()
        .populate('createdBy', 'email')
        .populate('comments.user', 'email');
    }
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment
app.post('/api/incidents/:id/comments', authMiddleware, async (req, res) => {
  if (!['crew', 'pilot'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    incident.comments.push({ text: req.body.text, user: req.user.id });
    await incident.save();
    const populatedIncident = await Incident.findById(req.params.id)
      .populate('createdBy', 'email')
      .populate('comments.user', 'email');
    res.json(populatedIncident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suggest action (Pilot, Admin, Auditor)
app.put('/api/incidents/:id/suggest-action', authMiddleware, async (req, res) => {
  if (!['pilot', 'admin', 'auditor'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { suggestedAction: req.body.action },
      { new: true }
    ).populate('createdBy', 'email').populate('comments.user', 'email');
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign action (Admin, Auditor)
app.put('/api/incidents/:id/assign-action', authMiddleware, async (req, res) => {
  if (!['admin', 'auditor'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { assignedAction: req.body.action },
      { new: true }
    ).populate('createdBy', 'email').populate('comments.user', 'email');
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update action status (Ground Staff, Admin, Auditor)
app.put('/api/incidents/:id/action-status', authMiddleware, async (req, res) => {
  if (!['ground_staff', 'admin', 'auditor'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { actionStatus: req.body.status },
      { new: true }
    ).populate('createdBy', 'email').populate('comments.user', 'email');
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export incidents to Excel (Admin/Auditor)
app.get('/api/incidents/export', authMiddleware, async (req, res) => {
  if (!['admin', 'auditor'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  try {
    const incidents = await Incident.find().populate('createdBy', 'email');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Incidents');

    worksheet.columns = [
      { header: 'Flight Number', key: 'flightNumber', width: 15 },
      { header: 'Date', key: 'dateTime', width: 20 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Type', key: 'incidentType', width: 15 },
      { header: 'Severity', key: 'severity', width: 10 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Created By', key: 'createdBy', width: 20 },
      { header: 'Suggested Action', key: 'suggestedAction', width: 20 },
      { header: 'Assigned Action', key: 'assignedAction', width: 20 },
      { header: 'Action Status', key: 'actionStatus', width: 15 },
    ];

    incidents.forEach(incident => {
      worksheet.addRow({
        flightNumber: incident.flightNumber,
        dateTime: new Date(incident.dateTime).toLocaleString(),
        location: `${incident.location.airportCode} (${incident.location.lat}, ${incident.location.lon})`,
        incidentType: incident.incidentType,
        severity: incident.severity,
        description: incident.description,
        createdBy: incident.createdBy?.email || 'Unknown',
        suggestedAction: incident.suggestedAction,
        assignedAction: incident.assignedAction,
        actionStatus: incident.actionStatus,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=incidents.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint for risk prediction
app.post('/api/predict_risk', authMiddleware, async (req, res) => {
  if (!['admin', 'auditor'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  try {
    const { flight_number, route, incident_type } = req.body;
    const response = await axios.post('https://localhost:5000/predict_risk', {
      flight_number,
      route,
      incident_type
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));