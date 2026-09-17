const express = require('express');
const Application = require('../models/Application');
const asyncHandler = require('../asyncHandler');
const { protect, allow } = require('../middleware/auth');

const router = express.Router();
router.use(protect, allow('admin', 'verifier'));

function randomPassportNumber() {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${letter}${Math.floor(1000000 + Math.random() * 9000000)}`;
}

// GET /api/staff/applications?status=&q=
router.get(
  '/applications',
  asyncHandler(async (req, res) => {
    const filter = { status: { $ne: 'DRAFT' } };
    if (req.query.status) filter.status = req.query.status;

    // Verifiers only work the police-verification stage.
    if (req.user.role === 'verifier' && !req.query.status) {
      filter.status = 'POLICE_VERIFICATION';
    }

    if (req.query.q) {
      const rx = new RegExp(req.query.q.trim(), 'i');
      filter.$or = [
        { applicationNumber: rx },
        { 'personal.firstName': rx },
        { 'personal.lastName': rx },
        { 'contact.email': rx },
      ];
    }

    const applications = await Application.find(filter)
      .sort({ updatedAt: -1 })
      .populate('applicant', 'name email');
    res.json({ applications });
  })
);

// GET /api/staff/stats - counts for the dashboard
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const rows = await Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    res.json({ total, byStatus });
  })
);

// POST /api/staff/applications/:id/review - admin picks up a submitted file
router.post(
  '/applications/:id/review',
  allow('admin'),
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (application.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only a submitted application can be taken up for review.' });
    }
    application.status = 'UNDER_REVIEW';
    application.pushTimeline('UNDER_REVIEW', req.body.note || 'Documents are being checked', req.user);
    await application.save();
    res.json({ application });
  })
);

// POST /api/staff/applications/:id/send-for-verification - admin routes to police
router.post(
  '/applications/:id/send-for-verification',
  allow('admin'),
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (application.status !== 'UNDER_REVIEW') {
      return res.status(400).json({ message: 'Review the documents before sending for verification.' });
    }
    application.status = 'POLICE_VERIFICATION';
    application.policeVerification.verdict = 'pending';
    application.pushTimeline('POLICE_VERIFICATION', req.body.note || 'Sent for police verification', req.user);
    await application.save();
    res.json({ application });
  })
);

// POST /api/staff/applications/:id/verdict - verifier records the outcome
router.post(
  '/applications/:id/verdict',
  allow('verifier', 'admin'),
  asyncHandler(async (req, res) => {
    const { verdict, remarks } = req.body;
    if (!['clear', 'adverse'].includes(verdict)) {
      return res.status(400).json({ message: 'Record the verdict as either clear or adverse.' });
    }
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (application.status !== 'POLICE_VERIFICATION') {
      return res.status(400).json({ message: 'This application is not at the verification stage.' });
    }

    application.policeVerification = {
      verdict,
      remarks,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    };
    application.status = verdict === 'clear' ? 'VERIFICATION_PASSED' : 'VERIFICATION_FAILED';
    application.pushTimeline(
      application.status,
      remarks || (verdict === 'clear' ? 'Verification clear' : 'Adverse verification report'),
      req.user
    );
    await application.save();
    res.json({ application });
  })
);

// POST /api/staff/applications/:id/approve - admin issues the passport
router.post(
  '/applications/:id/approve',
  allow('admin'),
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (application.status !== 'VERIFICATION_PASSED') {
      return res.status(400).json({ message: 'A passport can only be issued after verification is clear.' });
    }
    application.status = 'APPROVED';
    application.passportNumber = randomPassportNumber();
    application.issuedAt = new Date();
    application.pushTimeline('APPROVED', `Passport ${application.passportNumber} issued`, req.user);
    await application.save();
    res.json({ application });
  })
);

// POST /api/staff/applications/:id/reject
router.post(
  '/applications/:id/reject',
  allow('admin'),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Give the applicant a reason for the rejection.' });
    }
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (['APPROVED', 'REJECTED'].includes(application.status)) {
      return res.status(400).json({ message: 'This application is already closed.' });
    }
    application.status = 'REJECTED';
    application.rejectionReason = reason.trim();
    application.pushTimeline('REJECTED', reason.trim(), req.user);
    await application.save();
    res.json({ application });
  })
);

module.exports = router;
