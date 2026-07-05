with open(r"d:\Developing\OPD\app.js", "r", encoding="utf-8") as f:
    js = f.read()

# Add global doctors cache
js = js.replace("let patientsCache = [];", "let patientsCache = [];\n    let doctorsCache = [];")

# Update fetchDoctors to set cache
js = js.replace("populateDoctorDropdowns(data.doctors);", "doctorsCache = data.doctors;\n                populateDoctorDropdowns(data.doctors);")

# Update formatDoctor
new_format = """
    function formatDoctor(value) {
        if (!value) return '—';
        const doc = doctorsCache.find(d => d.id === value);
        if (doc) {
            return `Dr. ${doc.name} (${doc.specialization})`;
        }
        
        // Fallback for older hardcoded data
        const map = {
            'dr-smith': 'Dr. Smith (Cardiology)',
            'dr-jane': 'Dr. Jane (General)',
            'dr-patel': 'Dr. Patel (Orthopedics)',
        };
        return map[value] || value;
    }
"""

import re
js = re.sub(r"function formatDoctor\(value\) {[\s\S]*?return map\[value\] || value || '—';\s*}", new_format.strip(), js)

with open(r"d:\Developing\OPD\app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Fixed")
