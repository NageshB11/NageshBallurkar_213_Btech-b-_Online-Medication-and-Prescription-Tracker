
import os
import re

file_path = r'c:\Users\ANSAF\Music\Project 1\frontend\src\app\components\patient-dashboard\patient-dashboard.component.css'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace glass-header padding
# Search for .glass-header block and its padding
glass_header_pattern = re.compile(r'(\.glass-header\s*\{[^}]*?padding:\s*)1rem\s+2rem(;)', re.DOTALL)
content = glass_header_pattern.sub(r'\10.75rem 1.5rem\2', content)

# Replace page-content padding
page_content_pattern = re.compile(r'(\.page-content\s*\{[^}]*?padding:\s*)1.75rem\s+2rem(;)', re.DOTALL)
content = page_content_pattern.sub(r'\11.25rem 1.5rem\2', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
