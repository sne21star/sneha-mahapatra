#!/usr/bin/env python3
"""Fetch Goodreads shelves via RSS and write _data/books.yml.
Re-run any time to refresh the bookshelf. Goodreads has no public API, but the
per-shelf RSS feed is public and stable."""
import re, sys, urllib.request, html, datetime, io

USER = "179146826"  # Sneha's Goodreads user id
SHELVES = ["read", "currently-reading"]

def fetch(shelf):
    url = f"https://www.goodreads.com/review/list_rss/{USER}?shelf={shelf}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode("utf-8", "replace")

def tag(item, name):
    # handles both <tag><![CDATA[..]]></tag> and <tag>..</tag>
    m = re.search(rf"<{name}>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{name}>", item, re.S)
    return m.group(1).strip() if m else ""

def big_cover(url):
    # upgrade Goodreads thumbnail size codes to a larger portrait
    url = re.sub(r"\._S[XY]\d+_(SY\d+_)?", "._SY475_", url)
    return url

def clean(text, limit=None):
    text = re.sub(r"<[^>]+>", "", text)          # strip html tags
    text = html.unescape(text).replace("\r", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if limit and len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0] + "\u2026"
    return text

def yaml_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

def read_year(item):
    ra = tag(item, "user_read_at")
    m = re.search(r"(\d{4})", ra)
    return m.group(1) if m else ""

def parse(xml, shelf):
    books = []
    for item in re.findall(r"<item>(.*?)</item>", xml, re.S):
        book_id = tag(item, "book_id")
        cover = big_cover(tag(item, "book_large_image_url") or tag(item, "book_medium_image_url"))
        books.append({
            "id": book_id,
            "title": clean(tag(item, "title")),
            "author": clean(tag(item, "author_name")),
            "cover": cover,
            "link": f"https://www.goodreads.com/book/show/{book_id}",
            "rating": tag(item, "user_rating") or "0",
            "avg": tag(item, "average_rating"),
            "year": tag(item, "book_published"),
            "read_year": read_year(item),
            "review": clean(tag(item, "user_review")),
            "desc": clean(tag(item, "book_description"), 480),
            "shelf": shelf,
        })
    return books

def main():
    out = io.StringIO()
    out.write("# Auto-generated from Goodreads RSS by scripts/fetch_books.py -- do not edit by hand.\n")
    out.write(f"# Last refreshed: {datetime.date.today().isoformat()}\n")
    for shelf in SHELVES:
        xml = fetch(shelf)
        books = parse(xml, shelf)
        key = shelf.replace("-", "_")
        out.write(f"{key}:\n")
        if not books:
            out.write("  []\n")
        for b in books:
            out.write(f"  - id: {yaml_str(b['id'])}\n")
            out.write(f"    title: {yaml_str(b['title'])}\n")
            out.write(f"    author: {yaml_str(b['author'])}\n")
            out.write(f"    cover: {yaml_str(b['cover'])}\n")
            out.write(f"    link: {yaml_str(b['link'])}\n")
            out.write(f"    rating: {b['rating']}\n")
            out.write(f"    avg: {yaml_str(b['avg'])}\n")
            out.write(f"    year: {yaml_str(b['year'])}\n")
            out.write(f"    read_year: {yaml_str(b['read_year'])}\n")
            out.write(f"    review: {yaml_str(b['review'])}\n")
            out.write(f"    desc: {yaml_str(b['desc'])}\n")
        sys.stderr.write(f"{shelf}: {len(books)} books\n")
    with open("_data/books.yml", "w", encoding="utf-8") as f:
        f.write(out.getvalue())
    sys.stderr.write("wrote _data/books.yml\n")

if __name__ == "__main__":
    main()
