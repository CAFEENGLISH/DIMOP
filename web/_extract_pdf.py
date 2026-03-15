import pdfplumber, sys, json
pdf = pdfplumber.open(sys.argv[1])
pages = []
for p in pdf.pages:
    t = p.extract_text()
    if t:
        pages.append(t)
print(json.dumps("\n\n".join(pages)))
