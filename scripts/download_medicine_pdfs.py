# pdf 다운로드 및 저장

import csv
import re
import urllib.request
from pathlib import Path


CSV_PATH = Path("data/sample_medicine_pdf_links.csv")
PDF_DIR = Path("data/raw/medicine_pdfs")

DOCUMENT_COLUMNS = {
    "efficacy_document_id": "efficacy",
    "precaution_document_id": "precaution",
    "usage_document_id": "usage",
}


def safe_filename(text: str) -> str:
    text = re.sub(r'[\\/:*?"<>|]', "_", text)
    text = re.sub(r"\s+", "_", text)
    return text[:80]


def download_pdf(url: str, save_path: Path) -> None:
    save_path.parent.mkdir(parents=True, exist_ok=True)

    if save_path.exists():
        print(f"이미 있음: {save_path}")
        return

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
    )

    with urllib.request.urlopen(request) as response:
        data = response.read()

    save_path.write_bytes(data)
    print(f"다운로드 완료: {save_path}")


def main():
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            item_seq = row["item_seq"]
            item_name = row["item_name"]

            folder_name = safe_filename(f"{item_seq}_{item_name}")
            medicine_dir = PDF_DIR / folder_name

            for column_name, document_type in DOCUMENT_COLUMNS.items():
                url = row[column_name]

                if not url:
                    continue

                save_path = medicine_dir / f"{document_type}.pdf"
                download_pdf(url, save_path)


if __name__ == "__main__":
    main()