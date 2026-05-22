#!/usr/bin/env python3
"""Generate official-rules.pdf from rules.html article content."""
import re
from html.parser import HTMLParser
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "rules-source.html"
PDF_PATH = ROOT / "official-rules.pdf"


class RulesExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_article = False
        self.depth = 0
        self.blocks = []
        self._buf = []
        self._tag = None
        self._list_type = None
        self._ol_index = 0

    def handle_starttag(self, tag, attrs):
        if tag == "article" and dict(attrs).get("class", "").find("rules-doc") >= 0:
            self.in_article = True
        if not self.in_article:
            return
        if tag in ("h1", "h2", "h3"):
            self._flush()
            self._tag = tag
        elif tag == "p":
            self._flush()
            self._tag = "p"
        elif tag == "li":
            self._flush()
            self._tag = "li"
        elif tag == "tr":
            self._flush()
            self._tag = "tr"
        elif tag == "th":
            self._tag = "th"
            self._buf = []
        elif tag == "td":
            self._tag = "td"
            self._buf = []
        elif tag == "ol":
            self._list_type = "ol"
            self._ol_index = 0
        elif tag == "ul":
            self._list_type = "ul"

    def handle_endtag(self, tag):
        if tag == "article" and self.in_article:
            self._flush()
            self.in_article = False
        if not self.in_article:
            return
        if tag in ("h1", "h2", "h3", "p", "li", "tr"):
            self._flush()
            self._tag = None
        elif tag in ("th", "td"):
            text = "".join(self._buf).strip()
            if text:
                self.blocks.append((self._tag, text))
            self._tag = None
            self._buf = []
        elif tag == "ol":
            self._list_type = None
        elif tag == "ul":
            self._list_type = None

    def handle_data(self, data):
        if self.in_article and self._tag:
            self._buf.append(data)

    def _flush(self):
        if not self._buf or not self._tag:
            return
        text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
        self._buf = []
        if not text:
            return
        if self._tag == "li" and self._list_type == "ol":
            self._ol_index += 1
            text = f"{self._ol_index}. {text}"
        elif self._tag == "li":
            text = f"• {text}"
        elif self._tag == "tr":
            return
        self.blocks.append((self._tag, text))


def clean(text: str) -> str:
    text = (
        text.replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2026", "...")
        .replace("\u00a0", " ")
        .replace("\u00d7", "x")
        .replace("\u00b7", "-")
        .replace("\u2264", "<=")
        .replace("\u2265", ">=")
        .replace("\u00ae", "(R)")
        .replace("\u2122", "(TM)")
        .replace("\u00b0", " degrees")
        .replace("\u2032", "'")
        .replace("\u2033", '"')
        .replace("\u00a9", "(c)")
        .replace("\u00b1", "+/-")
        .replace("\u00e9", "e")
        .replace("\u00e8", "e")
        .replace("\u00e0", "a")
        .replace("\u00f4", "o")
        .replace("\u00e2", "a")
        .replace("\u00ee", "i")
        .replace("\u00fb", "u")
        .replace("\u00e7", "c")
        .replace("\u00e1", "a")
        .replace("\u00ed", "i")
        .replace("\u00f3", "o")
        .replace("\u00fa", "u")
        .replace("\u00f1", "n")
        .replace("\u00c9", "E")
        .replace("\u00c0", "A")
        .replace("\u00c7", "C")
        .replace("\u00c2", "A")
        .replace("\u00ca", "E")
        .replace("\u00d4", "O")
        .replace("\u00db", "U")
        .replace("\u00cd", "I")
        .replace("\u00d3", "O")
        .replace("\u00da", "U")
        .replace("\u00d1", "N")
        .replace("\u00c8", "E")
        .replace("\u00c9", "E")
        .replace("\u00c0", "A")
        .replace("\u00c7", "C")
        .replace("\u00c2", "A")
        .replace("\u00ca", "E")
        .replace("\u00d4", "O")
        .replace("\u00db", "U")
        .replace("\u00cd", "I")
        .replace("\u00d3", "O")
        .replace("\u00da", "U")
        .replace("\u00d1", "N")
        .replace("\u00c8", "E")
        .replace("\u00c9", "E")
        .replace("\u00c0", "A")
        .replace("\u00c7", "C")
        .replace("\u00c2", "A")
        .replace("\u00ca", "E")
        .replace("\u00d4", "O")
        .replace("\u00db", "U")
        .replace("\u00cd", "I")
        .replace("\u00d3", "O")
        .replace("\u00da", "U")
        .replace("\u00d1", "N")
        .replace("\u00c8", "E")
        .replace("\u00c9", "E")
        .replace("\u00c0", "A")
        .replace("\u00c7", "C")
        .replace("\u00c2", "A")
        .replace("\u00ca", "E")
        .replace("\u00d4", "O")
        .replace("\u00db", "U")
        .replace("\u00cd", "I")
        .replace("\u00d3", "O")
        .replace("\u00da", "U")
        .replace("\u00d1", "N")
        .replace("\u00c8", "E")
    )
    return text.encode("latin-1", "replace").decode("latin-1")


def write_mc(pdf, h, text):
    if not text:
        return
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, h, text)


def build_pdf(blocks):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 18, 18)
    pdf._pending_th = ""

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_font("Helvetica", "B", 11)
    write_mc(
        pdf,
        6,
        clean(
            "NO PURCHASE NECESSARY TO ENTER OR WIN. A PURCHASE WILL NOT INCREASE YOUR "
            "CHANCES OF WINNING. Open to eligible legal residents of the 47 participating "
            "U.S. states listed below, who are 18 years of age or older (or the age of majority "
            "in their state of residence). VOID IN NEW YORK, FLORIDA, AND RHODE ISLAND and "
            "where prohibited by law."
        ),
    )
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9)
    write_mc(
        pdf,
        5,
        clean("Free entry: Gaviom Sweepstakes - Free Entry, PO Box 4218, Wilmington, DE 19801"),
    )
    pdf.ln(6)

    for kind, text in blocks:
        text = clean(text)
        if kind == "h1":
            pdf.ln(4)
            pdf.set_font("Helvetica", "B", 16)
            write_mc(pdf, 8, text)
            pdf.ln(2)
        elif kind == "h2":
            pdf.ln(5)
            pdf.set_font("Helvetica", "B", 12)
            write_mc(pdf, 6, text)
            pdf.ln(1)
        elif kind == "h3":
            pdf.ln(3)
            pdf.set_font("Helvetica", "B", 10)
            write_mc(pdf, 5, text)
        elif kind == "th":
            pdf._pending_th = text
        elif kind == "td":
            label = pdf._pending_th
            pdf.set_font("Helvetica", "", 9)
            line = f"{label}: {text}" if label else text
            write_mc(pdf, 5, line)
            pdf._pending_th = ""
            pdf.ln(1)
        elif kind == "li":
            pdf.set_font("Helvetica", "", 9)
            write_mc(pdf, 5, text)
        else:
            pdf.set_font("Helvetica", "", 9)
            write_mc(pdf, 5, text)
            pdf.ln(1)

    pdf.set_font("Helvetica", "I", 8)
    pdf.ln(6)
    write_mc(
        pdf,
        4,
        clean("(c) 2026 Gaviom Inc. Last updated May 21, 2026. gaviom.com/rules"),
    )
    pdf.output(str(PDF_PATH))


def main():
    html = HTML_PATH.read_text(encoding="utf-8")
    parser = RulesExtractor()
    parser.feed(html)
    # Prepend npn if article missing header
    blocks = parser.blocks
    if not blocks:
        raise SystemExit("No content extracted from rules.html")
    build_pdf(blocks)
    print(f"Wrote {PDF_PATH} ({PDF_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
