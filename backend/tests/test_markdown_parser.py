import pytest
from services.markdown_parser import (
    parse_frontmatter,
    parse_headings,
    parse_wikilinks,
    parse_inline_tags,
    compute_file_identity,
    parse_obsidian_file,
    ParsedMarkdown,
    Frontmatter,
    iter_markdown_files,
)
from pathlib import Path
import tempfile
import os


SAMPLE_MD = """---
title: Market Entry Strategy
tags:
  - market-entry
  - china
aliases:
  - market entry
  - china market
---

# Market Entry Strategy

This document covers [[China Regulations]] and [[APAC Overview|Asia Pacific]].

Key tags: #market-entry #compliance

## Section One

See [[Legal/Foreign Investment#Restrictions]] for details.

Also relevant: #risk-assessment
"""


class TestFrontmatter:
    def test_title(self):
        fm, _ = parse_frontmatter(SAMPLE_MD)
        assert fm.title == "Market Entry Strategy"

    def test_tags(self):
        fm, _ = parse_frontmatter(SAMPLE_MD)
        assert fm.tags == ["market-entry", "china"]

    def test_aliases(self):
        fm, _ = parse_frontmatter(SAMPLE_MD)
        assert fm.aliases == ["market entry", "china market"]

    def test_no_frontmatter(self):
        fm, body = parse_frontmatter("# Just a heading")
        assert fm.title is None
        assert fm.tags == []
        assert body == "# Just a heading"


class TestHeadings:
    def test_levels(self):
        headings = parse_headings(SAMPLE_MD)
        assert len(headings) == 2
        assert headings[0].level == 1
        assert headings[1].level == 2

    def test_empty(self):
        assert parse_headings("no headings here") == []


class TestWikilinks:
    def test_simple_link(self):
        links = parse_wikilinks("[[Simple]]")
        assert len(links) == 1
        assert links[0].target == "Simple"
        assert links[0].alias is None

    def test_alias_link(self):
        links = parse_wikilinks("[[Target|Display]]")
        assert links[0].target == "Target"
        assert links[0].alias == "Display"

    def test_heading_anchor(self):
        links = parse_wikilinks("[[Folder/Note#Section]]")
        assert links[0].target == "Folder/Note"
        assert links[0].heading == "Section"

    def test_multiple_links(self):
        links = parse_wikilinks("[[A]] and [[B|C]] and [[D#E|F]]")
        assert len(links) == 3


class TestInlineTags:
    def test_tags(self):
        tags = parse_inline_tags("#tag1 some text #tag2")
        assert [t.name for t in tags] == ["tag1", "tag2"]

    def test_skips_code_spans(self):
        tags = parse_inline_tags("real #tag but `#not-a-tag`")
        assert [t.name for t in tags] == ["tag"]

    def test_no_tags(self):
        assert parse_inline_tags("plain text") == []


class TestFileIdentity:
    def test_stable_key(self):
        key, chash = compute_file_identity("notes/test.md", "hello")
        assert key.startswith("notes/test.md@")
        assert len(key.split("@")[1]) == 16
        assert len(chash) == 64

    def test_different_content_different_hash(self):
        _, h1 = compute_file_identity("a.md", "a")
        _, h2 = compute_file_identity("a.md", "b")
        assert h1 != h2


class TestParseObsidianFile:
    def test_full_parse(self, tmp_path):
        vault = tmp_path / "vault"
        vault.mkdir()
        note = vault / "test.md"
        note.write_text(SAMPLE_MD, encoding="utf-8")

        result = parse_obsidian_file(str(note), str(vault))

        assert isinstance(result, ParsedMarkdown)
        assert result.title == "Market Entry Strategy"
        assert result.relative_path == "test.md"
        assert len(result.headings) == 2
        assert len(result.wikilinks) == 3
        assert len(result.tags) == 3  # market-entry, compliance, risk-assessment
        assert len(result.all_tags) == 4  # + china from frontmatter
        assert result.stable_key.startswith("test.md@")

    def test_relative_path_preserves_structure(self, tmp_path):
        vault = tmp_path / "vault"
        nested = vault / "sub" / "deep"
        nested.mkdir(parents=True)
        note = nested / "note.md"
        note.write_text("# Deep Note", encoding="utf-8")

        result = parse_obsidian_file(str(note), str(vault))
        assert result.relative_path == "sub/deep/note.md"


class TestIterMarkdownFiles:
    def test_finds_md_files(self, tmp_path):
        vault = tmp_path / "vault"
        vault.mkdir()
        (vault / "a.md").write_text("a")
        (vault / "b.md").write_text("b")
        (vault / "readme.txt").write_text("not md")
        sub = vault / "sub"
        sub.mkdir()
        (sub / "c.md").write_text("c")

        files = iter_markdown_files(str(vault))
        paths = [str(Path(f).relative_to(vault)) for f in files]
        assert paths == ["a.md", "b.md", "sub/c.md"]

    def test_skips_obsidian_dir(self, tmp_path):
        vault = tmp_path / "vault"
        vault.mkdir()
        (vault / "keep.md").write_text("keep")
        obs = vault / ".obsidian"
        obs.mkdir()
        (obs / "config.md").write_text("config")

        files = iter_markdown_files(str(vault))
        assert len(files) == 1
        assert files[0].name == "keep.md"

    def test_skips_hidden_dirs(self, tmp_path):
        vault = tmp_path / "vault"
        vault.mkdir()
        hidden = vault / ".hidden"
        hidden.mkdir()
        (hidden / "secret.md").write_text("secret")
        (vault / "public.md").write_text("public")

        files = iter_markdown_files(str(vault))
        assert len(files) == 1
        assert files[0].name == "public.md"

    def test_skips_git_and_trash(self, tmp_path):
        vault = tmp_path / "vault"
        vault.mkdir()
        for d in [".git", ".trash", "node_modules"]:
            skip = vault / d
            skip.mkdir()
            (skip / "x.md").write_text("x")
        (vault / "real.md").write_text("real")

        files = iter_markdown_files(str(vault))
        assert len(files) == 1
        assert files[0].name == "real.md"

    def test_rejects_non_directory(self):
        with pytest.raises(ValueError, match="Not a directory"):
            iter_markdown_files("/nonexistent/path/vault")
