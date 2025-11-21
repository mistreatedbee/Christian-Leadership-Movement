import express from 'express';
import { submitApplication, getApplications } from '../controllers/applicationController.js';
const router = express.Router();

router.post('/submit', submitApplication);
router.get('/', getApplications);

export default router;
