"""Python mirror of visualization-framework classify() rules."""
from __future__ import annotations

import re

CLASS_LABEL = {
    'fent': 'Fentanyl & analogs',
    'opioid': 'Opioid',
    'xyl': 'Sedative / xylazine',
    'stim': 'Stimulant',
    'coke': 'Cocaine',
    'benzo': 'Benzodiazepine',
    'cut': 'Cut / diluent',
    'other': 'Other',
}

FAMILY_MAP = {
    'fent': 'opioid', 'opioid': 'opioid',
    'stim': 'stim', 'coke': 'stim',
    'xyl': 'xyl', 'benzo': 'benzo', 'cut': 'cut', 'other': 'other',
}

RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'fentanyl|anpp|despropionyl|norfentanyl|acetylfentanyl|n-phenylpropanamide|phenethyl', re.I), 'fent'),
    (re.compile(r'nitazene|etonitazene|metonitazene|protonitazene|isotonitazene', re.I), 'fent'),
    (re.compile(r'heroin|morphine|codeine|6-mam|monoacetylmorphine|oxycodone|hydromorphone|tramadol|mitragynine|opioid', re.I), 'opioid'),
    (re.compile(r'xylazine|medetomidine|detomidine|clonidine', re.I), 'xyl'),
    (re.compile(r'bromazolam|flualprazolam|alprazolam|etizolam|diazepam|clonazolam|benzodiazep|flubromazolam|diclazepam', re.I), 'benzo'),
    (re.compile(r'methamphetamine|amphetamine|mdma|cathinone|methylenedioxy|n,n-dimethylamphetamine', re.I), 'stim'),
    (re.compile(r'cocaine|benzoylecgonine|ecgonine', re.I), 'coke'),
    (re.compile(r'caffeine|acetaminophen|paracetamol|lidocaine|levamisole|quinine|mannitol|lactose|sucrose|cellulose|diphenhydramine|sulfone|msm|sugar|inositol|procaine|benzocaine|phenacetin|gabapentin|dimethyl|sebacate|btmps|piperidyl|boric|sorbitol|maltose|glucose|creatine|diacetin|tetramethyl', re.I), 'cut'),
]


def classify(name: str = '') -> dict[str, str]:
    text = str(name).lower()
    for pattern, cls in RULES:
        if pattern.search(text):
            family = FAMILY_MAP.get(cls, cls)
            return {'cls': cls, 'family': family, 'label': CLASS_LABEL[cls]}
    return {'cls': 'other', 'family': 'other', 'label': CLASS_LABEL['other']}
