document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const API_BASE = 'http://localhost:8080/api';

    // --- DOM Elements ---
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const patientForm = document.getElementById('patient-form');
    const logoutBtn = document.getElementById('logout-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const directoryTbody = document.getElementById('directory-tbody');

    // Tabs
    const tabRegister = document.getElementById('tab-register');
    const tabDirectory = document.getElementById('tab-directory');
    const sectionRegister = document.getElementById('section-register');
    const sectionDirectory = document.getElementById('section-directory');

    // Modal
    const patientModal = document.getElementById('patient-modal');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalEditBtn = document.getElementById('modal-edit-btn');
    const modalDeleteBtn = document.getElementById('modal-delete-btn');
    const modalPrintBtn = document.getElementById('modal-print-btn');

    // Confirm Dialog
    const confirmDialog = document.getElementById('confirm-dialog');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const confirmText = document.getElementById('confirm-text');

    // Form elements
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const editPatientId = document.getElementById('edit-patient-id');
    const btnSubmit = document.getElementById('btn-submit');
    const btnCancel = document.getElementById('btn-cancel');

    // Search, Filters & Refresh
    const searchInput = document.getElementById('patient-search');
    const refreshBtn = document.getElementById('refresh-btn');
    const filterBlood = document.getElementById('filter-blood');
    const filterDoctor = document.getElementById('filter-doctor');
    const filterBlock = document.getElementById('filter-block');
    const doctorFilterContainer = document.getElementById('doctor-filter-container');

    // --- State ---
    let patientsCache = [];
    let currentViewPatient = null;
    let deleteTargetId = null;

    // --- Initialize ---
    const isAuthenticated = localStorage.getItem('opd_auth') === 'true';
    if (isAuthenticated) {
        showDashboard();
    } else {
        showLogin();
    }

    // Toggle Password Visibility
    const togglePasswordBtn = document.getElementById('toggle-password');
    const loginPasswordInput = document.getElementById('login-password');
    if (togglePasswordBtn && loginPasswordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = loginPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPasswordInput.setAttribute('type', type);
            togglePasswordBtn.querySelector('.material-symbols-outlined').textContent = 
                type === 'password' ? 'visibility' : 'visibility_off';
        });
    }

    // Role Tab Switch on Login Page
    const tabAdmin = document.getElementById('login-tab-admin');
    const tabDoctor = document.getElementById('login-tab-doctor');
    const loginRole = document.getElementById('login-role');
    const doctorGroup = document.getElementById('login-doctor-group');
    const emailGroup = document.getElementById('login-email-group');
    const emailInput = document.getElementById('login-email');

    if (tabAdmin && tabDoctor) {
        tabAdmin.addEventListener('click', () => {
            tabAdmin.classList.add('active');
            tabDoctor.classList.remove('active');
            loginRole.value = 'admin';
            doctorGroup.style.display = 'none';
            emailGroup.style.display = 'block';
            emailInput.required = true;
        });

        tabDoctor.addEventListener('click', () => {
            tabDoctor.classList.add('active');
            tabAdmin.classList.remove('active');
            loginRole.value = 'doctor';
            doctorGroup.style.display = 'block';
            emailGroup.style.display = 'none';
            emailInput.required = false;
        });
    }

    // Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const role = loginRole ? loginRole.value : 'admin';
        const passwordInput = document.getElementById('login-password').value;

        if (passwordInput) {
            localStorage.setItem('opd_auth', 'true');
            localStorage.setItem('opd_role', role);

            if (role === 'doctor') {
                const doctorVal = document.getElementById('login-doctor').value;
                localStorage.setItem('opd_doctor_id', doctorVal);
                localStorage.setItem('opd_username', formatDoctor(doctorVal));
            } else {
                localStorage.setItem('opd_username', 'Dr. Admin');
                localStorage.removeItem('opd_doctor_id');
            }

            showDashboard();
            showToast('Logged in successfully!');
            loginForm.reset();
            // Reset fields
            loginPasswordInput.type = 'password';
            if (togglePasswordBtn) {
                togglePasswordBtn.querySelector('.material-symbols-outlined').textContent = 'visibility';
            }
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('opd_auth');
        localStorage.removeItem('opd_role');
        localStorage.removeItem('opd_username');
        localStorage.removeItem('opd_doctor_id');
        showLogin();
        showToast('Logged out successfully!');
    });

    // Tab Switching
    tabRegister.addEventListener('click', () => {
        switchTab('register');
    });

    tabDirectory.addEventListener('click', () => {
        switchTab('directory');
        loadPatients();
    });

    // Search & Advanced Filters
    searchInput.addEventListener('input', applyFilters);
    if (filterBlood) filterBlood.addEventListener('change', applyFilters);
    if (filterDoctor) filterDoctor.addEventListener('change', applyFilters);
    if (filterBlock) filterBlock.addEventListener('change', applyFilters);

    // Refresh
    refreshBtn.addEventListener('click', () => {
        loadPatients();
    });

    // Modal Print
    if (modalPrintBtn) {
        modalPrintBtn.addEventListener('click', () => {
            if (currentViewPatient) {
                printPatientInvoice(currentViewPatient);
            }
        });
    }

    // Patient Form Submit (Create & Update)
    patientForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const patientData = collectFormData();
        const isEditMode = !!editPatientId.value;
        const submitBtn = patientForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = isEditMode ? 'Updating...' : 'Registering...';
        submitBtn.disabled = true;

        try {
            const url = isEditMode
                ? `${API_BASE}/patients/${editPatientId.value}`
                : `${API_BASE}/patients`;
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });

            const data = await response.json();

            if (response.ok) {
                showToast(isEditMode ? 'Patient updated successfully!' : 'Patient registered successfully!');
                resetForm();
                if (isEditMode) {
                    switchTab('directory');
                    loadPatients();
                }
            } else {
                showToast('Failed: ' + (data.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Network Error:', error);
            showToast('Failed to connect to backend server.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Cancel / Clear Form
    btnCancel.addEventListener('click', (e) => {
        e.preventDefault();
        resetForm();
    });

    // --- Modal Events ---
    modalCloseBtn.addEventListener('click', closeModal);
    patientModal.addEventListener('click', (e) => {
        if (e.target === patientModal) closeModal();
    });

    modalEditBtn.addEventListener('click', () => {
        if (currentViewPatient) {
            closeModal();
            editPatient(currentViewPatient);
        }
    });

    modalDeleteBtn.addEventListener('click', () => {
        if (currentViewPatient) {
            closeModal();
            showDeleteConfirm(currentViewPatient.id, currentViewPatient.personal?.name || 'this patient');
        }
    });

    // --- Confirm Dialog Events ---
    confirmCancelBtn.addEventListener('click', closeConfirmDialog);
    confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog) closeConfirmDialog();
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteTargetId) return;
        confirmDeleteBtn.textContent = 'Deleting...';
        confirmDeleteBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/patients/${deleteTargetId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('Patient deleted successfully!');
                loadPatients();
            } else {
                const data = await response.json();
                showToast('Delete failed: ' + (data.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Network Error:', error);
            showToast('Failed to connect to backend server.');
        } finally {
            closeConfirmDialog();
            confirmDeleteBtn.innerHTML = '<span class="material-symbols-outlined">delete</span> Delete';
            confirmDeleteBtn.disabled = false;
        }
    });

    // Keyboard: Escape to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (confirmDialog.classList.contains('active')) {
                closeConfirmDialog();
            } else if (patientModal.classList.contains('active')) {
                closeModal();
            }
        }
    });

    // --- Core Functions ---

    async function loadPatients() {
        directoryTbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="table-loading">
                        <span class="material-symbols-outlined">progress_activity</span>
                        <p>Loading patients...</p>
                    </div>
                </td>
            </tr>`;

        try {
            const response = await fetch(`${API_BASE}/patients`);
            const data = await response.json();

            if (response.ok) {
                patientsCache = data.patients || [];
                populateBlockFilter();
                applyFilters();
            } else {
                directoryTbody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            <div class="table-empty">
                                <span class="material-symbols-outlined">error</span>
                                <p>Failed to load patients.</p>
                            </div>
                        </td>
                    </tr>`;
            }
        } catch (error) {
            console.error('Load error:', error);
            directoryTbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="table-empty">
                            <span class="material-symbols-outlined">cloud_off</span>
                            <p>Cannot connect to server. Is the backend running?</p>
                        </div>
                    </td>
                </tr>`;
        }
    }

    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const blood = filterBlood ? filterBlood.value : '';
        const doctor = filterDoctor ? filterDoctor.value : '';
        const block = filterBlock ? filterBlock.value : '';
        
        const role = localStorage.getItem('opd_role');
        const doctorId = localStorage.getItem('opd_doctor_id');
        
        let filtered = patientsCache;
        
        // 1. Role-based filtering
        if (role === 'doctor' && doctorId) {
            filtered = filtered.filter(p => p.appointment?.doctor === doctorId);
        }
        
        // 2. Blood Group filter
        if (blood) {
            filtered = filtered.filter(p => p.personal?.bloodGroup === blood);
        }
        
        // 3. Doctor filter
        if (doctor && role !== 'doctor') {
            filtered = filtered.filter(p => p.appointment?.doctor === doctor);
        }
        
        // 4. Block / Ward filter
        if (block) {
            filtered = filtered.filter(p => p.appointment?.blockWard === block);
        }
        
        // 5. Search Text query
        if (query) {
            filtered = filtered.filter(p => {
                const name = (p.personal?.name || '').toLowerCase();
                const contact = (p.personal?.contact || '').toLowerCase();
                const docName = formatDoctor(p.appointment?.doctor).toLowerCase();
                const blockName = (p.appointment?.blockWard || '').toLowerCase();
                return name.includes(query) || contact.includes(query) || docName.includes(query) || blockName.includes(query);
            });
        }
        
        renderPatientTable(filtered);
    }

    function populateBlockFilter() {
        if (!filterBlock) return;
        
        const currentSelection = filterBlock.value;
        
        const wards = [...new Set(patientsCache
            .map(p => p.appointment?.blockWard)
            .filter(w => w && w.trim() !== '')
        )].sort();
        
        filterBlock.innerHTML = '<option value="">All Wards/Blocks</option>' + 
            wards.map(w => `<option value="${escapeHtml(w)}">${escapeHtml(w)}</option>`).join('');
            
        if (wards.includes(currentSelection)) {
            filterBlock.value = currentSelection;
        } else {
            filterBlock.value = '';
        }
    }

    function renderPatientTable(patients) {
        if (!patients.length) {
            directoryTbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="table-empty">
                            <span class="material-symbols-outlined">person_off</span>
                            <p>No patients found.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        directoryTbody.innerHTML = patients.map(p => {
            const name = p.personal?.name || '—';
            const age = p.personal?.age || '—';
            const doctor = formatDoctor(p.appointment?.doctor);
            const time = p.appointment?.time || '—';
            const contact = p.personal?.contact || '—';

            return `
                <tr>
                    <td><strong>${escapeHtml(name)}</strong></td>
                    <td>${age}</td>
                    <td>${escapeHtml(doctor)}</td>
                    <td>${escapeHtml(time)}</td>
                    <td>${escapeHtml(contact)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action view" onclick="window._viewPatient('${p.id}')" title="View">
                                <span class="material-symbols-outlined">visibility</span>
                                View
                            </button>
                            <button class="btn-action edit" onclick="window._editPatient('${p.id}')" title="Edit">
                                <span class="material-symbols-outlined">edit</span>
                                Edit
                            </button>
                            <button class="btn-action delete" onclick="window._deletePatient('${p.id}', '${escapeHtml(name)}')" title="Delete">
                                <span class="material-symbols-outlined">delete</span>
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    // --- View Patient Modal ---
    function viewPatient(id) {
        const patient = patientsCache.find(p => p.id === id);
        if (!patient) return;

        currentViewPatient = patient;
        const p = patient.personal || {};
        const g = patient.guardian || {};
        const m = patient.medical || {};
        const a = patient.appointment || {};

        modalBody.innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title">
                    <span class="material-symbols-outlined">person</span> Personal Details
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Full Name</div>
                        <div class="detail-value">${escapeHtml(p.name || '—')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Age</div>
                        <div class="detail-value">${p.age || '—'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Blood Group</div>
                        <div class="detail-value">${p.bloodGroup ? `<span class="badge blood">${escapeHtml(p.bloodGroup)}</span>` : '—'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Contact</div>
                        <div class="detail-value">${escapeHtml(p.contact || '—')}</div>
                    </div>
                    <div class="detail-item full-width">
                        <div class="detail-label">Address</div>
                        <div class="detail-value">${escapeHtml(p.address || '—')}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">
                    <span class="material-symbols-outlined">family_restroom</span> Guardian Details
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Guardian Name</div>
                        <div class="detail-value">${escapeHtml(g.name || '—')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Guardian Contact</div>
                        <div class="detail-value">${escapeHtml(g.contact || '—')}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">
                    <span class="material-symbols-outlined">medical_information</span> Medical Details
                </div>
                <div class="detail-grid">
                    <div class="detail-item full-width">
                        <div class="detail-label">Description (Illness)</div>
                        <div class="detail-value">${escapeHtml(m.description || '—')}</div>
                    </div>
                    <div class="detail-item full-width">
                        <div class="detail-label">Previous Illness</div>
                        <div class="detail-value">${escapeHtml(m.previousIllness || '—')}</div>
                    </div>
                    <div class="detail-item full-width">
                        <div class="detail-label">Prescribed Medicines</div>
                        <div class="detail-value" style="white-space: pre-wrap;">${escapeHtml(m.medicines || '—')}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">
                    <span class="material-symbols-outlined">calendar_month</span> Appointment & Billing
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Doctor</div>
                        <div class="detail-value">${escapeHtml(formatDoctor(a.doctor))}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Block / Ward</div>
                        <div class="detail-value">${escapeHtml(a.blockWard || '—')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Time</div>
                        <div class="detail-value">${escapeHtml(a.time || '—')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Charges</div>
                        <div class="detail-value">Rs ${parseFloat(a.charges || 0).toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Follow-up Date</div>
                        <div class="detail-value">${escapeHtml(a.followupDate || '—')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Follow-up Time</div>
                        <div class="detail-value">${escapeHtml(a.followupTime || '—')}</div>
                    </div>
                </div>
            </div>
        `;

        patientModal.classList.add('active');
    }

    function closeModal() {
        patientModal.classList.remove('active');
        currentViewPatient = null;
    }

    // --- Edit Patient ---
    function editPatient(patient) {
        const p = patient.personal || {};
        const g = patient.guardian || {};
        const m = patient.medical || {};
        const a = patient.appointment || {};

        // Switch to register tab
        switchTab('register');

        // Set form to edit mode
        editPatientId.value = patient.id;
        formTitle.textContent = 'Edit Patient';
        formSubtitle.textContent = `Editing record for ${p.name || 'patient'}.`;
        btnSubmit.textContent = 'Update Patient';

        // Fill form fields
        document.getElementById('patient-name').value = p.name || '';
        document.getElementById('patient-age').value = p.age || '';
        document.getElementById('patient-blood').value = p.bloodGroup || '';
        document.getElementById('patient-contact').value = p.contact || '';
        document.getElementById('patient-address').value = p.address || '';

        document.getElementById('guardian-name').value = g.name || '';
        document.getElementById('guardian-contact').value = g.contact || '';

        document.getElementById('description').value = m.description || '';
        document.getElementById('previous-illness').value = m.previousIllness || '';
        document.getElementById('medicines').value = m.medicines || '';

        document.getElementById('doctor').value = a.doctor || '';
        document.getElementById('block-ward').value = a.blockWard || '';
        document.getElementById('time').value = a.time || '';
        document.getElementById('charges').value = a.charges || '';
        document.getElementById('followup-date').value = a.followupDate || '';
        document.getElementById('followup-time').value = a.followupTime || '';

        // Apply doctor-specific locks
        applyRolePermissionsToForm(true);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Delete Patient ---
    function showDeleteConfirm(id, name) {
        deleteTargetId = id;
        confirmText.textContent = `This will permanently delete "${name}". This action cannot be undone.`;
        confirmDialog.classList.add('active');
    }

    function closeConfirmDialog() {
        confirmDialog.classList.remove('active');
        deleteTargetId = null;
    }

    // --- Form Helpers ---
    function collectFormData() {
        return {
            personal: {
                name: document.getElementById('patient-name').value,
                age: parseInt(document.getElementById('patient-age').value),
                bloodGroup: document.getElementById('patient-blood').value,
                contact: document.getElementById('patient-contact').value,
                address: document.getElementById('patient-address').value,
            },
            guardian: {
                name: document.getElementById('guardian-name').value || null,
                contact: document.getElementById('guardian-contact').value || null,
            },
            medical: {
                description: document.getElementById('description').value,
                previousIllness: document.getElementById('previous-illness').value || null,
                medicines: document.getElementById('medicines').value || null,
            },
            appointment: {
                doctor: document.getElementById('doctor').value,
                blockWard: document.getElementById('block-ward').value,
                time: document.getElementById('time').value,
                charges: parseFloat(document.getElementById('charges').value),
                followupDate: document.getElementById('followup-date').value || null,
                followupTime: document.getElementById('followup-time').value || null,
            }
        };
    }

    function resetForm() {
        patientForm.reset();
        editPatientId.value = '';
        formTitle.textContent = 'New Patient Registration';
        formSubtitle.textContent = 'Enter details to admit a new patient to the Outpatient Department.';
        btnSubmit.textContent = 'Register Patient';

        applyRolePermissionsToForm(false);
    }

    function applyRolePermissionsToForm(isEditMode = false) {
        const role = localStorage.getItem('opd_role') || 'admin';
        const docId = localStorage.getItem('opd_doctor_id') || '';
        
        const adminFields = [
            'patient-name', 'patient-age', 'patient-blood', 'patient-contact', 'patient-address',
            'guardian-name', 'guardian-contact',
            'block-ward', 'charges', 'doctor'
        ];
        
        if (role === 'doctor') {
            // Lock administration/billing fields for doctor if they are editing a patient
            adminFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = isEditMode;
            });
            const doctorSelect = document.getElementById('doctor');
            if (doctorSelect && docId) {
                doctorSelect.value = docId;
                doctorSelect.disabled = true;
            }
        } else {
            // Admins can edit everything
            adminFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = false;
            });
        }
    }

    function printPatientInvoice(patient) {
        if (!patient) return;
        
        const printSection = document.getElementById('print-section');
        if (!printSection) return;
        
        const p = patient.personal || {};
        const g = patient.guardian || {};
        const m = patient.medical || {};
        const a = patient.appointment || {};
        
        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        printSection.innerHTML = `
            <div class="print-header">
                <div class="print-logo-section">
                    <span class="material-symbols-outlined print-logo-icon">local_hospital</span>
                    <div>
                        <h2 class="print-hospital-name">OPD CONNECT HOSPITAL</h2>
                        <p class="print-hospital-sub">123 Healthway Avenue, Medical City | Phone: +977-1-4455667</p>
                    </div>
                </div>
                <div class="print-title">
                    <h1>OPD INVOICE</h1>
                    <p>Registration Slip & Receipt</p>
                </div>
            </div>
            
            <div class="print-metadata-grid">
                <div class="print-meta-block">
                    <h3>Patient Details</h3>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Patient Name:</span>
                        <span>${escapeHtml(p.name || '—')}</span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Age / Blood Group:</span>
                        <span>${p.age || '—'} / ${escapeHtml(p.bloodGroup || '—')}</span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Contact:</span>
                        <span>${escapeHtml(p.contact || '—')}</span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Address:</span>
                        <span>${escapeHtml(p.address || '—')}</span>
                    </div>
                </div>
                
                <div class="print-meta-block">
                    <h3>Administrative Details</h3>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Patient ID:</span>
                        <span><strong>${escapeHtml(patient.id || '—')}</strong></span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Date Generated:</span>
                        <span>${today}</span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Appointed Doctor:</span>
                        <span>${escapeHtml(formatDoctor(a.doctor))}</span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Block / Ward:</span>
                        <span>${escapeHtml(a.blockWard || '—')}</span>
                    </div>
                </div>
            </div>
            
            <table class="print-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">S.N.</th>
                        <th style="width: 60%;">Description of Service</th>
                        <th style="width: 30%; text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>OPD Registration Fee & Consultation Charges - ${escapeHtml(formatDoctor(a.doctor))}</td>
                        <td style="text-align: right;">Rs ${parseFloat(a.charges || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="text-align: right; font-weight: bold;">Grand Total:</td>
                        <td style="text-align: right; font-weight: bold;">Rs ${parseFloat(a.charges || 0).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="print-prescription-section">
                <h3>Prescription & Clinical Details</h3>
                <div class="print-meta-row" style="margin-bottom: 8px;">
                    <span class="print-meta-label" style="width: 150px; display: inline-block;">Primary Complaint:</span>
                    <span>${escapeHtml(m.description || '—')}</span>
                </div>
                ${m.previousIllness ? `
                <div class="print-meta-row" style="margin-bottom: 8px;">
                    <span class="print-meta-label" style="width: 150px; display: inline-block;">Previous Illness:</span>
                    <span>${escapeHtml(m.previousIllness)}</span>
                </div>` : ''}
                
                <div class="print-meta-row" style="margin-top: 15px; margin-bottom: 5px;">
                    <span class="print-meta-label">Prescribed Medicines:</span>
                </div>
                <div class="print-prescription-text">${escapeHtml(m.medicines || 'No medicines prescribed.')}</div>
                
                ${a.followupDate ? `
                <div class="print-meta-row" style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 8px;">
                    <span class="print-meta-label">Scheduled Follow-up Appointment:</span>
                    <span><strong>${escapeHtml(a.followupDate)} ${a.followupTime ? `at ${escapeHtml(a.followupTime)}` : ''}</strong></span>
                </div>` : ''}
            </div>
            
            <div class="print-footer">
                <div class="print-signature-space">
                    <div class="print-signature-line">Authorized Signatory</div>
                </div>
                <div class="print-signature-space">
                    <div class="print-signature-line">Attending Physician</div>
                </div>
            </div>
            
            <div class="print-sys-info">
                This slip is generated electronically. Powered by OPD Connect - Khataplus Solutions Concept
            </div>
        `;
        
        window.print();
    }

    // --- Tab Switching ---
    function switchTab(tab) {
        if (tab === 'register') {
            tabRegister.classList.add('active');
            tabDirectory.classList.remove('active');
            sectionRegister.classList.add('active');
            sectionDirectory.classList.remove('active');
        } else {
            tabDirectory.classList.add('active');
            tabRegister.classList.remove('active');
            sectionDirectory.classList.add('active');
            sectionRegister.classList.remove('active');
        }
    }

    // --- View Helpers ---
    function showLogin() {
        dashboardView.classList.remove('active');
        loginView.classList.add('active');
    }

    function showDashboard() {
        loginView.classList.remove('active');
        dashboardView.classList.add('active');

        const role = localStorage.getItem('opd_role') || 'admin';
        const name = localStorage.getItem('opd_username') || 'Dr. Admin';
        const docId = localStorage.getItem('opd_doctor_id') || '';

        const userNameEl = document.querySelector('.user-name');
        if (userNameEl) {
            userNameEl.textContent = name;
        }

        // Setup UI state depending on role
        const doctorSelect = document.getElementById('doctor');
        
        if (doctorFilterContainer) {
            doctorFilterContainer.style.display = (role === 'doctor') ? 'none' : 'block';
        }
        
        applyRolePermissionsToForm(false);
        
        if (role === 'doctor') {
            switchTab('directory');
            loadPatients();
        } else {
            switchTab('register');
        }
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function formatDoctor(value) {
        const map = {
            'dr-smith': 'Dr. Smith (Cardiology)',
            'dr-jane': 'Dr. Jane (General)',
            'dr-patel': 'Dr. Patel (Orthopedics)',
        };
        return map[value] || value || '—';
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Global Handlers (for inline onclick in table rows) ---
    window._viewPatient = (id) => viewPatient(id);
    window._editPatient = (id) => {
        const patient = patientsCache.find(p => p.id === id);
        if (patient) editPatient(patient);
    };
    window._deletePatient = (id, name) => showDeleteConfirm(id, name);
});
