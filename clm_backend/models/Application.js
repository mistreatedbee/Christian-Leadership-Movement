import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Application', applicationSchema);
