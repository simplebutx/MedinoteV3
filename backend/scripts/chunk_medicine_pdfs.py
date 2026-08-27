# PDF 로딩 -> 청킹

import json
import re
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


PDF_DIR = Path("data/raw/medicine_pdfs")
OUTPUT_PATH = Path("data/processed/medicine_chunks.jsonl")

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
MAX_SECTION_CHARS = 1500
SOURCE_NAME = "의약품안전나라"
SOURCE_URL = "https://nedrug.mfds.go.kr"

# 문서 이름에서 약id와 약이름 분리
def parse_medicine_folder(folder_name: str) -> tuple[str, str]:
    match = re.match(r"^(\d+)_(.+)$", folder_name)

    if not match:
        return "", folder_name

    return match.group(1), match.group(2)


# 본문 텍스트 전처리
def clean_text_keep_lines(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

# 전처리 + 줄바꿈 + 공백제거
def normalize_text_for_storage(text: str) -> str:
    text = clean_text_keep_lines(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

# precaution -> 대제목 기준으로 자르기
def split_precaution_sections(text: str) -> list[tuple[str, str]]:
    # 1. 형식
    dot_heading_pattern = re.compile(
        r"(?m)^\s*(\d{1,2})\.\s*(.{2,100})\s*$"
    )

    # 1) 형식
    paren_heading_pattern = re.compile(
        r"(?m)^\s*(\d{1,2}\))\s*(.{4,100})\s*$"
    )

    heading_pattern = dot_heading_pattern

    if not dot_heading_pattern.search(text):
        heading_pattern = paren_heading_pattern

    # 형식에 맞는 부분들을 찾아서 보관
    matches = list(heading_pattern.finditer(text))

    if not matches:
        return [("사용상의 주의사항", text)]

    sections = []

    # 잘라서 섹션 리스트에 넣기
    for index, match in enumerate(matches):
        section_start = match.start()
        section_end = (
            matches[index + 1].start()
            if index + 1 < len(matches)
            else len(text)
        )

        section_title = normalize_text_for_storage(match.group(2))
        section_text = text[section_start:section_end].strip()

        sections.append((section_title, section_text))

    return sections

# 긴 section만 다시 쪼개기
def split_long_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    return splitter.split_text(text)

# 청킹
def chunk_pdf(pdf_path: Path) -> list[dict]:
    # 문서 이름에서 약id와 약이름 분리
    medicine_id, medicine_name = parse_medicine_folder(pdf_path.parent.name)

    # 파일이름에서 확장자 제거 -> usage/efficacy/precaution
    document_type = pdf_path.stem

    loader = PyPDFLoader(str(pdf_path))
    # PDF 파일을 읽어서 Langchain 문서 객체 리스트로 변환
    pages = loader.load()

    full_text = "\n".join(page.page_content for page in pages)
    full_text = clean_text_keep_lines(full_text)

    # 결과물
    records = []

    # precaution 아닐때
    if document_type != "precaution":
        texts = [full_text]

        if len(normalize_text_for_storage(full_text)) > MAX_SECTION_CHARS:
            texts = split_long_text(full_text)

        for chunk_index, text in enumerate(texts):
            records.append(
                {
                    "medicine_id": medicine_id,
                    "medicine_name": medicine_name,
                    "document_type": document_type,
                    "section_title": document_type,
                    "source_path": str(pdf_path),
                    "source_name": SOURCE_NAME,
                    "source_url": SOURCE_URL,
                    "page": None,
                    "chunk_index": chunk_index,
                    "text": normalize_text_for_storage(text),
                }
            )

        return records

    # precaution 일때
    sections = split_precaution_sections(full_text)
    chunk_index = 0

    for section_title, section_text in sections:
        section_text = clean_text_keep_lines(section_text)

        if len(normalize_text_for_storage(section_text)) > MAX_SECTION_CHARS:
            split_texts = split_long_text(section_text)
        else:
            split_texts = [section_text]

        for split_index, split_text in enumerate(split_texts):
            text = normalize_text_for_storage(split_text)

            if not text:
                continue

            records.append(
                {
                    "medicine_id": medicine_id,
                    "medicine_name": medicine_name,
                    "document_type": document_type,
                    "section_title": section_title,
                    "source_path": str(pdf_path),
                    "source_name": SOURCE_NAME,
                    "source_url": SOURCE_URL,
                    "page": None,
                    "chunk_index": chunk_index,
                    "section_chunk_index": split_index,
                    "text": text,
                }
            )

            chunk_index += 1

    return records

def main() -> None:
    # 폴더 생성
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 경로 정렬
    pdf_paths = sorted(PDF_DIR.glob("*/*.pdf"))

    total_chunks = 0

    # 결과 파일 하나씩 열어서 
    with OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
        for pdf_path in pdf_paths:
            try:
                # 청킹
                records = chunk_pdf(pdf_path)

                # jsonl 파일로 저장
                for record in records:
                    output_file.write(
                        json.dumps(record, ensure_ascii=False) + "\n"
                    )

                total_chunks += len(records)
                print(f"청킹 완료: {pdf_path} ({len(records)} chunks)")
            except Exception as error:
                print(f"청킹 실패: {pdf_path} - {error}")

    print(f"전체 청킹 완료: {total_chunks} chunks")
    print(f"저장 위치: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
