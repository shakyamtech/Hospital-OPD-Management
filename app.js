document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const API_BASE = 'https://hospital-opd-management.onrender.com/api';

    // --- DOM Elements ---
    const landingView = document.getElementById('landing-view');
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
    const tabBilling = document.getElementById('tab-billing');
    const tabPharmacy = document.getElementById('tab-pharmacy');
    const tabSettings = document.getElementById('tab-settings');
    const sectionRegister = document.getElementById('section-register');
    const sectionDirectory = document.getElementById('section-directory');
    const sectionBilling = document.getElementById('section-billing');
    const sectionPharmacy = document.getElementById('section-pharmacy');
    const sectionSettings = document.getElementById('section-settings');
    const sectionRequests = document.getElementById('section-requests');
    const tabRequests = document.getElementById('tab-requests');

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
    let doctorsCache = [];
    let currentViewPatient = null;
    let deleteTargetId = null;

    // --- Initialize ---
    const isAuthenticated = localStorage.getItem('opd_auth') === 'true';
    fetchDoctors().then(() => {
        if (window.location.hash === '#admin' || window.location.hash === '#login' || window.location.search.includes('admin')) {
            if (isAuthenticated) {
                showDashboard();
            } else {
                showLogin();
            }
        } else {
            showLanding();
        }
    });

    const btnPortalLogin = document.getElementById('btn-portal-login');
    if (btnPortalLogin) {
        btnPortalLogin.addEventListener('click', () => {
            const isAuth = localStorage.getItem('opd_auth') === 'true';
            if (isAuth) {
                showDashboard();
            } else {
                showLogin();
            }
        });
    }

    const publicBookingModal = document.getElementById('public-booking-modal');
    const publicBookingCloseBtn = document.getElementById('public-booking-close-btn');
    const publicBookingForm = document.getElementById('public-booking-form');
    const bookingDoctorSelect = document.getElementById('booking-doctor');

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-book');
        if (btn) {
            e.preventDefault();
            if (publicBookingModal) {
                // If clicked from a doctor card, pre-select the doctor
                const doctorCard = btn.closest('.doctor-card');
                if (doctorCard && bookingDoctorSelect) {
                    const docName = doctorCard.querySelector('h3').textContent.trim();
                    for (let i = 0; i < bookingDoctorSelect.options.length; i++) {
                        if (bookingDoctorSelect.options[i].text.includes(docName)) {
                            bookingDoctorSelect.selectedIndex = i;
                            break;
                        }
                    }
                } else if (bookingDoctorSelect) {
                    bookingDoctorSelect.selectedIndex = 0; // reset
                }
                publicBookingModal.classList.add('active');
            }
        }
    });

    if (publicBookingCloseBtn) {
        publicBookingCloseBtn.addEventListener('click', () => {
            if (publicBookingModal) publicBookingModal.classList.remove('active');
        });
    }

    if (publicBookingForm) {
        publicBookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = publicBookingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;

            const requestData = {
                name: publicBookingForm.querySelector('input[type="text"]').value,
                phone: publicBookingForm.querySelector('input[type="tel"]').value,
                date: publicBookingForm.querySelector('input[type="date"]').value,
                doctor: bookingDoctorSelect ? bookingDoctorSelect.value : "General",
                status: "pending"
            };

            try {
                const response = await fetch(`${API_BASE}/appointment-requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                
                if (response.ok) {
                    if (publicBookingModal) publicBookingModal.classList.remove('active');
                    publicBookingForm.reset();
                    alert("Your appointment request has been sent! We will contact you shortly to confirm the time.");
                } else {
                    alert("Failed to submit request. Please try again.");
                }
            } catch (error) {
                console.error("Booking submission error:", error);
                alert("Failed to connect to the server.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    const loginLogo = document.getElementById('login-logo');
    if (loginLogo) {
        loginLogo.addEventListener('click', () => {
            showLanding();
            if (window.location.hash) {
                window.history.pushState('', document.title, window.location.pathname + window.location.search);
            }
        });
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
    const loginTabs = document.querySelectorAll('.login-tab');
    const loginRole = document.getElementById('login-role');
    const doctorGroup = document.getElementById('login-doctor-group');
    const emailGroup = document.getElementById('login-email-group');
    const emailInput = document.getElementById('login-email');

    // Check for admin in URL
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminUrl = urlParams.has('admin') || window.location.pathname.endsWith('/admin') || window.location.hash === '#admin';
    const adminTab = document.getElementById('login-tab-admin');
    
    if (isAdminUrl && adminTab) {
        adminTab.style.display = 'inline-block';
    } else if (adminTab) {
        adminTab.style.display = 'none';
    }

    loginTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            loginTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const role = tab.getAttribute('data-role');
            if (loginRole) loginRole.value = role;
            
            if (role === 'doctor') {
                if (doctorGroup) doctorGroup.style.display = 'block';
                if (emailGroup) emailGroup.style.display = 'none';
                if (emailInput) emailInput.required = false;
            } else {
                if (doctorGroup) doctorGroup.style.display = 'none';
                if (emailGroup) emailGroup.style.display = 'block';
                if (emailInput) emailInput.required = true;
            }
        });
    });

    // Auto select admin if URL has it
    if (isAdminUrl && adminTab) {
        adminTab.click();
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
                let displayName = 'Administrator';
                if (role === 'staff') displayName = 'Staff Member';
                else if (role === 'cashier') displayName = 'Cashier';
                else if (role === 'pharmacy') displayName = 'Pharmacist';
                
                localStorage.setItem('opd_username', displayName);
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
    if (tabRegister) {
        tabRegister.addEventListener('click', () => {
            switchTab('register');
        });
    }

    if (tabDirectory) {
        tabDirectory.addEventListener('click', () => {
            switchTab('directory');
            loadPatients();
        });
    }

    if (tabBilling) {
        tabBilling.addEventListener('click', () => {
            switchTab('billing');
            if (typeof loadBilling === 'function') loadBilling();
        });
    }
    
    if (tabPharmacy) {
        tabPharmacy.addEventListener('click', () => {
            switchTab('pharmacy');
            if (typeof loadPharmacy === 'function') loadPharmacy();
        });
    }
    
    if (tabSettings) {
        tabSettings.addEventListener('click', () => {
            switchTab('settings');
            if (typeof fetchDoctors === 'function') fetchDoctors();
        });
    }

    if (tabRequests) {
        tabRequests.addEventListener('click', () => {
            switchTab('requests');
            fetchAppointmentRequests();
        });
    }

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
                updateDoctorAlerts();
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
                tests: document.getElementById('patient-tests') ? document.getElementById('patient-tests').value || null : null,
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
            'patient-name', 'patient-age', 'patient-contact', 'patient-address',
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

        // Handle visibility of doctor-only sections
        const docOnlySections = [
            document.getElementById('medical-details-section'),
            document.getElementById('followup-container'),
            document.getElementById('blood-group-container')
        ];

        const showDocSections = (role === 'doctor' || role === 'admin');
        
        docOnlySections.forEach(section => {
            if (section) {
                section.style.display = showDocSections ? '' : 'none';
            }
        });
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
                    <span>${escapeHtml(m.description || '-')}</span>
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

                ${m.tests ? `
                <div class="print-meta-row" style="margin-top: 15px; margin-bottom: 5px;">
                    <span class="print-meta-label">Tests & Investigations:</span>
                </div>
                <div class="print-prescription-text">${escapeHtml(m.tests)}</div>` : ''}
                
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
        const tabs = ['register', 'directory', 'billing', 'pharmacy', 'settings', 'requests'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            const sec = document.getElementById(`section-${t}`);
            if (btn) btn.classList.remove('active');
            if (sec) sec.classList.remove('active');
        });

        const activeBtn = document.getElementById(`tab-${tab}`);
        const activeSec = document.getElementById(`section-${tab}`);
        if (activeBtn) activeBtn.classList.add('active');
        if (activeSec) activeSec.classList.add('active');
    }

    // --- View Helpers ---
    function showLanding() {
        dashboardView.classList.remove('active');
        loginView.classList.remove('active');
        landingView.classList.add('active');
    }

    function showLogin() {
        dashboardView.classList.remove('active');
        landingView.classList.remove('active');
        loginView.classList.add('active');
    }

    function showDashboard() {
        loginView.classList.remove('active');
        landingView.classList.remove('active');
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
            if (tabRegister) tabRegister.style.display = 'none';
            if (tabBilling) tabBilling.style.display = 'none';
            if (tabPharmacy) tabPharmacy.style.display = 'none';
            if (tabSettings) tabSettings.style.display = 'none';
            if (tabRequests) tabRequests.style.display = 'none';
            switchTab('directory');
            loadPatients();
        } else if (role === 'pharmacy') {
            if (tabRegister) tabRegister.style.display = 'none';
            if (tabBilling) tabBilling.style.display = 'none';
            if (tabPharmacy) tabPharmacy.style.display = 'inline-flex';
            if (tabSettings) tabSettings.style.display = 'none';
            if (tabRequests) tabRequests.style.display = 'none';
            switchTab('pharmacy');
            if (typeof loadPharmacy === 'function') loadPharmacy();
        } else if (role === 'cashier') {
            if (tabRegister) tabRegister.style.display = 'none';
            if (tabBilling) tabBilling.style.display = 'inline-flex';
            if (tabPharmacy) tabPharmacy.style.display = 'none';
            if (tabSettings) tabSettings.style.display = 'none';
            if (tabRequests) tabRequests.style.display = 'none';
            switchTab('billing');
            if (typeof loadBilling === 'function') loadBilling();
        } else if (role === 'staff') {
            if (tabRegister) tabRegister.style.display = 'inline-flex';
            if (tabBilling) tabBilling.style.display = 'none';
            if (tabPharmacy) tabPharmacy.style.display = 'none';
            if (tabSettings) tabSettings.style.display = 'none';
            if (tabRequests) tabRequests.style.display = 'inline-flex';
            switchTab('register');
        } else {
            // Admin sees all
            if (tabRegister) tabRegister.style.display = 'inline-flex';
            if (tabBilling) tabBilling.style.display = 'inline-flex';
            if (tabPharmacy) tabPharmacy.style.display = 'inline-flex';
            if (tabSettings) tabSettings.style.display = 'inline-flex';
            if (tabRequests) tabRequests.style.display = 'inline-flex';
            switchTab('register');
        }
    }

    function updateDoctorAlerts() {
        const role = localStorage.getItem('opd_role');
        const doctorId = localStorage.getItem('opd_doctor_id');
        const alertsBanner = document.getElementById('doctor-alerts');
        const alertsDetails = document.getElementById('doctor-alerts-details');
        
        if (!alertsBanner || !alertsDetails) return;
        
        if (role !== 'doctor' || !doctorId) {
            alertsBanner.style.display = 'none';
            return;
        }
        
        // Filter patients for this doctor
        const doctorPatients = patientsCache.filter(p => p.appointment?.doctor === doctorId);
        
        // 1. Identify New Patients (no prescribed medicines yet)
        const newPatients = doctorPatients.filter(p => !p.medical?.medicines || p.medical.medicines.trim() === '');
        
        // 2. Identify Upcoming Follow-up Patients
        const followupPatients = doctorPatients.filter(p => p.appointment?.followupDate);
        
        let detailsHtml = '';
        
        if (newPatients.length === 0 && followupPatients.length === 0) {
            alertsBanner.style.display = 'none';
            return;
        }
        
        if (newPatients.length > 0) {
            const listItems = newPatients.map(p => {
                const name = escapeHtml(p.personal?.name || 'Unnamed');
                const age = p.personal?.age ? `, Age ${p.personal.age}` : '';
                const contact = p.personal?.contact ? ` (${escapeHtml(p.personal.contact)})` : '';
                return `<li><strong>${name}</strong>${age}${contact}</li>`;
            }).join('');

            detailsHtml += `
                <div class="alert-item new-patients">
                    <span class="material-symbols-outlined">person_alert</span>
                    <div class="alert-item-content">
                        <strong>${newPatients.length} New Patient(s) waiting for checkup:</strong>
                        <ul class="alert-sublist">${listItems}</ul>
                    </div>
                </div>
            `;
        }
        
        if (followupPatients.length > 0) {
            // Sort follow-ups by date ascending
            const sortedFollowups = [...followupPatients].sort((a, b) => {
                return new Date(a.appointment.followupDate) - new Date(b.appointment.followupDate);
            });
            
            const listItems = sortedFollowups.map(p => {
                const name = escapeHtml(p.personal?.name || 'Unnamed');
                const date = escapeHtml(p.appointment.followupDate);
                const time = p.appointment.followupTime ? ` at ${escapeHtml(p.appointment.followupTime)}` : '';
                return `<li><strong>${name}</strong> - Scheduled on <span class="followup-time-badge">${date}${time}</span></li>`;
            }).join('');
            
            detailsHtml += `
                <div class="alert-item followup-patients">
                    <span class="material-symbols-outlined">calendar_clock</span>
                    <div class="alert-item-content">
                        <strong>${followupPatients.length} Upcoming Follow-up(s) scheduled:</strong>
                        <ul class="alert-sublist">${listItems}</ul>
                    </div>
                </div>
            `;
        }
        
        alertsDetails.innerHTML = detailsHtml;
        alertsBanner.style.display = 'flex';
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

        };
        return map[value] || value || '-';
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

    // --- Doctor Management Logic ---
    async function fetchDoctors() {
        try {
            const response = await fetch(`${API_BASE}/doctors`);
            if (response.ok) {
                const data = await response.json();
                doctorsCache = data.doctors || [];
                populateDoctorDropdowns(doctorsCache);
                renderDoctorSettings(doctorsCache);
                renderPublicDoctors(doctorsCache);
            } else {
                console.warn('API returned non-OK status, falling back to empty doctor list.');
                populateDoctorDropdowns([]);
            }
        } catch (error) {
            console.error('Failed to fetch doctors', error);
            populateDoctorDropdowns([]);
        }
    }

    function populateDoctorDropdowns(doctors) {
        const loginDoc = document.getElementById('login-doctor');
        const regDoc = document.getElementById('doctor');
        const filterDoc = document.getElementById('filter-doctor');
        const bookingDoc = document.getElementById('booking-doctor');

        let loginHtml = '<option value="" disabled selected>Select Doctor Profile</option>';
        let regHtml = '<option value="" disabled selected>Select Doctor</option>';
        let filterHtml = '<option value="">All Doctors</option>';
        let bookingHtml = '<option value="">-- Choose Option --</option>';

        if (!doctors || doctors.length === 0) {
            loginHtml = '<option value="" disabled selected>No doctors available</option>';
            regHtml = '<option value="" disabled selected>No doctors available</option>';
            bookingHtml = '<option value="">No doctors available</option>';
        } else {
            doctors.forEach(d => {
                const val = d.id;
                const text = `${d.name} (${d.specialization})`;
                const opt = `<option value="${val}">${text}</option>`;
                loginHtml += opt;
                regHtml += opt;
                filterHtml += opt;
                bookingHtml += opt;
            });
            bookingHtml += '<option value="General">General Physician</option>';
        }

        if (loginDoc) loginDoc.innerHTML = loginHtml;
        if (regDoc) regDoc.innerHTML = regHtml;
        if (filterDoc) filterDoc.innerHTML = filterHtml;
        if (bookingDoc) bookingDoc.innerHTML = bookingHtml;
    }

    function renderPublicDoctors(doctors) {
        const grid = document.getElementById('public-doctors-grid');
        if (!grid) return;
        
        if (doctors.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No doctors currently available.</p>';
            return;
        }

        // Show all doctors
        const docsToShow = doctors;
        let html = '';
        docsToShow.forEach(d => {
            html += `
                <div class="doctor-card glass-panel">
                    <div class="doctor-avatar">
                        <span class="material-symbols-outlined">person</span>
                    </div>
                    <div class="doctor-info">
                        <h3>${d.name}</h3>
                        <p class="doctor-specialty">${d.specialization}</p>
                        <a href="#" class="btn-text btn-book">Book Appointment <span class="material-symbols-outlined">arrow_forward</span></a>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    }

    function renderDoctorSettings(doctors) {
        const tbody = document.getElementById('doctors-tbody');
        if (!tbody) return;
        
        if (doctors.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 1rem;">No doctors found. Add one above.</td></tr>`;
            return;
        }

        tbody.innerHTML = doctors.map(d => `
            <tr>
                <td><strong>${d.name.replace(/</g, "&lt;")}</strong></td>
                <td>${d.specialization.replace(/</g, "&lt;")}</td>
                <td>
                    <button class="btn-secondary" style="color: var(--danger);" onclick="window._deleteDoctor('${d.id}')">
                        <span class="material-symbols-outlined">delete</span> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    const addDoctorForm = document.getElementById('add-doctor-form');
    if (addDoctorForm) {
        addDoctorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('new-doctor-name').value.trim();
            const spec = document.getElementById('new-doctor-spec').value.trim();
            if (!name || !spec) return;

            const btn = document.getElementById('btn-add-doctor');
            btn.disabled = true;
            btn.textContent = 'Adding...';

            try {
                const response = await fetch(`${API_BASE}/doctors`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, specialization: spec })
                });
                if (response.ok) {
                    showToast('Doctor added successfully!');
                    addDoctorForm.reset();
                    fetchDoctors();
                } else {
                    showToast('Failed to add doctor.');
                }
            } catch (error) {
                console.error(error);
                showToast('Error adding doctor.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined">add</span> Add Doctor';
            }
        });
    }

    window._deleteDoctor = async function(id) {
        if (!confirm('Are you sure you want to delete this doctor?')) return;
        try {
            const response = await fetch(`${API_BASE}/doctors/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Doctor deleted successfully!');
                fetchDoctors();
            } else {
                showToast('Failed to delete doctor.');
            }
        } catch (error) {
            console.error(error);
            showToast('Error deleting doctor.');
        }
    };

    // --- Billing Logic ---
    function loadBilling() {
        const tbody = document.getElementById('billing-tbody');
        const searchInput = document.getElementById('billing-search');
        if (!tbody) return;

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        let pendingBills = patientsCache.filter(p => {
            const status = p.appointment?.paymentStatus || 'pending';
            return status === 'pending';
        });
        
        if (query) {
            pendingBills = pendingBills.filter(p => 
                (p.personal?.name || '').toLowerCase().includes(query)
            );
        }

        if (pendingBills.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="table-empty">
                            <span class="material-symbols-outlined">check_circle</span>
                            <p>No pending consultation bills.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = pendingBills.map(p => {
            const name = escapeHtml(p.personal?.name || 'Unknown');
            const doc = escapeHtml(formatDoctor(p.appointment?.doctor || 'Unknown'));
            const charges = parseFloat(p.appointment?.charges || 0).toFixed(2);
            const total = charges; // assuming tests are 0 for now
            
            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td>${doc}</td>
                    <td>Rs ${charges}</td>
                    <td>Rs 0.00</td>
                    <td><strong>Rs ${total}</strong></td>
                    <td><span class="badge badge-warning">Pending</span></td>
                    <td>
                        <button class="btn-primary" onclick="window._manageBilling('${p.id}')">
                            <span class="material-symbols-outlined">payments</span> Collect
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const billingSearch = document.getElementById('billing-search');
    const billingRefresh = document.getElementById('billing-refresh-btn');
    if (billingSearch) billingSearch.addEventListener('input', loadBilling);
    if (billingRefresh) billingRefresh.addEventListener('click', loadBilling);

    window._manageBilling = async function(id) {
        if (!confirm('Mark this consultation bill as paid?')) return;
        
        // Find patient and update paymentStatus
        const patient = patientsCache.find(p => p.id === id);
        if (!patient) return;

        patient.appointment.paymentStatus = 'paid';

        try {
            const response = await fetch(`${API_BASE}/patients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patient)
            });

            if (response.ok) {
                showToast('Payment collected successfully!');
                loadPatients(); 
                setTimeout(loadBilling, 500); 
            } else {
                showToast('Failed to collect payment.', true);
            }
        } catch (error) {
            console.error(error);
            showToast('Error collecting payment.', true);
        }
    };


    // --- Pharmacy Logic ---
    function loadPharmacy() {
        const tbody = document.getElementById('pharmacy-tbody');
        const searchInput = document.getElementById('pharmacy-search');
        if (!tbody) return;

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        let pharmPatients = patientsCache.filter(p => {
            const status = p.appointment?.pharmacyPaymentStatus || 'pending';
            return status === 'pending' && p.medical?.medicines && p.medical.medicines.trim() !== '';
        });
        
        if (query) {
            pharmPatients = pharmPatients.filter(p => 
                (p.personal?.name || '').toLowerCase().includes(query)
            );
        }

        if (pharmPatients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="table-empty">
                            <span class="material-symbols-outlined">check_circle</span>
                            <p>No pending pharmacy orders.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = pharmPatients.map(p => {
            const name = escapeHtml(p.personal?.name || 'Unknown');
            const doc = escapeHtml(formatDoctor(p.appointment?.doctor || 'Unknown'));
            const treatment = escapeHtml(p.medical?.description || 'None');
            const meds = escapeHtml(p.medical?.medicines || 'None');
            
            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td>${doc}</td>
                    <td>${treatment}</td>
                    <td><span class="badge ${meds === 'None' ? 'badge-grey' : 'badge-primary'}">${meds}</span></td>
                    <td><span class="badge badge-warning">Pending</span></td>
                    <td>
                        <button class="btn-primary" onclick="window._managePharmacyBill('${p.id}')">
                            <span class="material-symbols-outlined">receipt_long</span> Create Bill
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const pharmacySearch = document.getElementById('pharmacy-search');
    const pharmacyRefresh = document.getElementById('pharmacy-refresh-btn');
    if (pharmacySearch) pharmacySearch.addEventListener('input', loadPharmacy);
    if (pharmacyRefresh) pharmacyRefresh.addEventListener('click', loadPharmacy);

    let currentPharmacyPatientId = null;

    window._managePharmacyBill = function(id) {
        const patient = patientsCache.find(p => p.id === id);
        if (!patient) return;

        currentPharmacyPatientId = id;
        
        document.getElementById('pharm-patient-name').textContent = escapeHtml(patient.personal?.name || 'Unknown');
        document.getElementById('pharm-doctor-name').textContent = escapeHtml(formatDoctor(patient.appointment?.doctor));
        
        const tbody = document.getElementById('pharmacy-bill-tbody');
        tbody.innerHTML = '';
        
        if (patient.appointment?.pharmacyBill && patient.appointment.pharmacyBill.length > 0) {
            patient.appointment.pharmacyBill.forEach(med => addPharmacyRow(med.name, med.qty, med.rate));
        } else if (patient.medical?.medicines) {
            const meds = patient.medical.medicines.split(/[,;\n]+/).map(m => m.trim()).filter(m => m.length > 0);
            if (meds.length > 0) {
                meds.forEach(medName => addPharmacyRow(medName, 1, 0));
            } else {
                addPharmacyRow('', 1, 0);
            }
        } else {
            addPharmacyRow('', 1, 0); 
        }

        updatePharmacyGrandTotal();
        document.getElementById('pharmacy-modal').classList.add('active');
    };

    function addPharmacyRow(name = '', qty = 1, rate = 0) {
        const tbody = document.getElementById('pharmacy-bill-tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="medicine-row-input pharm-name" value="${escapeHtml(name)}" placeholder="Medicine Name"></td>
            <td><input type="number" class="medicine-row-input pharm-qty" value="${qty}" min="1" oninput="window._updatePharmRowTotal(this)"></td>
            <td><input type="number" class="medicine-row-input pharm-rate" value="${rate}" min="0" step="0.01" oninput="window._updatePharmRowTotal(this)"></td>
            <td class="row-total-display">Rs ${(qty * rate).toFixed(2)}</td>
            <td><button class="btn-delete-row" onclick="window._deletePharmRow(this)"><span class="material-symbols-outlined">delete</span></button></td>
        `;
        tbody.appendChild(tr);
    }

    window._updatePharmRowTotal = function(inputElem) {
        const tr = inputElem.closest('tr');
        const qty = parseFloat(tr.querySelector('.pharm-qty').value) || 0;
        const rate = parseFloat(tr.querySelector('.pharm-rate').value) || 0;
        const total = qty * rate;
        tr.querySelector('.row-total-display').textContent = `Rs ${total.toFixed(2)}`;
        updatePharmacyGrandTotal();
    };

    window._deletePharmRow = function(btn) {
        btn.closest('tr').remove();
        updatePharmacyGrandTotal();
    };

    function updatePharmacyGrandTotal() {
        let total = 0;
        const rows = document.querySelectorAll('#pharmacy-bill-tbody tr');
        rows.forEach(tr => {
            const qty = parseFloat(tr.querySelector('.pharm-qty').value) || 0;
            const rate = parseFloat(tr.querySelector('.pharm-rate').value) || 0;
            total += (qty * rate);
        });

        document.getElementById('pharm-grand-total').textContent = `Rs ${total.toFixed(2)}`;
    }

    document.getElementById('add-pharmacy-row-btn')?.addEventListener('click', () => {
        addPharmacyRow();
        updatePharmacyGrandTotal();
    });

    document.getElementById('pharmacy-close-btn')?.addEventListener('click', () => {
        document.getElementById('pharmacy-modal').classList.remove('active');
    });

    document.getElementById('pharmacy-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('pharmacy-modal').classList.remove('active');
    });

    document.getElementById('pharmacy-mark-paid-btn')?.addEventListener('click', async () => {
        if (!currentPharmacyPatientId) return;
        
        const patient = patientsCache.find(p => p.id === currentPharmacyPatientId);
        if (!patient) return;

        const pharmacyBill = [];
        document.querySelectorAll('#pharmacy-bill-tbody tr').forEach(tr => {
            const name = tr.querySelector('.pharm-name').value.trim();
            const qty = parseFloat(tr.querySelector('.pharm-qty').value) || 0;
            const rate = parseFloat(tr.querySelector('.pharm-rate').value) || 0;
            const total = qty * rate;
            if (name) {
                pharmacyBill.push({ name, qty, rate, total });
            }
        });

        patient.appointment.pharmacyBill = pharmacyBill;
        patient.appointment.pharmacyPaymentStatus = 'paid';

        try {
            const response = await fetch(`${API_BASE}/patients/${currentPharmacyPatientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patient)
            });

            if (response.ok) {
                showToast('Pharmacy bill saved and marked as paid!');
                if (typeof printPharmacyInvoice === 'function') {
                    printPharmacyInvoice(patient, pharmacyBill);
                }
                document.getElementById('pharmacy-modal').classList.remove('active');
                loadPatients(); 
                setTimeout(loadPharmacy, 500);
            } else {
                showToast('Failed to save pharmacy bill.', true);
            }
        } catch (error) {
            console.error(error);
            showToast('Error saving pharmacy bill.', true);
        }
    });

    // --- Test Chips Logic ---
    const testChips = document.querySelectorAll('.test-chip-btn');
    const patientTestsInput = document.getElementById('patient-tests');
    const chargesInput = document.getElementById('charges');

    testChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const isSelected = chip.classList.toggle('selected');
            const icon = chip.querySelector('.material-symbols-outlined');
            if (isSelected) {
                if (icon) icon.textContent = 'check';
                chip.style.backgroundColor = 'var(--primary)';
                chip.style.color = '#fff';
                chip.style.borderColor = 'var(--primary)';
            } else {
                if (icon) icon.textContent = 'add';
                chip.style.backgroundColor = '';
                chip.style.color = '';
                chip.style.borderColor = '';
            }

            // Update hidden input
            const selectedTests = Array.from(document.querySelectorAll('.test-chip-btn.selected'))
                .map(btn => btn.getAttribute('data-test'));
            if (patientTestsInput) {
                patientTestsInput.value = selectedTests.join(', ');
            }
        });
    });

    // --- Pharmacy Printing ---
    window.printPharmacyInvoice = function(patient, pharmacyBill) {
        if (!patient || !pharmacyBill) return;
        
        const printSection = document.getElementById('print-section');
        if (!printSection) return;
        
        const p = patient.personal || {};
        const a = patient.appointment || {};
        
        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        
        let totalAmount = 0;
        const rows = pharmacyBill.map((med, index) => {
            const rowTotal = med.qty * med.rate;
            totalAmount += rowTotal;
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(med.name)}</td>
                    <td>${med.qty}</td>
                    <td style="text-align: right;">Rs ${parseFloat(med.rate).toFixed(2)}</td>
                    <td style="text-align: right;">Rs ${parseFloat(rowTotal).toFixed(2)}</td>
                </tr>
            `;
        }).join('');
        
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
                    <h1>PHARMACY INVOICE</h1>
                    <p>Cash Receipt</p>
                </div>
            </div>
            
            <div class="print-metadata-grid">
                <div class="print-meta-block">
                    <h3>Patient Details</h3>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Patient Name:</span>
                        <span>${escapeHtml(p.name || '-')}</span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Age / Contact:</span>
                        <span>${p.age || '-'} / ${escapeHtml(p.contact || '-')}</span>
                    </div>
                </div>
                
                <div class="print-meta-block">
                    <h3>Invoice Details</h3>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Patient ID:</span>
                        <span><strong>${escapeHtml(patient.id || '-')}</strong></span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Date Generated:</span>
                        <span>${today}</span>
                    </div>
                    <div class="print-meta-row">
                        <span class="print-meta-label">Prescribing Doctor:</span>
                        <span>${escapeHtml(formatDoctor(a.doctor))}</span>
                    </div>
                </div>
            </div>
            
            <table class="print-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">S.N.</th>
                        <th style="width: 45%;">Medicine Name</th>
                        <th style="width: 15%;">Qty</th>
                        <th style="width: 15%; text-align: right;">Rate</th>
                        <th style="width: 15%; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                    <tr>
                        <td colspan="4" style="text-align: right; font-weight: bold;">Grand Total:</td>
                        <td style="text-align: right; font-weight: bold; font-size: 1.1em;">Rs ${parseFloat(totalAmount).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="print-footer">
                <div class="print-signature-space">
                    <div class="print-signature-line">Authorized Signatory</div>
                </div>
                <div class="print-signature-space">
                    <div class="print-signature-line">Dispensing Pharmacist</div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #7f8c8d;">
                This slip is generated electronically. Powered by OPD Connect.
            </div>
        `;
        
        window.print();
    };

    async function fetchAppointmentRequests() {
        const tbody = document.getElementById('requests-tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading requests...</td></tr>';
        
        try {
            const response = await fetch(`${API_BASE}/appointment-requests`);
            const data = await response.json();
            
            if (response.ok) {
                const requests = data.requests || [];
                if (requests.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No online requests currently.</td></tr>';
                    return;
                }
                
                let html = '';
                requests.forEach(r => {
                    // find doctor name to display
                    let doctorName = r.doctor;
                    const docObj = doctorsCache.find(d => d.id === r.doctor);
                    if (docObj) doctorName = docObj.name;

                    html += `
                        <tr>
                            <td><strong>${r.name}</strong></td>
                            <td>${r.phone}</td>
                            <td>${r.date}</td>
                            <td>${doctorName}</td>
                            <td>
                                <span class="status-badge status-pending" style="background: var(--warning); color: #856404; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">
                                    ${r.status}
                                </span>
                            </td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Failed to load requests.</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Connection error.</td></tr>';
        }
    }

});

