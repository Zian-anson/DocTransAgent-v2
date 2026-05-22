"""
Seed script: upload 3 demo documents, translate, index them.
Run: python scripts/seed_demo_data.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from database import SessionLocal, engine
from models import Base, Document, DocStatus, UsageLog
from services.parser import parse_document
from services.translator import translator
from services.embedder import embed_document
from services.retriever import index_chunks
from services.glossary_service import add_glossary_entry
from config import get_settings

settings = get_settings()

# Demo glossary terms
DEMO_GLOSSARY = [
    ("智能屏 X1 Pro", "SmartScreen X1 Pro", "产品名称"),
    ("麒麟 9000S", "Kirin 9000S", "芯片"),
    ("无界沟通", "Connect Beyond Boundaries", "品牌口号"),
    ("星云图形", "Nebula Graphic", "品牌"),
    ("数据保护影响评估", "Data Protection Impact Assessment (DPIA)", "合规"),
    ("标准合同条款", "Standard Contractual Clauses (SCC)", "合规"),
    ("通用数据保护条例", "General Data Protection Regulation (GDPR)", "合规"),
]

DEMO_DOCS = [
    ("product_manual_zh.md", "md"),
    ("brand_guide_zh.md", "md"),
    ("compliance_zh.md", "md"),
]


async def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("=" * 50)
    print("DocTransAgent — Demo Data Seed")
    print("=" * 50)

    # 1. Create glossary
    print("\n[1/4] Creating glossary entries...")
    for src, tgt, cat in DEMO_GLOSSARY:
        try:
            add_glossary_entry(db, src, tgt, category=cat)
            print(f"  + {src} → {tgt}")
        except Exception as e:
            db.rollback()
            print(f"  ! {src}: {e}")

    # 2. Upload & parse documents
    print("\n[2/4] Parsing demo documents...")
    docs = []
    for filename, ftype in DEMO_DOCS:
        filepath = os.path.join(settings.upload_dir, filename)
        # Copy test doc to uploads if not there
        src_path = os.path.join(os.path.dirname(__file__), "..", "backend", "test_docs", filename)
        os.makedirs(settings.upload_dir, exist_ok=True)
        if not os.path.exists(filepath):
            import shutil

            shutil.copy(src_path, filepath)

        doc = Document(
            filename=filename,
            original_filename=filename,
            file_type=ftype,
            source_lang="zh",
            target_lang="en",
            status=DocStatus.UPLOADED,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        print(f"  + {filename} [{doc.id}]")

        # Parse
        parsed = await parse_document(filepath, ftype)
        doc.sections = parsed["sections"]
        doc.word_count = parsed["word_count"]
        doc.parsed_content = parsed["full_text"]
        doc.status = DocStatus.PARSED
        db.commit()
        print(f"    → {parsed['word_count']} words, {parsed['section_count']} sections")
        docs.append(doc)

    # 3. Translate
    print("\n[3/4] Translating documents via GMI Cloud...")
    glossary = {src: tgt for src, tgt, _ in DEMO_GLOSSARY}
    for doc in docs:
        print(f"  Translating: {doc.original_filename}...")
        doc.status = DocStatus.TRANSLATING
        db.commit()
        try:
            result = await translator.translate_document(
                doc.id, doc.sections, doc.source_lang, doc.target_lang, glossary
            )
            doc.translated_sections = result["translated_sections"]
            doc.translated_content = "\n\n".join(
                s["content"] for s in result["translated_sections"]
            )
            doc.chunk_count = result["total_chunks"]
            doc.status = DocStatus.TRANSLATED
            db.commit()
            print(f"    → {result['total_chunks']} chunks, {result['tokens_input']} tokens in")
        except Exception as e:
            print(f"    ! Translation failed: {e}")
            doc.status = DocStatus.ERROR
            doc.error_message = str(e)
            db.commit()
            return

    # 4. Index
    print("\n[4/4] Indexing documents into knowledge base...")
    for doc in docs:
        if doc.status != DocStatus.TRANSLATED:
            print(f"  Skipping {doc.original_filename} (not translated)")
            continue
        print(f"  Indexing: {doc.original_filename}...")
        doc.status = DocStatus.INDEXING
        db.commit()
        try:
            text = doc.translated_content or doc.parsed_content
            chunks = await embed_document(text, {
                "doc_id": doc.id,
                "title": doc.original_filename,
                "source_lang": doc.source_lang,
                "target_lang": doc.target_lang,
                "lang": doc.target_lang,
            })
            count = await index_chunks(chunks)
            doc.chunk_count = count
            doc.status = DocStatus.INDEXED
            db.commit()
            print(f"    → {count} chunks indexed")
        except Exception as e:
            print(f"    ! Indexing failed: {e}")
            doc.status = DocStatus.ERROR
            doc.error_message = str(e)
            db.commit()

    print("\n" + "=" * 50)
    print("Seed complete!")
    print(f"  Documents: {len(docs)}")
    print(f"  Glossary terms: {len(DEMO_GLOSSARY)}")
    print("  Run: cd backend && uvicorn app:app --reload")
    print("=" * 50)
    db.close()


if __name__ == "__main__":
    asyncio.run(seed())
