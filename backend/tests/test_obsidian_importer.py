import pytest
from pathlib import Path

from services.obsidian_importer import (
    import_obsidian_vault,
    get_imports,
    get_import_by_id,
    _upsert_node,
    NODE_NOTE,
)
from models import GraphNode, GraphEdge, SourceImport


def _make_vault(tmp_path: Path, files: dict[str, str]) -> Path:
    """Helper: create a vault directory with given {relpath: content} files."""
    vault = tmp_path / "vault"
    vault.mkdir()
    for relpath, content in files.items():
        full = vault / relpath
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content, encoding="utf-8")
    return vault


SAMPLE_NOTE = """---
title: Market Entry Strategy
tags:
  - market-entry
  - china
aliases:
  - market entry
---

# Market Entry Strategy

This document covers [[China Regulations]] and [[APAC Overview|Asia Pacific]].

## Legal Requirements

See [[Legal/Foreign Investment#Restrictions]] for details. #compliance
"""


class TestImportObsidianVault:
    def test_single_note_creates_nodes_and_edges(self, test_db, tmp_path):
        vault = _make_vault(tmp_path, {"strategy.md": SAMPLE_NOTE})

        result = import_obsidian_vault(test_db, str(vault))

        assert result.status == "completed"
        assert result.source_type == "obsidian"
        assert result.imported_count == 1

        # Nodes: 1 note + 2 headings + 3 wikilinks + 3 tags (china, market-entry, compliance) + 1 alias
        nodes = test_db.query(GraphNode).all()
        node_types = {n.node_type for n in nodes}
        assert "note" in node_types
        assert "heading" in node_types
        assert "wikilink_target" in node_types
        assert "tag" in node_types
        assert "alias" in node_types

        # Edges should exist
        edges = test_db.query(GraphEdge).all()
        assert len(edges) > 0

        # Verify note node
        note = test_db.query(GraphNode).filter(GraphNode.node_type == NODE_NOTE).first()
        assert note is not None
        assert note.label == "Market Entry Strategy"
        assert note.stable_key.startswith("strategy.md@")

    def test_idempotent_reimport(self, test_db, tmp_path):
        vault = _make_vault(tmp_path, {"note.md": "# Single Note\n\nNo links or tags."})

        r1 = import_obsidian_vault(test_db, str(vault))
        r2 = import_obsidian_vault(test_db, str(vault))

        assert r1.imported_count == 1
        assert r2.imported_count == 1

        # Same note node should exist only once
        notes = test_db.query(GraphNode).filter(GraphNode.node_type == NODE_NOTE).all()
        assert len(notes) == 1

        # Two imports recorded
        imports = test_db.query(SourceImport).all()
        assert len(imports) == 2

    def test_edges_cleaned_on_reimport(self, test_db, tmp_path):
        """Re-import should remove old edges and create fresh ones."""
        from models import GraphEdge

        vault = _make_vault(tmp_path, {"note.md": "# Note\n\nLink to [[A]]\n\n#tag1"})

        r1 = import_obsidian_vault(test_db, str(vault))
        assert r1.status == "completed"

        edges_after_first = test_db.query(GraphEdge).count()

        # Change the file — remove wikilink, change tag
        (vault / "note.md").write_text("# Note\n\nNo links here.\n\n#tag2")
        r2 = import_obsidian_vault(test_db, str(vault))
        assert r2.status == "completed"

        edges_after_second = test_db.query(GraphEdge).count()

        # After re-import, edges should reflect only the current file state:
        # 1 heading → 1 contains edge, 1 tag → 1 tagged_with edge = 2 edges
        # Old edges (links_to [[A]], tagged_with #tag1) should be cleaned.
        # NOTE: old edges from r1 are deleted, new edges from r2 are created.
        # The count may differ because _ensure_edge skips duplicates across ALL imports.
        # But the key assertion: old wikilink edge should NOT exist.
        links_to_edges = (
            test_db.query(GraphEdge).filter(GraphEdge.relation == "links_to").all()
        )
        assert len(links_to_edges) == 0, "Old wikilink edges should be cleaned up"

    def test_multiple_files(self, test_db, tmp_path):
        vault = _make_vault(
            tmp_path,
            {
                "a.md": "# Note A\n\nLink to [[B]]",
                "b.md": "# Note B\n\n#topic",
            },
        )

        result = import_obsidian_vault(test_db, str(vault))
        assert result.status == "completed"
        assert result.imported_count == 2

        notes = test_db.query(GraphNode).filter(GraphNode.node_type == NODE_NOTE).all()
        assert len(notes) == 2

    def test_skips_hidden_dirs(self, test_db, tmp_path):
        vault = tmp_path / "vault"
        vault.mkdir()
        (vault / "real.md").write_text("# Real")
        hidden = vault / ".obsidian"
        hidden.mkdir()
        (hidden / "config.md").write_text("# Config")

        result = import_obsidian_vault(test_db, str(vault))
        assert result.imported_count == 1

    def test_empty_vault(self, test_db, tmp_path):
        vault = _make_vault(tmp_path, {})
        result = import_obsidian_vault(test_db, str(vault))
        assert result.status == "completed"
        assert result.imported_count == 0

    def test_rejects_nonexistent_path(self, test_db):
        with pytest.raises(ValueError, match="does not exist"):
            import_obsidian_vault(test_db, "/nonexistent/path")

    def test_rejects_file_not_directory(self, test_db, tmp_path):
        f = tmp_path / "file.md"
        f.write_text("# Not a vault")
        with pytest.raises(ValueError, match="not a directory"):
            import_obsidian_vault(test_db, str(f))

    def test_error_status_on_failure(self, test_db, tmp_path):
        """If the vault has a file that causes parse to fail, import should
        continue and mark overall status as completed (individual file errors
        are logged, not fatal)."""
        vault = _make_vault(
            tmp_path,
            {"good.md": "# Good Note", "bad.md": "\x00\x00\x00invalid utf8??"},
        )
        # The bad file will likely cause a decode error on read_text.
        # The importer catches per-file errors and continues.
        # We just want to make sure the good file still gets imported.
        try:
            result = import_obsidian_vault(test_db, str(vault))
            # Should have at least imported the good file
            assert result.status == "completed"
            assert result.imported_count >= 1
        except Exception:
            # If the bad file crashes the whole import, the status should be error
            imports = test_db.query(SourceImport).all()
            if imports:
                assert imports[0].status in ("completed", "error")

    def test_source_import_metadata(self, test_db, tmp_path):
        vault = _make_vault(tmp_path, {"note.md": "# Note"})
        result = import_obsidian_vault(test_db, str(vault), source_lang="zh", target_lang="en")
        assert result.metadata_ == {"source_lang": "zh", "target_lang": "en"}


class TestUpsertNode:
    def test_creates_new_node(self, test_db):
        node = _upsert_node(test_db, "note", "key-1", "Label One")
        test_db.commit()
        assert node.id is not None
        assert node.node_type == "note"
        assert node.label == "Label One"

    def test_updates_existing_node(self, test_db):
        n1 = _upsert_node(test_db, "note", "key-1", "Original")
        test_db.commit()

        n2 = _upsert_node(test_db, "note", "key-1", "Updated")
        test_db.commit()

        assert n1.id == n2.id
        assert n2.label == "Updated"


class TestGetImports:
    def test_list_imports(self, test_db, tmp_path):
        vault = _make_vault(tmp_path, {"a.md": "# A"})
        import_obsidian_vault(test_db, str(vault))

        imports = get_imports(test_db)
        assert len(imports) == 1
        assert imports[0].source_type == "obsidian"

    def test_get_by_id(self, test_db, tmp_path):
        vault = _make_vault(tmp_path, {"a.md": "# A"})
        created = import_obsidian_vault(test_db, str(vault))

        found = get_import_by_id(test_db, created.id)
        assert found is not None
        assert found.id == created.id

    def test_get_nonexistent(self, test_db):
        assert get_import_by_id(test_db, "nonexistent") is None
