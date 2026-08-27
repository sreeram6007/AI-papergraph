import fitz  # PyMuPDF
import docx
import io

async def parse_file(file):
    if file.filename.endswith(".pdf"):
        return parse_pdf(await file.read())
    elif file.filename.endswith(".docx"):
        return parse_docx(await file.read())
    elif file.filename.endswith(".txt"):
        return (await file.read()).decode("utf-8")
    else:
        return "Unsupported file type"

def parse_pdf(data):
    text = ""
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text

def parse_docx(data):
    text = ""
    doc = docx.Document(io.BytesIO(data))
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text
