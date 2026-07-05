with open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # skip duplicate declarations
    if i > 0 and 'const tabSettings =' in line and 'const tabSettings =' in lines[i-1]:
        continue
    if i > 0 and 'const sectionSettings =' in line and 'const sectionSettings =' in lines[i-1]:
        continue
    if i > 0 and 'if (tabSettings) {' in line and 'if (tabSettings) {' in lines[i-1]:
        continue
    if i > 0 and 'tabSettings.addEventListener(' in line and 'tabSettings.addEventListener(' in lines[i-1]:
        continue
    if i > 0 and 'switchTab(\'settings\');' in line and 'switchTab(\'settings\');' in lines[i-1]:
        continue
    if i > 0 and 'fetchDoctors();' in line and 'fetchDoctors();' in lines[i-1]:
        continue
    if i > 0 and 'if(tabSettings) tabSettings.style.display = \'none\';' in line and 'if(tabSettings) tabSettings.style.display = \'none\';' in lines[i-1]:
        continue
    
    new_lines.append(line)

js = "".join(new_lines)

if 'fetchDoctors(); // Load' not in js and 'fetchDoctors();' not in js.split("const isAuthenticated = localStorage.getItem('opd_auth') === 'true';")[1][:100]:
    js = js.replace("const isAuthenticated = localStorage.getItem('opd_auth') === 'true';", "const isAuthenticated = localStorage.getItem('opd_auth') === 'true';\n    fetchDoctors();")

if not js.strip().endswith('});'):
    js = js.strip() + "\n});\n"

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
