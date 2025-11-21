import Application from '../models/Application.js';

export const submitApplication = async (req, res) => {
  try {
    const app = await Application.create(req.body);
    res.json(app);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getApplications = async (req, res) => {
  const apps = await Application.find();
  res.json(apps);
};
