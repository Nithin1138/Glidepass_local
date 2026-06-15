import re

with open("website-v2/src/app/admin/page.tsx", "r") as f:
    content = f.read()

# Extract Feature Gate Limits Switches block
start_idx = content.find("                        {/* Feature Gate Limits Switches */}")
if start_idx == -1:
    print("Could not find Feature Gate")
    exit(1)

# Find end of Feature Gate Limits Switches block
end_idx = content.find("                        </div>\n                      </div>\n                    </motion.div>\n                  )}", start_idx)
if end_idx == -1:
    print("Could not find end of Feature Gate")
    exit(1)

feature_gate_block = content[start_idx:end_idx]

# Remove it from the current position
new_content = content[:start_idx] + content[end_idx:]

# Insert it before Matrix Control for Plans
matrix_start_idx = new_content.find("                        {/* Matrix Control for Plans */}")
if matrix_start_idx == -1:
    print("Could not find Matrix Control")
    exit(1)

new_content = new_content[:matrix_start_idx] + feature_gate_block + "\n" + new_content[matrix_start_idx:]

# Update the Matrix div to have col-span-1 lg:col-span-2
matrix_div_str = '<div className="rounded-[28px] border relative overflow-hidden mt-6"'
new_matrix_div_str = '<div className="col-span-1 lg:col-span-2 rounded-[28px] border relative overflow-hidden mt-6"'
new_content = new_content.replace(matrix_div_str, new_matrix_div_str)

with open("website-v2/src/app/admin/page.tsx", "w") as f:
    f.write(new_content)

print("Done")
