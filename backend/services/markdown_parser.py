"""
Obsidian-compatible Markdown parser.

Parses frontmatter, wikilinks, tags, headings, and computes stable file identity.
This is a new Knowledge Layer boundary — it does not replace services/parser.py.
"""
import hashlib
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Matches YAML frontmatter delimited by --- at the very start of the file.
_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

# Matches ATX headings: optional leading whitespace, 1-6 #, space, text.
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

# Matches [[wikilinks]] with optional alias and heading anchor.
#   [[Note]]  [[Note|Alias]]  [[Folder/Note#Heading]]  [[Note#Section|Alias]]
_WIKILINK_RE = re.compile(
    r"\[\[(?P<target>[^\]|#]+?)(?:#(?P<heading>[^\]|]+))?(?:\|(?P<alias>[^\]]+))?\]\]"
)

# Matches inline #tags that are NOT inside code spans or URLs.
# A tag starts with #, followed by letters/digits/hyphens/underscores/slashes.
_TAG_RE = re.compile(r"(?<!\w)#([a-zA-Z一-鿿][\w\-/]*)")

# Directories that should always be skipped during vault traversal.
_SKIP_DIRS = {".obsidian", ".git", ".trash", "node_modules", "__pycache__", ".DS_Store"}


@dataclass
class Frontmatter:
    raw: dict = field(default_factory=dict)

    @property
    def tags(self) -> list[str]:
        val = self.raw.get("tags")
        if val is None:
            return []
        if isinstance(val, list):
            return [str(t).strip() for t in val if str(t).strip()]
        return [str(val).strip()]

    @property
    def aliases(self) -> list[str]:
        val = self.raw.get("aliases")
        if val is None and "alias" in self.raw:
            val = self.raw["alias"]
        if val is None:
            return []
        if isinstance(val, list):
            return [str(a).strip() for a in val if str(a).strip()]
        return [str(val).strip()]

    @property
    def title(self) -> Optional[str]:
        return self.raw.get("title")


@dataclass
class Heading:
    level: int
    text: str
    line: int


@dataclass
class Wikilink:
    raw: str
    target: str
    alias: Optional[str]
    heading: Optional[str]
    line: int


@dataclass
class ParsedTag:
    name: str
    line: int


@dataclass
class ParsedMarkdown:
    relative_path: str
    stable_key: str
    content_hash: str
    frontmatter: Frontmatter
    headings: list[Heading] = field(default_factory=list)
    wikilinks: list[Wikilink] = field(default_factory=list)
    tags: list[ParsedTag] = field(default_factory=list)
    body_text: str = ""
    title: Optional[str] = None

    @property
    def all_tags(self) -> list[str]:
        """Deduplicated union of frontmatter tags and inline #tags."""
        seen = set()
        result = []
        for t in self.frontmatter.tags:
            if t not in seen:
                seen.add(t)
                result.append(t)
        for t in self.tags:
            name = t.name.lstrip("#")
            if name not in seen:
                seen.add(name)
                result.append(name)
        return result


# --- public API ---


def parse_frontmatter(text: str) -> tuple[Frontmatter, str]:
    """Extract YAML frontmatter. Returns (Frontmatter, body_text)."""
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return Frontmatter(), text

    import yaml

    try:
        raw = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as exc:
        logger.warning("Failed to parse frontmatter: %s", exc)
        raw = {}

    if not isinstance(raw, dict):
        raw = {}

    body = text[m.end():]
    return Frontmatter(raw=raw), body


def parse_headings(text: str) -> list[Heading]:
    """Extract ATX headings with level, text, and 1-based line number."""
    results = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        m = _HEADING_RE.match(line)
        if m:
            results.append(Heading(
                level=len(m.group(1)),
                text=m.group(2).strip(),
                line=line_no,
            ))
    return results


def parse_wikilinks(text: str) -> list[Wikilink]:
    """Extract Obsidian [[wikilinks]] with target, alias, heading anchor."""
    results = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        for m in _WIKILINK_RE.finditer(line):
            results.append(Wikilink(
                raw=m.group(0),
                target=m.group("target").strip(),
                alias=m.group("alias").strip() if m.group("alias") else None,
                heading=m.group("heading").strip() if m.group("heading") else None,
                line=line_no,
            ))
    return results


def parse_inline_tags(text: str) -> list[ParsedTag]:
    """Extract inline #tags (not inside code spans)."""
    results = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        # Strip inline code spans so we don't match tags inside backticks.
        cleaned = re.sub(r"`[^`]*`", "", line)
        for m in _TAG_RE.finditer(cleaned):
            results.append(ParsedTag(name=m.group(1), line=line_no))
    return results


def compute_file_identity(relative_path: str, content: str) -> tuple[str, str]:
    """Return (stable_key, content_hash) for idempotent imports."""
    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    stable_key = f"{relative_path}@{content_hash[:16]}"
    return stable_key, content_hash


def get_title(fm: Frontmatter, headings: list[Heading], relative_path: str) -> str:
    """Determine the best title: frontmatter title > first H1 > filename stem."""
    if fm.title:
        return str(fm.title)
    for h in headings:
        if h.level == 1:
            return h.text
    return Path(relative_path).stem


def parse_obsidian_file(file_path: str, vault_root: str) -> ParsedMarkdown:
    """Parse a single Obsidian Markdown file within a vault.

    Args:
        file_path: Absolute path to the .md file.
        vault_root: Absolute path to the vault root directory.

    Returns:
        ParsedMarkdown with all extracted elements.
    """
    path = Path(file_path)
    vault = Path(vault_root)
    relative_path = str(path.relative_to(vault))

    content = path.read_text(encoding="utf-8")

    stable_key, content_hash = compute_file_identity(relative_path, content)

    fm, body = parse_frontmatter(content)
    headings = parse_headings(body)
    wikilinks = parse_wikilinks(body)
    tags = parse_inline_tags(body)
    title = get_title(fm, headings, relative_path)

    return ParsedMarkdown(
        relative_path=relative_path,
        stable_key=stable_key,
        content_hash=content_hash,
        frontmatter=fm,
        headings=headings,
        wikilinks=wikilinks,
        tags=tags,
        body_text=body.strip(),
        title=title,
    )


def iter_markdown_files(vault_root: str) -> list[Path]:
    """Walk a vault directory and return .md files, skipping hidden/system dirs."""
    root = Path(vault_root)
    if not root.is_dir():
        raise ValueError(f"Not a directory: {vault_root}")

    files = []
    for entry in root.rglob("*.md"):
        # Skip if any parent directory is hidden or a skip dir.
        parts = set(entry.relative_to(root).parts[:-1])
        if parts & _SKIP_DIRS:
            continue
        # Also skip if the first char of any dir is a dot (hidden).
        if any(p.startswith(".") for p in entry.relative_to(root).parts[:-1]):
            continue
        files.append(entry)

    files.sort()
    return files
