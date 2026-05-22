import { generatePDF, generateFilename, downloadPDF } from './lib/pdf.js';
import { APP_VERSION } from './config/version.js';
import { saveDraft, loadDraft, clearDraft } from './lib/storage.js';

// ========================================
// Application State
// ========================================

const report = {
  schoolName: '',
  date: '',
  teacherFirstName: '',
  teacherLastName: '',
  teacherEmail: '',
  interviewDates: '',
  interviewPlace: '',
  interviewCountry: '',
  interviewPlatform: '',
  interviewLength: '',
  communicationDetails: '',
  references: [
    { name: '', title: '', email: '', dateContacted: '', platform: '' },
    { name: '', title: '', email: '', dateContacted: '', platform: '' }
  ],
  englishTest: {
    verbalTested: false,
    verbalDate: '',
    verbalAssessment: '',
    verbalByNativeSpeaker: false,
    writtenTested: false,
    writtenNotes: ''
  },
  arrivalServices: {
    meetAtAirport:     { provided: false, details: '' },
    hostFamily:        { provided: false, details: '' },
    transientHotel:    { provided: false, details: '' },
    rentalCar:         { provided: false, details: '' },
    housingAssistance: { provided: false, details: '' },
    socialSecurity:    { provided: false, details: '' }
  },
  certification: {
    procedures: '',
    stepsToObtain: '',
    teacherCost: false,
    costAmount: '',
    costTiming: ''
  },
  nativeEnglishSpeaker: {
    applicable: false,
    justification: ''
  },
  signature: {
    imageDataUrl: null,
    signerName: '',
    signerTitle: ''
  }
};

let currentStep = 1;
const TOTAL_STEPS = 7;

const DRAFT_KEY = 'chf-recruitment-report';
const AUTOSAVE_INTERVAL_MS = 30000;

// ========================================
// Draft Auto-save
// ========================================

function _buildDraftData() {
  syncFormToState();
  return JSON.parse(JSON.stringify(report));
}

function _saveCurrentDraft() {
  saveDraft(DRAFT_KEY, _buildDraftData());
}

function _restoreDraft(draft) {
  const d = draft.data;
  report.schoolName = d.schoolName || '';
  report.date = d.date || report.date;
  report.teacherFirstName = d.teacherFirstName || '';
  report.teacherLastName = d.teacherLastName || '';
  report.teacherEmail = d.teacherEmail || '';
  report.interviewDates = d.interviewDates || '';
  report.interviewPlace = d.interviewPlace || '';
  report.interviewCountry = d.interviewCountry || '';
  report.interviewPlatform = d.interviewPlatform || '';
  report.interviewLength = d.interviewLength || '';
  report.communicationDetails = d.communicationDetails || '';
  report.references = d.references || report.references;
  Object.assign(report.englishTest, d.englishTest || {});
  for (const key of Object.keys(report.arrivalServices)) {
    if (d.arrivalServices && d.arrivalServices[key]) {
      Object.assign(report.arrivalServices[key], d.arrivalServices[key]);
    }
  }
  Object.assign(report.certification, d.certification || {});
  Object.assign(report.nativeEnglishSpeaker, d.nativeEnglishSpeaker || {});
  Object.assign(report.signature, d.signature || {});

  // Restore general info
  document.getElementById('schoolName').value = report.schoolName;
  document.getElementById('teacherFirstName').value = report.teacherFirstName;
  document.getElementById('teacherLastName').value = report.teacherLastName;
  document.getElementById('teacherEmail').value = report.teacherEmail;

  // Restore interview
  document.getElementById('interviewDates').value = report.interviewDates;
  document.getElementById('interviewPlace').value = report.interviewPlace;
  document.getElementById('interviewCountry').value = report.interviewCountry;
  document.getElementById('interviewPlatform').value = report.interviewPlatform;
  document.getElementById('interviewLength').value = report.interviewLength;
  document.getElementById('communicationDetails').value = report.communicationDetails;

  // Restore references
  renderReferences();

  // Restore English test
  document.getElementById('verbalTested').checked = report.englishTest.verbalTested;
  _updateToggleState('verbalTested', 'verbalTestedLabel', 'verbalFields');
  document.getElementById('verbalDate').value = report.englishTest.verbalDate;
  document.getElementById('verbalAssessment').value = report.englishTest.verbalAssessment;
  document.getElementById('verbalByNativeSpeaker').checked = report.englishTest.verbalByNativeSpeaker;
  _updateToggleLabel('verbalByNativeSpeaker', 'verbalByNativeSpeakerLabel');

  document.getElementById('writtenTested').checked = report.englishTest.writtenTested;
  _updateToggleState('writtenTested', 'writtenTestedLabel', 'writtenFields');
  document.getElementById('writtenNotes').value = report.englishTest.writtenNotes;

  // Restore arrival services
  for (const [key, value] of Object.entries(report.arrivalServices)) {
    const toggle = document.querySelector(`.service-toggle[data-service="${key}"]`);
    if (toggle) {
      toggle.checked = value.provided;
      const item = toggle.closest('.service-item');
      const details = item.querySelector('.service-details');
      const stateLabel = item.querySelector('.toggle-state');
      details.style.display = value.provided ? 'block' : 'none';
      stateLabel.textContent = value.provided ? 'Yes' : 'No';
      const detailInput = item.querySelector('.service-detail-input');
      if (detailInput) detailInput.value = value.details;
    }
  }

  // Restore certification
  document.getElementById('certProcedures').value = report.certification.procedures;
  document.getElementById('certSteps').value = report.certification.stepsToObtain;
  document.getElementById('teacherCostToggle').checked = report.certification.teacherCost;
  _updateToggleState('teacherCostToggle', 'teacherCostLabel', 'certCostFields');
  document.getElementById('costAmount').value = report.certification.costAmount;
  document.getElementById('costTiming').value = report.certification.costTiming;

  // Restore native English speaker
  document.getElementById('nativeEnglishToggle').checked = report.nativeEnglishSpeaker.applicable;
  _updateToggleState('nativeEnglishToggle', 'nativeEnglishLabel', 'nativeEnglishFields');
  document.getElementById('nativeJustification').value = report.nativeEnglishSpeaker.justification;

  // Restore signature
  document.getElementById('signerName').value = report.signature.signerName;
  document.getElementById('signerTitle').value = report.signature.signerTitle;
  if (report.signature.imageDataUrl) {
    restoreSignatureCanvas(report.signature.imageDataUrl);
  }

  updateHeaderDisplay();
  currentStep = 1;
  updateWizardUI();
}

function _formatRelativeDate(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function initDraftRestore() {
  const draft = loadDraft(DRAFT_KEY);
  if (!draft) return;

  const banner = document.getElementById('draftBanner');
  document.getElementById('draftDate').textContent = _formatRelativeDate(draft.savedAt);
  banner.style.display = 'flex';

  document.getElementById('draftResumeBtn').addEventListener('click', () => {
    banner.style.display = 'none';
    _restoreDraft(draft);
  });
  document.getElementById('draftDiscardBtn').addEventListener('click', () => {
    banner.style.display = 'none';
    clearDraft(DRAFT_KEY);
  });
}

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigationButtons();
  initSchoolNameListener();
  initReferences();
  initToggles();
  initServiceToggles();
  initSignatureCanvas();
  document.getElementById('generatePdfBtn').addEventListener('click', generateReport);

  // Report date is always today
  report.date = new Date().toISOString().split('T')[0];

  renderReferences();

  document.getElementById('appVersion').textContent = `v${APP_VERSION}`;

  initDraftRestore();
  setInterval(_saveCurrentDraft, AUTOSAVE_INTERVAL_MS);
});

// ========================================
// Header Display
// ========================================

function updateHeaderDisplay() {
  document.getElementById('schoolNameHeader').textContent = report.schoolName || '';
  document.getElementById('dateDisplay').textContent = report.date || '';
}

function initSchoolNameListener() {
  const input = document.getElementById('schoolName');
  input.addEventListener('input', () => {
    report.schoolName = input.value.trim();
    updateHeaderDisplay();
  });
}

// ========================================
// References
// ========================================

function initReferences() {
  document.getElementById('addReferenceBtn').addEventListener('click', () => {
    report.references.push({ name: '', title: '', email: '', dateContacted: '', platform: '' });
    renderReferences();
  });
}

function renderReferences() {
  const container = document.getElementById('referencesContainer');
  container.innerHTML = '';

  report.references.forEach((ref, index) => {
    const template = document.getElementById('referenceTemplate');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.reference-card');
    card.dataset.refIndex = index;

    card.querySelector('.reference-number').textContent = `Reference #${index + 1}`;

    const removeBtn = card.querySelector('.btn-remove-ref');
    if (report.references.length <= 2) {
      removeBtn.style.display = 'none';
    } else {
      removeBtn.addEventListener('click', () => {
        report.references.splice(index, 1);
        renderReferences();
      });
    }

    const nameInput = card.querySelector('.ref-name');
    const titleInput = card.querySelector('.ref-title');
    const emailInput = card.querySelector('.ref-email');
    const dateInput = card.querySelector('.ref-date');
    const platformInput = card.querySelector('.ref-platform');

    nameInput.value = ref.name;
    titleInput.value = ref.title;
    emailInput.value = ref.email;
    dateInput.value = ref.dateContacted;
    platformInput.value = ref.platform;

    nameInput.addEventListener('input', () => { report.references[index].name = nameInput.value; });
    titleInput.addEventListener('input', () => { report.references[index].title = titleInput.value; });
    emailInput.addEventListener('input', () => { report.references[index].email = emailInput.value; });
    dateInput.addEventListener('input', () => { report.references[index].dateContacted = dateInput.value; });
    platformInput.addEventListener('input', () => { report.references[index].platform = platformInput.value; });

    container.appendChild(clone);
  });
}

// ========================================
// Toggle Switches
// ========================================

function _updateToggleState(checkboxId, labelId, fieldsId) {
  const checked = document.getElementById(checkboxId).checked;
  document.getElementById(labelId).textContent = checked ? 'Yes' : 'No';
  if (fieldsId) {
    document.getElementById(fieldsId).style.display = checked ? 'block' : 'none';
  }
}

function _updateToggleLabel(checkboxId, labelId) {
  const checked = document.getElementById(checkboxId).checked;
  document.getElementById(labelId).textContent = checked ? 'Yes' : 'No';
}

function initToggles() {
  // Verbal tested
  document.getElementById('verbalTested').addEventListener('change', () => {
    _updateToggleState('verbalTested', 'verbalTestedLabel', 'verbalFields');
  });

  // Verbal by native speaker
  document.getElementById('verbalByNativeSpeaker').addEventListener('change', () => {
    _updateToggleLabel('verbalByNativeSpeaker', 'verbalByNativeSpeakerLabel');
  });

  // Written tested
  document.getElementById('writtenTested').addEventListener('change', () => {
    _updateToggleState('writtenTested', 'writtenTestedLabel', 'writtenFields');
  });

  // Teacher cost
  document.getElementById('teacherCostToggle').addEventListener('change', () => {
    _updateToggleState('teacherCostToggle', 'teacherCostLabel', 'certCostFields');
  });

  // Native English speaker
  document.getElementById('nativeEnglishToggle').addEventListener('change', () => {
    _updateToggleState('nativeEnglishToggle', 'nativeEnglishLabel', 'nativeEnglishFields');
  });
}

// ========================================
// Arrival Service Toggles
// ========================================

function initServiceToggles() {
  document.querySelectorAll('.service-toggle').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const item = toggle.closest('.service-item');
      const details = item.querySelector('.service-details');
      const stateLabel = item.querySelector('.toggle-state');

      details.style.display = toggle.checked ? 'block' : 'none';
      stateLabel.textContent = toggle.checked ? 'Yes' : 'No';
    });
  });
}

// ========================================
// Signature Canvas
// ========================================

let isDrawing = false;
let signatureCtx = null;

function initSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  signatureCtx = canvas.getContext('2d');

  // Set actual canvas size to match display
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width || 500;
  canvas.height = 200;

  signatureCtx.lineWidth = 2;
  signatureCtx.lineCap = 'round';
  signatureCtx.strokeStyle = '#000';

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  // Touch events
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
  canvas.addEventListener('touchend', stopDrawing);

  document.getElementById('clearSignatureBtn').addEventListener('click', clearSignature);
}

function _getCanvasCoords(e) {
  const canvas = document.getElementById('signatureCanvas');
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function startDrawing(e) {
  isDrawing = true;
  const { x, y } = _getCanvasCoords(e);
  signatureCtx.beginPath();
  signatureCtx.moveTo(x, y);
}

function draw(e) {
  if (!isDrawing) return;
  const { x, y } = _getCanvasCoords(e);
  signatureCtx.lineTo(x, y);
  signatureCtx.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

function clearSignature() {
  const canvas = document.getElementById('signatureCanvas');
  signatureCtx.clearRect(0, 0, canvas.width, canvas.height);
  report.signature.imageDataUrl = null;
}

function _isCanvasBlank() {
  const canvas = document.getElementById('signatureCanvas');
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  return canvas.toDataURL() === blank.toDataURL();
}

function _captureSignature() {
  if (_isCanvasBlank()) {
    report.signature.imageDataUrl = null;
  } else {
    report.signature.imageDataUrl = document.getElementById('signatureCanvas').toDataURL('image/png');
  }
}

function restoreSignatureCanvas(dataUrl) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.getElementById('signatureCanvas');
    signatureCtx.clearRect(0, 0, canvas.width, canvas.height);
    signatureCtx.drawImage(img, 0, 0);
  };
  img.src = dataUrl;
}

// ========================================
// Form Sync
// ========================================

function syncFormToState() {
  report.schoolName = document.getElementById('schoolName').value.trim();
  report.teacherFirstName = document.getElementById('teacherFirstName').value.trim();
  report.teacherLastName = document.getElementById('teacherLastName').value.trim();
  report.teacherEmail = document.getElementById('teacherEmail').value.trim();

  report.interviewDates = document.getElementById('interviewDates').value.trim();
  report.interviewPlace = document.getElementById('interviewPlace').value.trim();
  report.interviewCountry = document.getElementById('interviewCountry').value.trim();
  report.interviewPlatform = document.getElementById('interviewPlatform').value.trim();
  report.interviewLength = document.getElementById('interviewLength').value.trim();
  report.communicationDetails = document.getElementById('communicationDetails').value.trim();

  report.englishTest.verbalTested = document.getElementById('verbalTested').checked;
  report.englishTest.verbalDate = document.getElementById('verbalDate').value.trim();
  report.englishTest.verbalAssessment = document.getElementById('verbalAssessment').value.trim();
  report.englishTest.verbalByNativeSpeaker = document.getElementById('verbalByNativeSpeaker').checked;
  report.englishTest.writtenTested = document.getElementById('writtenTested').checked;
  report.englishTest.writtenNotes = document.getElementById('writtenNotes').value.trim();

  // Arrival services
  document.querySelectorAll('.service-toggle').forEach(toggle => {
    const key = toggle.dataset.service;
    report.arrivalServices[key].provided = toggle.checked;
    const input = document.querySelector(`.service-detail-input[data-service="${key}"]`);
    if (input) report.arrivalServices[key].details = input.value.trim();
  });

  report.certification.procedures = document.getElementById('certProcedures').value.trim();
  report.certification.stepsToObtain = document.getElementById('certSteps').value.trim();
  report.certification.teacherCost = document.getElementById('teacherCostToggle').checked;
  report.certification.costAmount = document.getElementById('costAmount').value.trim();
  report.certification.costTiming = document.getElementById('costTiming').value;

  report.nativeEnglishSpeaker.applicable = document.getElementById('nativeEnglishToggle').checked;
  report.nativeEnglishSpeaker.justification = document.getElementById('nativeJustification').value.trim();

  _captureSignature();
  report.signature.signerName = document.getElementById('signerName').value.trim();
  report.signature.signerTitle = document.getElementById('signerTitle').value.trim();
}

// ========================================
// Wizard Navigation
// ========================================

function initNavigationButtons() {
  document.getElementById('prevBtn').addEventListener('click', goToPreviousStep);
  document.getElementById('nextBtn').addEventListener('click', goToNextStep);
  updateNavigationButtons();
}

function goToPreviousStep() {
  if (currentStep > 1) {
    _saveCurrentDraft();
    currentStep--;
    updateWizardUI();
  }
}

function goToNextStep() {
  if (!validateCurrentStep()) return;
  _saveCurrentDraft();

  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    updateWizardUI();
    if (currentStep === TOTAL_STEPS) renderReview();
  }
}

function updateWizardUI() {
  document.querySelectorAll('.wizard-step').forEach((step, i) => {
    step.classList.toggle('active', i + 1 === currentStep);
  });
  document.querySelectorAll('.progress-step').forEach((step, i) => {
    const n = i + 1;
    step.classList.remove('active', 'completed');
    if (n === currentStep) step.classList.add('active');
    else if (n < currentStep) step.classList.add('completed');
  });
  updateNavigationButtons();
  document.querySelector('.wizard-content').scrollIntoView({ behavior: 'smooth' });
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  prevBtn.style.visibility = currentStep > 1 ? 'visible' : 'hidden';
  if (currentStep === TOTAL_STEPS) {
    nextBtn.style.visibility = 'hidden';
  } else {
    nextBtn.style.visibility = 'visible';
    nextBtn.textContent = currentStep === TOTAL_STEPS - 1 ? 'Review →' : 'Next →';
  }
}

// ========================================
// Validation
// ========================================

function validateCurrentStep() {
  syncFormToState();
  switch (currentStep) {
    case 1: return validateGeneral();
    case 2: return validateInterview();
    case 5: return validateCertification();
    case 6: return validateSignature();
    default: return true;
  }
}

function validateGeneral() {
  let valid = true;
  if (!report.schoolName) { showError('schoolNameError', 'Required.'); valid = false; } else clearError('schoolNameError');
  if (!report.teacherFirstName) { showError('firstNameError', 'Required.'); valid = false; } else clearError('firstNameError');
  if (!report.teacherLastName) { showError('lastNameError', 'Required.'); valid = false; } else clearError('lastNameError');
  if (!report.teacherEmail) { showError('emailError', 'Required.'); valid = false; } else clearError('emailError');
  return valid;
}

function validateInterview() {
  let valid = true;
  if (!report.interviewDates) { showError('interviewDatesError', 'Required.'); valid = false; } else clearError('interviewDatesError');
  if (!report.interviewPlace) { showError('interviewPlaceError', 'Required.'); valid = false; } else clearError('interviewPlaceError');
  if (!report.interviewCountry) { showError('interviewCountryError', 'Required.'); valid = false; } else clearError('interviewCountryError');
  if (!report.interviewPlatform) { showError('interviewPlatformError', 'Required.'); valid = false; } else clearError('interviewPlatformError');
  if (!report.interviewLength) { showError('interviewLengthError', 'Required.'); valid = false; } else clearError('interviewLengthError');
  if (!report.communicationDetails) { showError('communicationError', 'Required.'); valid = false; } else clearError('communicationError');

  // Validate at least 2 references have name + email
  let refsValid = 0;
  for (const ref of report.references) {
    if (ref.name.trim() && ref.email.trim()) refsValid++;
  }
  if (refsValid < 2) { showError('referencesError', 'At least 2 references with name and email are required.'); valid = false; }
  else clearError('referencesError');

  return valid;
}

function validateCertification() {
  if (report.nativeEnglishSpeaker.applicable && !report.nativeEnglishSpeaker.justification) {
    showError('justificationError', 'Justification is required when hiring a native English speaker.');
    return false;
  }
  clearError('justificationError');
  return true;
}

function validateSignature() {
  let valid = true;
  if (!report.signature.imageDataUrl) { showError('signatureError', 'Signature is required.'); valid = false; } else clearError('signatureError');
  if (!report.signature.signerName) { showError('signerNameError', 'Required.'); valid = false; } else clearError('signerNameError');
  if (!report.signature.signerTitle) { showError('signerTitleError', 'Required.'); valid = false; } else clearError('signerTitleError');
  return valid;
}

// ========================================
// Review
// ========================================

function renderReview() {
  syncFormToState();
  const container = document.getElementById('reviewContainer');

  const serviceLabels = {
    meetAtAirport: 'Meet at airport',
    hostFamily: 'Host family for first two weeks',
    transientHotel: 'Transient hotel for first two weeks',
    rentalCar: 'Rental car for first two weeks',
    housingAssistance: 'Help find housing/furnish apartment',
    socialSecurity: 'Help with Social Security card'
  };

  const servicesHtml = Object.entries(report.arrivalServices)
    .map(([key, val]) => `
      <div class="review-field">
        <span class="review-label">${serviceLabels[key]}</span>
        <span class="review-value">${val.provided ? 'Yes' : 'No'}${val.provided && val.details ? ` — ${escapeHtml(val.details)}` : ''}</span>
      </div>
    `).join('');

  const refsHtml = report.references
    .filter(r => r.name)
    .map((r, i) => `
      <div class="review-field" style="flex-direction: column; gap: 2px;">
        <span class="review-label">${i + 1}. ${escapeHtml(r.name)}${r.title ? `, ${escapeHtml(r.title)}` : ''}</span>
        <span class="review-value" style="text-align: left; font-size: 0.9rem;">${escapeHtml(r.email)}${r.dateContacted ? ` — ${escapeHtml(r.dateContacted)}` : ''}${r.platform ? ` (${escapeHtml(r.platform)})` : ''}</span>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="review-section">
      <h3>General Information</h3>
      <div class="review-field"><span class="review-label">School</span><span class="review-value">${escapeHtml(report.schoolName)}</span></div>
      <div class="review-field"><span class="review-label">Date</span><span class="review-value">${escapeHtml(report.date)}</span></div>
      <div class="review-field"><span class="review-label">Teacher</span><span class="review-value">${escapeHtml(report.teacherFirstName)} ${escapeHtml(report.teacherLastName)}</span></div>
      <div class="review-field"><span class="review-label">Email</span><span class="review-value">${escapeHtml(report.teacherEmail)}</span></div>
    </div>

    <div class="review-section">
      <h3>Interview & References</h3>
      <div class="review-field"><span class="review-label">Interview Date(s)</span><span class="review-value">${escapeHtml(report.interviewDates)}</span></div>
      <div class="review-field"><span class="review-label">Place</span><span class="review-value">${escapeHtml(report.interviewPlace)}</span></div>
      <div class="review-field"><span class="review-label">Country</span><span class="review-value">${escapeHtml(report.interviewCountry)}</span></div>
      <div class="review-field"><span class="review-label">Platform</span><span class="review-value">${escapeHtml(report.interviewPlatform)}</span></div>
      <div class="review-field"><span class="review-label">Length</span><span class="review-value">${escapeHtml(report.interviewLength)}</span></div>
      <div class="review-field"><span class="review-label">Communication</span><span class="review-value multiline">${escapeHtml(report.communicationDetails)}</span></div>
      <h4 style="margin: 12px 0 8px; color: var(--color-primary-dark);">References</h4>
      ${refsHtml}
    </div>

    <div class="review-section">
      <h3>English Test</h3>
      <div class="review-field"><span class="review-label">Verbal tested</span><span class="review-value">${report.englishTest.verbalTested ? 'Yes' : 'No'}</span></div>
      ${report.englishTest.verbalTested ? `
        <div class="review-field"><span class="review-label">Date</span><span class="review-value">${escapeHtml(report.englishTest.verbalDate)}</span></div>
        <div class="review-field"><span class="review-label">Assessment</span><span class="review-value">${escapeHtml(report.englishTest.verbalAssessment)}</span></div>
        <div class="review-field"><span class="review-label">By native speaker</span><span class="review-value">${report.englishTest.verbalByNativeSpeaker ? 'Yes' : 'No'}</span></div>
      ` : ''}
      <div class="review-field"><span class="review-label">Written tested</span><span class="review-value">${report.englishTest.writtenTested ? 'Yes' : 'No'}</span></div>
      ${report.englishTest.writtenTested && report.englishTest.writtenNotes ? `
        <div class="review-field"><span class="review-label">Notes</span><span class="review-value">${escapeHtml(report.englishTest.writtenNotes)}</span></div>
      ` : ''}
    </div>

    <div class="review-section">
      <h3>Arrival Services</h3>
      ${servicesHtml}
    </div>

    <div class="review-section">
      <h3>Certification</h3>
      ${report.certification.procedures ? `<div class="review-field"><span class="review-label">Procedures</span><span class="review-value multiline">${escapeHtml(report.certification.procedures)}</span></div>` : ''}
      ${report.certification.stepsToObtain ? `<div class="review-field"><span class="review-label">Steps</span><span class="review-value multiline">${escapeHtml(report.certification.stepsToObtain)}</span></div>` : ''}
      <div class="review-field"><span class="review-label">Teacher cost</span><span class="review-value">${report.certification.teacherCost ? `Yes — ${escapeHtml(report.certification.costAmount)} (${report.certification.costTiming === 'advance' ? 'pay in advance' : report.certification.costTiming === 'after_arrival' ? 'pay after arrival' : 'timing not specified'})` : 'No'}</span></div>
      ${report.nativeEnglishSpeaker.applicable ? `
        <h4 style="margin: 12px 0 8px; color: var(--color-primary-dark);">Native English Speaker Justification</h4>
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(report.nativeEnglishSpeaker.justification)}</p>
      ` : ''}
    </div>

    <div class="review-section">
      <h3>Signature</h3>
      ${report.signature.imageDataUrl ? `<img src="${report.signature.imageDataUrl}" alt="Signature" style="max-width: 300px; border: 1px solid var(--color-border); border-radius: 4px; margin-bottom: 8px;">` : '<p>No signature</p>'}
      <div class="review-field"><span class="review-label">Name</span><span class="review-value">${escapeHtml(report.signature.signerName)}</span></div>
      <div class="review-field"><span class="review-label">Title</span><span class="review-value">${escapeHtml(report.signature.signerTitle)}</span></div>
    </div>
  `;
}

// ========================================
// PDF Generation
// ========================================

async function generateReport() {
  const overlay = document.getElementById('generatingOverlay');
  const statusEl = document.getElementById('generatingStatus');
  overlay.style.display = 'flex';

  try {
    const pdfBytes = await generatePDF(report, (s) => { statusEl.textContent = s; });
    const filename = generateFilename(report.date, report.teacherLastName);

    statusEl.textContent = 'Downloading...';
    downloadPDF(pdfBytes, filename);
    clearDraft(DRAFT_KEY);

    statusEl.textContent = 'Complete!';
    setTimeout(() => { overlay.style.display = 'none'; }, 1000);
  } catch (error) {
    console.error('PDF generation failed:', error);
    overlay.style.display = 'none';
    showErrorWithDebugDownload(error);
  }
}

// ========================================
// Error Handling
// ========================================

function showErrorWithDebugDownload(error) {
  const overlay = document.createElement('div');
  overlay.className = 'progress-overlay';
  overlay.style.display = 'flex';

  const modal = document.createElement('div');
  modal.className = 'progress-modal error-modal';
  modal.innerHTML = `
    <p class="error-modal-title">Failed to generate PDF</p>
    <p class="error-modal-message">${escapeHtml(error.message)}</p>
    <p class="error-modal-hint">Please download the debug file and share it so we can investigate.</p>
    <div class="error-modal-actions">
      <button type="button" class="btn-primary btn-download-debug">Download Debug Info</button>
      <button type="button" class="btn-secondary btn-close-error">Close</button>
    </div>
  `;

  modal.querySelector('.btn-download-debug').addEventListener('click', () => downloadDebugInfo(error));
  modal.querySelector('.btn-close-error').addEventListener('click', () => overlay.remove());

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function downloadDebugInfo(error) {
  const debugData = {
    appVersion: APP_VERSION, form: 'recruitment-report',
    timestamp: new Date().toISOString(), userAgent: navigator.userAgent,
    error: { message: error.message, stack: error.stack },
    report: _buildDraftData()
  };
  const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `debug_recruitment_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ========================================
// Utilities
// ========================================

function showError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
function clearError(id) { const el = document.getElementById(id); if (el) el.textContent = ''; }

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
