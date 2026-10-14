"""Pick 40 diverse viz-cohort samples from merged CSVs (excluding demo rows)."""
from __future__ import annotations

from collections import defaultdict

from .classify import classify
from .datasets import demo_sample_ids, load_analysis, load_lab_detail, load_unc_gcms

COHORT_SIZE = 40


def _dominant_class(sample_id: str, detections_by_sample: dict[str, list[dict[str, str]]]) -> str:
    primary = [d for d in detections_by_sample.get(sample_id, []) if d.get('primary') == '1']
    if not primary:
        return 'other'
    ranked = sorted(primary, key=lambda d: classify(d['substance'])['cls'])
    return classify(ranked[0]['substance'])['cls']


def select_viz_cohort_ids() -> list[str]:
    analysis = load_analysis()
    lab = load_lab_detail()
    gcms = load_unc_gcms()
    demo = demo_sample_ids()

    detections_by_sample: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in lab:
        detections_by_sample[row['sampleid']].append(row)

    buckets: dict[tuple[str, str], list[str]] = defaultdict(list)
    for row in analysis:
        sample_id = row['sampleid']
        if sample_id in demo:
            continue
        detections = detections_by_sample.get(sample_id, [])
        if not detections:
            continue
        if not any((sample_id, d['substance'].lower()) in gcms for d in detections):
            continue
        state = (row.get('state') or '??').strip()
        cls = _dominant_class(sample_id, detections_by_sample)
        buckets[(state, cls)].append(sample_id)

    for key in buckets:
        buckets[key].sort()

    chosen: list[str] = []
    seen: set[str] = set()
    keys = sorted(buckets.keys())
    while len(chosen) < COHORT_SIZE and keys:
        progressed = False
        for key in list(keys):
            if len(chosen) >= COHORT_SIZE:
                break
            bucket = buckets[key]
            while bucket and bucket[0] in seen:
                bucket.pop(0)
            if not bucket:
                keys.remove(key)
                continue
            sample_id = bucket.pop(0)
            seen.add(sample_id)
            chosen.append(sample_id)
            progressed = True
        if not progressed:
            break

    if len(chosen) < COHORT_SIZE:
        for row in sorted(analysis, key=lambda r: r['sampleid']):
            sample_id = row['sampleid']
            if sample_id in demo or sample_id in seen:
                continue
            if sample_id not in detections_by_sample:
                continue
            chosen.append(sample_id)
            seen.add(sample_id)
            if len(chosen) >= COHORT_SIZE:
                break

    return chosen[:COHORT_SIZE]
