const path = require('path');
const fs = require('fs');
const express = require('express');
const Application = require('../models/Application');
const asyncHandler = require('../asyncHandler');
const { protect, allow } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();
router.use(protect);

const EDITABLE_STATUSES = ['DRAFT'];

function canSee(app, user) {
  if (user.role === 'admin' || user.role === 'verifier') return true;
  return String(app.applicant._id || app.applicant) === String(user._id);
}

// GET /api/applications - the signed-in applicant's own applications
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = req.user.role === 'applicant' ? { applicant: req.user._id } : {};
    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate('applicant', 'name email');
    res.json({ applications });
  })
);

// POST /api/applications - create a draft
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { applicationType, personal, family, contact } = req.body;
    const application = new Application({
      applicant: req.user._id,
      applicationType,
      personal,
      family,
      contact,
      status: 'DRAFT',
    });
    application.pushTimeline('DRAFT', 'Application created', req.user);
    await application.save();
    res.status(201).json({ application });
  })
);

// GET /api/applications/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id).populate('applicant', 'name email phone');
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (!canSee(application, req.user)) {
      return res.status(403).json({ message: 'You can only open your own applications.' });
    }
    res.json({ application });
  })
);

// PUT /api/applications/:id - edit while still a draft
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (String(application.applicant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own applications.' });
    }
    if (!EDITABLE_STATUSES.includes(application.status)) {
      return res.status(400).json({ message: 'A submitted application can no longer be edited.' });
    }
    const { applicationType, personal, family, contact } = req.body;
    Object.assign(application, { applicationType, personal, family, contact });
    await application.save();
    res.json({ application });
  })
);

// POST /api/applications/:id/documents - attach a supporting document
router.post(
  '/:id/documents',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (String(application.applicant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only upload to your own applications.' });
    }
    if (!req.file) return res.status(400).json({ message: 'Choose a file to upload.' });

    application.documents.push({
      docType: req.body.docType || 'other',
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    await application.save();
    res.status(201).json({ application });
  })
);

// GET /api/applications/:id/documents/:docId - stream a stored file
router.get(
  '/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (!canSee(application, req.user)) {
      return res.status(403).json({ message: 'You cannot open this document.' });
    }
    const doc = application.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'That document is no longer attached.' });

    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'The stored file is missing from the server.' });
    }
    res.type(doc.mimeType).sendFile(filePath);
  })
);

// DELETE /api/applications/:id/documents/:docId
router.delete(
  '/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (String(application.applicant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only change your own applications.' });
    }
    if (!EDITABLE_STATUSES.includes(application.status)) {
      return res.status(400).json({ message: 'Documents are locked once the application is submitted.' });
    }
    const doc = application.documents.id(req.params.docId);
    if (doc) {
      fs.promises.unlink(path.join(UPLOAD_DIR, doc.storedName)).catch(() => {});
      doc.deleteOne();
      await application.save();
    }
    res.json({ application });
  })
);

// POST /api/applications/:id/submit - lock the draft and enter the queue
router.post(
  '/:id/submit',
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    if (String(application.applicant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only submit your own applications.' });
    }
    if (application.status !== 'DRAFT') {
      return res.status(400).json({ message: 'This application has already been submitted.' });
    }

    const required = ['photo', 'proof_of_address', 'proof_of_dob'];
    const attached = application.documents.map((d) => d.docType);
    const missing = required.filter((r) => !attached.includes(r));
    if (missing.length) {
      return res.status(400).json({
        message: 'Attach every required document before submitting.',
        missing,
      });
    }

    application.status = 'SUBMITTED';
    application.pushTimeline('SUBMITTED', 'Application submitted for processing', req.user);
    await application.save();
    res.json({ application });
  })
);

// DELETE /api/applications/:id - withdraw a draft
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'That application does not exist.' });
    const owns = String(application.applicant) === String(req.user._id);
    if (!owns && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own applications.' });
    }
    if (application.status !== 'DRAFT' && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Only drafts can be deleted.' });
    }
    await application.deleteOne();
    res.json({ message: 'Application deleted.' });
  })
);

module.exports = router;
module.exports.allow = allow;
