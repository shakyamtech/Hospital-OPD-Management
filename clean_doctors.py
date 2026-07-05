import re

doctor_logic = """
    // --- Doctor Management Logic ---
    async function fetchDoctors() {
        try {
            const response = await fetch(`${API_BASE}/doctors`);
            if (response.ok) {
                const data = await response.json();
                populateDoctorDropdowns(data.doctors);
                renderDoctorSettings(data.doctors);
            }
        } catch (error) {
            console.error('Failed to fetch doctors', error);
        }
    }

    function populateDoctorDropdowns(doctors) {
        const loginDoc = document.getElementById('login-doctor');
        const regDoc = document.getElementById('doctor');
        const filterDoc = document.getElementById('filter-doctor');

        let loginHtml = '';
        let regHtml = '<option value="" disabled selected>Select Doctor</option>';
        let filterHtml = '<option value="">All Doctors</option>';

        doctors.forEach(d => {
            const val = d.id;
            const text = `${d.name} (${d.specialization})`;
            const opt = `<option value="${val}">${text}</option>`;
            loginHtml += opt;
            regHtml += opt;
            filterHtml += opt;
        });

        if (loginDoc) loginDoc.innerHTML = loginHtml;
        if (regDoc) regDoc.innerHTML = regHtml;
        if (filterDoc) filterDoc.innerHTML = filterHtml;
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
"""

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

if 'fetchDoctors();' not in js:
    # Add fetchDoctors() initialization
    js = js.replace("const isAuthenticated = localStorage.getItem('opd_auth') === 'true';", "const isAuthenticated = localStorage.getItem('opd_auth') === 'true';\n    fetchDoctors();")

if 'async function fetchDoctors' not in js:
    # Inject doctor logic before the closing brace
    parts = js.rsplit('});', 1)
    if len(parts) == 2:
        js = parts[0] + doctor_logic + "\n});" + parts[1]

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
