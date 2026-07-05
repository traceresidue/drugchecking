"""Build visualization-framework/data/aggregates.json from merged CSVs."""
from __future__ import annotations

import json
import math
import random
import re
from collections import Counter, defaultdict
from datetime import datetime

from .classify import classify
from .datasets import (
    load_analysis,
    load_chemdict_roles,
    load_lab_detail,
    load_unc_gcms,
    parse_stata_date,
)

random.seed(6580)


def _substance_counts(lab: list[dict[str, str]]) -> Counter[str]:
    by_sample: dict[str, set[str]] = defaultdict(set)
    primary: Counter[str] = Counter()
    trace: Counter[str] = Counter()
    for row in lab:
        substance = row['substance'].strip()
        key = substance.lower()
        if key in by_sample[row['sampleid']]:
            continue
        by_sample[row['sampleid']].add(key)
        if row.get('primary') == '1':
            primary[substance] += 1
        elif row.get('trace') == '1':
            trace[substance] += 1
        else:
            primary[substance] += 1
    return primary, trace, by_sample


def _expected_bucket(row: dict[str, str]) -> str:
    expected = (row.get('expectedsubstance') or '').lower()
    if re.search(r'oxycodone|percocet|roxicodone', expected) and row.get('expect_fentanyl') != '1':
        return 'oxycodone'
    if row.get('expect_fentanyl') == '1':
        return 'fentanyl'
    if re.search(r'ketamine|esketamine', expected):
        return 'ketamine'
    if row.get('expect_xylazine') == '1':
        return 'xylazine'
    if row.get('expect_meth') == '1':
        return 'methamphetamine'
    if row.get('expect_cocaine') == '1':
        return 'cocaine'
    if re.search(r'mdma|molly|ecstasy|ecstacy', expected):
        return 'mdma'
    if row.get('expect_hall') == '1':
        return 'mdma'
    if row.get('expect_benzo') == '1':
        return 'benzodiazepine'
    if row.get('expect_cannabis') == '1':
        return 'cannabis'
    if row.get('expect_opioid') == '1':
        return 'heroin/dope'
    return 'other'


def _detected_labels(row: dict[str, str]) -> list[str]:
    labels: list[str] = []
    if row.get('lab_fentanyl_any') == '1' or row.get('lab_opioid_any') == '1':
        labels.append('opioid (any)')
    if row.get('lab_fentanyl_any') == '1':
        labels.append('fentanyl')
    if row.get('lab_meth_any') == '1':
        labels.append('methamphetamine')
    if row.get('lab_cocaine_any') == '1':
        labels.append('cocaine')
    if row.get('lab_xylazine_any') == '1':
        labels.append('xylazine')
    if row.get('lab_ketamine_any') == '1':
        labels.append('ketamine')
    return labels


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2


def _classical_mds(dist: list[list[float]], dims: int = 2) -> list[list[float]]:
    n = len(dist)
    if n == 0:
        return []
    if n == 1:
        return [[0.0, 0.0]]

    d2 = [[d * d for d in row] for row in dist]
    row_means = [sum(row) / n for row in d2]
    grand = sum(row_means) / n
    b = [[-0.5 * (d2[i][j] - row_means[i] - row_means[j] + grand) for j in range(n)] for i in range(n)]

    def mat_vec(m: list[list[float]], v: list[float]) -> list[float]:
        return [sum(m[i][j] * v[j] for j in range(n)) for i in range(n)]

    def norm(v: list[float]) -> float:
        return math.sqrt(sum(x * x for x in v))

    coords = [[0.0] * dims for _ in range(n)]
    for dim in range(dims):
        vec = [random.random() - 0.5 for _ in range(n)]
        for _ in range(60):
            vec = mat_vec(b, vec)
            length = norm(vec) or 1.0
            vec = [x / length for x in vec]
        for i in range(n):
            coords[i][dim] = vec[i]
        if dim:
            for i in range(n):
                proj = sum(coords[i][k] * coords[j][k] for j in range(n) for k in range(dim)) / n
                coords[i][dim] -= proj

    max_abs = max(abs(x) for row in coords for x in row) or 1.0
    return [[round(x / max_abs, 3) for x in row] for row in coords]


def build_aggregates() -> dict:
    analysis = load_analysis()
    lab = load_lab_detail()
    gcms = load_unc_gcms()
    roles = load_chemdict_roles()

    analysis_by_id = {row['sampleid']: row for row in analysis}
    lab_by_sample: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in lab:
        lab_by_sample[row['sampleid']].append(row)

    primary, trace, by_sample = _substance_counts(lab)
    substances = set(primary) | set(trace)
    top = sorted(substances, key=lambda s: primary[s] + trace[s], reverse=True)[:40]
    top_substances = [{
        'substance': s,
        'samples': primary[s] + trace[s],
        'primary': primary[s],
        'trace': trace[s],
    } for s in top]

    monthly_counter: Counter[tuple[str, str]] = Counter()
    monthly_total: Counter[str] = Counter()
    monthly_class: Counter[tuple[str, str]] = Counter()
    for row in analysis:
        month = parse_stata_date(row.get('date_complete'))
        if not month:
            continue
        monthly_total[month] += 1
        seen_substances: set[str] = set()
        for det in lab_by_sample.get(row['sampleid'], []):
            substance = det['substance'].strip()
            key = substance.lower()
            if key in seen_substances:
                continue
            seen_substances.add(key)
            monthly_counter[(month, substance)] += 1
            monthly_class[(month, classify(substance)['cls'])] += 1

    co_counter: Counter[tuple[str, str]] = Counter()
    for sample_id, detections in lab_by_sample.items():
        names = sorted({d['substance'].strip().lower() for d in detections})
        for i, a in enumerate(names):
            for b in names[i + 1:]:
                co_counter[(a, b)] += 1
    cooccurrence = [{'a': a, 'b': b, 'n': n} for (a, b), n in co_counter.most_common(120)]

    expected_counts = Counter(_expected_bucket(row) for row in analysis)
    flow_counter: Counter[tuple[str, str]] = Counter()
    for row in analysis:
        expected = _expected_bucket(row)
        for detected in _detected_labels(row):
            flow_counter[(expected, detected)] += 1
    expected_detected = [{'expected': e, 'detected': d, 'n': n} for (e, d), n in flow_counter.most_common(60)]

    geo_counter: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: {'n': 0, 'fent': 0, 'xyl': 0})
    state_counts: Counter[str] = Counter()
    for row in analysis:
        state = (row.get('state') or '').strip()
        if not state:
            continue
        state_counts[state] += 1
        county = (row.get('county') or row.get('state_county') or '').split('|')[-1].strip()
        if not county:
            county = 'Unknown'
        key = (state, county)
        geo_counter[key]['n'] += 1
        if row.get('lab_fentanyl_any') == '1':
            geo_counter[key]['fent'] += 1
        if row.get('lab_xylazine_any') == '1':
            geo_counter[key]['xyl'] += 1
    geo = [{'state': s, 'county': c, **vals} for (s, c), vals in sorted(geo_counter.items(), key=lambda x: -x[1]['n'])]

    rt_values: dict[str, list[float]] = defaultdict(list)
    for (sample_id, substance), rt in gcms.items():
        rt_values[substance.lower()].append(rt)
    retention_times = [{
        'substance': substance,
        'rt': round(_median(values), 2),
        'n': len(values),
    } for substance, values in sorted(rt_values.items(), key=lambda x: -len(x[1]))[:60]]

    substances_per_sample = Counter()
    for row in analysis:
        count = row.get('lab_num_substances_any') or '0'
        try:
            substances_per_sample[int(count)] += 1
        except ValueError:
            continue

    xylazine_status: Counter[tuple[str, str]] = Counter()
    for row in analysis:
        if row.get('lab_xylazine_any') != '1':
            continue
        month = parse_stata_date(row.get('date_complete'))
        if not month:
            continue
        primary_flag = '1' if row.get('lab_xylazine') == '1' else '0'
        xylazine_status[(month, primary_flag)] += 1

    first_seen: dict[str, str] = {}
    substance_totals: Counter[str] = Counter()
    for row in lab:
        substance = row['substance'].strip()
        month = parse_stata_date(row.get('date_complete'))
        if not month:
            continue
        substance_totals[substance] += 1
        if substance not in first_seen or month < first_seen[substance]:
            first_seen[substance] = month

    first_detections = [{
        'substance': substance,
        'first': first_seen[substance],
        'total': substance_totals[substance],
    } for substance in sorted(first_seen, key=lambda s: first_seen[s])][:300]

    emergence = [{
        'substance': substance,
        'first': first_seen[substance],
        'cls': classify(substance)['cls'],
        'total': substance_totals[substance],
    } for substance in sorted(first_seen, key=lambda s: first_seen[s])]

    fent_colors: Counter[str] = Counter()
    for row in analysis:
        if row.get('lab_fentanyl_any') != '1':
            continue
        color = (row.get('color') or 'unknown').strip().lower() or 'unknown'
        fent_colors[color] += 1

    top_names = [entry['substance'] for entry in top_substances]
    top_lower = [name.lower() for name in top_names]
    n_top = len(top_lower)

    presence = [{sid for sid, names in by_sample.items() if top_lower[i] in names} for i in range(n_top)]
    dist = [[0.0 if i == j else 1.0 - (
        len(presence[i] & presence[j]) / len(presence[i] | presence[j]) if presence[i] | presence[j] else 0
    ) for j in range(n_top)] for i in range(n_top)]
    coords = _classical_mds(dist, 2)
    embedding = [{
        'substance': top_names[i],
        'x': coords[i][0],
        'y': coords[i][1],
        'cls': classify(top_names[i])['cls'],
        'n': top_substances[i]['samples'],
    } for i in range(n_top)]

    embed_map = {name.lower(): (coords[i][0], coords[i][1]) for i, name in enumerate(top_names)}
    space_candidates: list[dict] = []
    for row in analysis:
        month = parse_stata_date(row.get('date_complete'))
        if not month:
            continue
        names = by_sample.get(row['sampleid'], set())
        if not names:
            continue
        xs, ys, classes = [], [], []
        for name in names:
            point = embed_map.get(name.lower())
            if not point:
                continue
            xs.append(point[0])
            ys.append(point[1])
            classes.append(classify(name)['cls'])
        if not xs:
            continue
        dominant = Counter(classes).most_common(1)[0][0]
        space_candidates.append({
            'x': round(sum(xs) / len(xs), 3),
            'y': round(sum(ys) / len(ys), 3),
            'm': month,
            'c': dominant,
        })
    random.shuffle(space_candidates)
    space_points = space_candidates[:1600]

    return {
        'top_substances': top_substances,
        'monthly': [{'month': m, 'substance': s, 'n': n} for (m, s), n in sorted(monthly_counter.items())],
        'monthly_total': [{'month': m, 'n': n} for m, n in sorted(monthly_total.items())],
        'cooccurrence': cooccurrence,
        'expected_detected': expected_detected,
        'expected_counts': dict(expected_counts),
        'geo': geo,
        'state_counts': dict(state_counts),
        'retention_times': retention_times,
        'substances_per_sample': {str(k): v for k, v in sorted(substances_per_sample.items())},
        'xylazine_status': [{'month': m, 'primary': p, 'n': n} for (m, p), n in sorted(xylazine_status.items())],
        'first_detections': first_detections,
        'roles': {name: roles.get(name.lower(), 'other') for name in top_names},
        'fent_colors': dict(fent_colors.most_common(12)),
        'monthly_class': [{'month': m, 'cls': c, 'n': n} for (m, c), n in sorted(monthly_class.items())],
        'embedding': embedding,
        'space_points': space_points,
        'emergence': emergence,
    }
