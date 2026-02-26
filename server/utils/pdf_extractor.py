"""
pdf_extractor.py
----------------
Extracts plain text from PDF binary content using pypdf.

The extracted text is then fed directly into the TokenTrim compression
pipeline, giving meaningful token counts and compression ratios instead
of the ~0% compression that results from trying to compress raw binary.
"""

from __future__ import annotations

import io


def extract_pdf_text(content: bytes) -> str:
    """
    Extract all text from a PDF given its raw bytes.

    Returns the concatenated text of every page, separated by newlines.
    If extraction fails (encrypted / malformed PDF), raises ValueError
    with a human-readable reason so the endpoint can return a 422.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        raise RuntimeError(
            "pypdf is not installed. Run: pip install pypdf"
        )

    try:
        reader = PdfReader(io.BytesIO(content))
    except Exception as exc:
        raise ValueError(f"Could not open PDF: {exc}") from exc

    if reader.is_encrypted:
        try:
            reader.decrypt("")          # try empty password
        except Exception:
            pass
        # Check if still encrypted after decrypt attempt
        try:
            reader.pages[0].extract_text()
        except Exception:
            raise ValueError(
                "PDF is password-protected. Please provide an unencrypted PDF."
            )

    pages: list[str] = []
    for i, page in enumerate(reader.pages):
        try:
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages.append(f"[Page {i + 1}]\n{page_text.strip()}")
        except Exception:
            # Skip unreadable pages (e.g. image-only pages)
            continue

    if not pages:
        raise ValueError(
            "No extractable text found in the PDF. "
            "The PDF may consist entirely of scanned images (no OCR text layer)."
        )

    return "\n\n".join(pages)


def is_pdf(filename: str, content: bytes) -> bool:
    """
    Return True if the file is a PDF based on extension OR magic bytes.
    Checking both avoids issues with misnamed files.
    """
    name_lower = (filename or "").lower()
    if name_lower.endswith(".pdf"):
        return True
    # PDF magic bytes: %PDF-
    return content[:5] == b"%PDF-"
