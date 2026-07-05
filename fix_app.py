import os

with open('d:\\Developing\\OPD\\app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

good_lines = lines[:1316]

pharmacy_js = '''
    // --- Pharmacy Logic ---
    function loadPharmacy() {
        const pharmacyTbody = document.getElementById('pharmacy-tbody');
        const searchInput = document.getElementById('pharmacy-search');
        if (!pharmacyTbody) return;

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        let pharmPatients = patientsCache.filter(p => {
            const status = p.appointment?.pharmacyPaymentStatus || 'pending';
            return status === 'pending';
        });
        
        if (query) {
            pharmPatients = pharmPatients.filter(p => {
                const nameMatch = (p.personal?.name || '').toLowerCase().includes(query);
                return nameMatch;
            });
        }

        if (pharmPatients.length === 0) {
            pharmacyTbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="table-empty">
                            <span class="material-symbols-outlined">check_circle</span>
                            <p>No pending pharmacy bills.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        pharmacyTbody.innerHTML = pharmPatients.map(p => {
            const name = escapeHtml(p.personal?.name || 'Unknown');
            const doc = escapeHtml(formatDoctor(p.appointment?.doctor || 'Unknown'));
            const meds = escapeHtml(p.medical?.medicines || 'None');
            
            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td>${doc}</td>
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
        } else {
            addPharmacyRow('', 1, 0); // Default empty row
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

        // Gather medicines
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
            const response = await fetch(`http://localhost:8000/api/patients/${currentPharmacyPatientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patient)
            });

            if (response.ok) {
                showToast('Pharmacy bill saved and marked as paid!');
                document.getElementById('pharmacy-modal').classList.remove('active');
                loadPharmacy();
                loadPatients(); // update directory stats
            } else {
                showToast('Failed to save pharmacy bill.');
            }
        } catch (error) {
            console.error('Update error:', error);
            showToast('Network error.');
        }
    });
'''

with open('d:\\Developing\\OPD\\app.js', 'w', encoding='utf-8') as f:
    f.writelines(good_lines)
    f.write(pharmacy_js)
