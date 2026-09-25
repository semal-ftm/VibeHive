"""
Vibe analytics: the logic behind Vibe Match and the Vibe Calendar.

Vibe Match
    Each member gets a "vibe vector": how many posts they shared with each
    vibe. Two members are compared with cosine similarity, which looks at the
    *shape* of their moods rather than how much they post, so someone with
    5 posts can still be a 90% match with someone who has 50.

Vibe Calendar
    Posts are grouped by day. Each day is coloured by its dominant vibe and
    shaded by how many posts were shared.
"""

import math
from collections import Counter, defaultdict
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from .models import Post

MIN_VIBE_POSTS = 2  # posts with a vibe needed before a match is shown

MATCH_LABELS = [
    (85, "Vibe twins", "💞"),
    (70, "Same wavelength", "🌊"),
    (50, "Good vibes together", "✨"),
    (30, "Complementary vibes", "🌗"),
    (0, "Opposite energies", "🧲"),
]


# ---------------------------------------------------------------------------
# Vibe Match
# ---------------------------------------------------------------------------
def vibe_vectors(user_ids):
    """{user_id: Counter({'hyped': 4, 'chill': 2})} in a single query."""
    vectors = defaultdict(Counter)
    rows = (
        Post.objects.filter(author_id__in=user_ids)
        .exclude(vibe="")
        .values("author_id", "vibe")
        .annotate(n=Count("id"))
    )
    for row in rows:
        vectors[row["author_id"]][row["vibe"]] = row["n"]
    return vectors


def cosine(a, b):
    keys = set(a) | set(b)
    dot = sum(a[k] * b[k] for k in keys)
    norm = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return dot / norm if norm else 0.0


def match_label(score):
    for threshold, label, emoji in MATCH_LABELS:
        if score >= threshold:
            return label, emoji
    return MATCH_LABELS[-1][1:]


def shares(vector):
    """Vibe → fraction of the member's vibe posts, most used first."""
    total = sum(vector.values())
    return [(key, count / total) for key, count in vector.most_common()] if total else []


def shared_vibes(a, b, limit=3):
    """Vibes both members use, ranked by how much they have in common."""
    ta, tb = sum(a.values()) or 1, sum(b.values()) or 1
    common = [(k, min(a[k] / ta, b[k] / tb)) for k in set(a) & set(b)]
    common.sort(key=lambda item: item[1], reverse=True)
    return [key for key, _ in common[:limit]]


def compare(a, b):
    """Full comparison of two vibe vectors (see VibeMatchView)."""
    enough = sum(a.values()) >= MIN_VIBE_POSTS and sum(b.values()) >= MIN_VIBE_POSTS
    if not enough:
        return {"score": None, "label": None, "emoji": None, "shared": []}
    score = round(cosine(a, b) * 100)
    label, emoji = match_label(score)
    return {"score": score, "label": label, "emoji": emoji, "shared": shared_vibes(a, b)}


# ---------------------------------------------------------------------------
# Vibe Calendar
# ---------------------------------------------------------------------------
def local_date(dt, tz_offset_minutes):
    """Convert a UTC datetime to the viewer's calendar date."""
    return (dt - timedelta(minutes=tz_offset_minutes)).date()


def vibe_calendar(user, weeks=26, tz_offset_minutes=0):
    """
    Activity for the last `weeks` weeks, aligned so the grid starts on a Sunday.
    `tz_offset_minutes` matches JavaScript's Date.getTimezoneOffset().
    """
    today = local_date(timezone.now(), tz_offset_minutes)
    # Python: Monday=0 … Sunday=6  →  days since the last Sunday
    start = today - timedelta(days=(today.weekday() + 1) % 7 + (weeks - 1) * 7)

    since = timezone.now() - timedelta(days=(today - start).days + 2)
    days = defaultdict(Counter)
    totals = Counter()
    for created_at, vibe in Post.objects.filter(author=user, created_at__gte=since).values_list("created_at", "vibe"):
        day = local_date(created_at, tz_offset_minutes)
        if start <= day <= today:
            days[day][vibe or "none"] += 1
            totals[day] += 1

    cells = []
    for day in sorted(days):
        counts = days[day]
        vibed = Counter({k: v for k, v in counts.items() if k != "none"})
        cells.append({
            "date": day.isoformat(),
            "count": totals[day],
            "vibe": vibed.most_common(1)[0][0] if vibed else None,
            "vibes": dict(vibed),
        })

    return {
        "start": start.isoformat(),
        "end": today.isoformat(),
        "days": cells,
        "summary": calendar_summary(days, totals, today),
    }


def calendar_summary(days, totals, today):
    vibe_totals = Counter()
    for counts in days.values():
        vibe_totals.update({k: v for k, v in counts.items() if k != "none"})

    active = sorted(days)
    longest = current = 0
    run, previous = 0, None
    for day in active:
        run = run + 1 if previous and (day - previous).days == 1 else 1
        longest = max(longest, run)
        previous = day
    # Current streak: consecutive active days ending today (or yesterday)
    if active and (today - active[-1]).days <= 1:
        current, cursor = 0, active[-1]
        active_set = set(active)
        while cursor in active_set:
            current += 1
            cursor -= timedelta(days=1)

    last_30 = Counter()
    for day, counts in days.items():
        if (today - day).days < 30:
            last_30.update({k: v for k, v in counts.items() if k != "none"})

    return {
        "active_days": len(active),
        "total_posts": sum(totals.values()),
        "top_vibe": vibe_totals.most_common(1)[0][0] if vibe_totals else None,
        "month_vibe": last_30.most_common(1)[0][0] if last_30 else None,
        "vibe_totals": dict(vibe_totals.most_common()),
        "current_streak": current,
        "longest_streak": longest,
    }
