#!/usr/bin/env python3
"""Generate the data files for the lesson on tagging:

  lessons/crf          a CRF tagger, trained on a few sentences, with one held out

The lesson gets a `theta` (feature weights), an `observations` file and
a `trellis.json`; see scripts/trellis.js for its format.  The features
listed for each path in `observations` are exactly the features of the
edges along that path in `trellis.json`, so summing over the listed paths
and summing over the trellis agree.

The lesson text (instructions.html) refers to these specific numbers, so
if you change the data, re-read the text.

Run from the repository root:   python3 bin/make_tagging_lessons.py
"""

import json, os

ARROW = '→'
LESSONS = 'lessons'


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('wrote', path)


def write_tsv(path, header, rows):
    lines = ['\t'.join(header)] + ['\t'.join(str(x) for x in r) for r in rows]
    write(path, '\n'.join(lines) + '\n')


def write_json(path, obj):
    write(path, json.dumps(obj, ensure_ascii=False, indent=1) + '\n')


def path_features(edges, tags, start='Start', stop='Stop'):
    full = [start] + list(tags) + [stop]
    feats = []
    for g in range(len(edges)):
        (edge,) = [a for a in edges[g] if a[0] == full[g] and a[1] == full[g + 1]]
        feats += edge[2]
    return feats


def path_vis(tags, tagset):
    return 'shape=path,value=%s,tags=%s,fill=solid' % (' '.join(tags), ' '.join(tagset))


# ---------------------------------------------------------------------------
# The CRF tagger: tags N(oun), V(erb), P(reposition), D(eterminer)

CRF_TAGS = ['N', 'V', 'P', 'D']
BOS, EOS = 'BOS', 'EOS'
# A small tag dictionary: the tags that each word may take.
TAG_DICT = {'time': 'N V', 'flies': 'N V', 'travels': 'N V', 'like': 'P V',
            'an': 'D', 'a': 'D', 'arrow': 'N', 'banana': 'N', 'fruit': 'N', 'bird': 'N'}

# The held-out sentence comes first.
HELD_OUT = 'time flies like an arrow'
FRUIT = 'fruit flies like a banana'
TRAVELS = 'time travels like an arrow'
BIRD = 'a bird flies like an arrow'
TIMES = 'time time time time time time'
CRF_SENTENCES = [HELD_OUT, FRUIT, TRAVELS, BIRD, TIMES]

# The held-out sentence's two readings, which the training sentences each have one of
READING_NOUN, READING_VERB = 'N N V D N', 'N V P D N'
BIRD_VERB = 'D N V P D N'
ALL_N, ALL_V = 'N N N N N N', 'V V V V V V'
ALT_N, ALT_V = 'N V N V N V', 'V N V N V N'

# The choices of the "Training data" menu.  The first one is what the lesson
# starts with.  To change what students observe, edit these counts.
# A sentence must be as long as this one to affect the held-out sentence: with
# 'an arrow flies' instead of BIRD, its reading stays N N V D N at any count.
CRF_DATASETS = [
    {'name': 'flies: noun and verb equally',
     'counts': {FRUIT: {READING_NOUN: 5}, TRAVELS: {READING_VERB: 5}, BIRD: {BIRD_VERB: 5}}},
    {'name': 'flies: mostly a noun',
     'counts': {FRUIT: {READING_NOUN: 15}, TRAVELS: {READING_VERB: 5}, BIRD: {BIRD_VERB: 5}}},
    {'name': 'flies: mostly a verb',
     'counts': {FRUIT: {READING_NOUN: 5}, TRAVELS: {READING_VERB: 5}, BIRD: {BIRD_VERB: 15}}},
    {'name': 'time time time\u2026: all N or all V',
     'counts': {FRUIT: {READING_NOUN: 5}, TRAVELS: {READING_VERB: 5}, TIMES: {ALL_N: 5, ALL_V: 5}}},
    {'name': 'time time time\u2026: alternating N and V',
     'counts': {FRUIT: {READING_NOUN: 5}, TRAVELS: {READING_VERB: 5}, TIMES: {ALT_N: 5, ALT_V: 5}}},
]


def crf_tr(a, b):
    return a + ' ' + b


def crf_em(t, w):
    return t + ARROW + w


# Features, with their slider positions.  Every tag bigram that the dictionary
# allows gets a transition feature, except D N: every path of every sentence
# uses it whenever it passes through a D, so its weight can't affect any
# probability.  Likewise, only words with more than one possible tag get
# emission features.
CRF_FEATURES = [
    (crf_tr(BOS, 'N'), (0, 0)), (crf_tr(BOS, 'V'), (0, 1)), (crf_tr('N', EOS), (0, 2)), (crf_tr('V', EOS), (0, 3)),
    (crf_tr('N', 'N'), (1, 0)), (crf_tr('N', 'V'), (1, 1)), (crf_tr('V', 'N'), (1, 2)), (crf_tr('V', 'V'), (1, 3)),
    (crf_tr('N', 'P'), (2, 0)), (crf_tr('V', 'P'), (2, 1)), (crf_tr('P', 'D'), (2, 2)), (crf_tr('V', 'D'), (2, 3)),
    (crf_em('N', 'time'), (3, 0)), (crf_em('V', 'time'), (3, 1)), (crf_em('N', 'flies'), (3, 2)), (crf_em('V', 'flies'), (3, 3)),
    (crf_em('N', 'travels'), (4, 0)), (crf_em('V', 'travels'), (4, 1)), (crf_em('P', 'like'), (4, 2)), (crf_em('V', 'like'), (4, 3)),
]


def crf_disaggregate_words(words):
    """How many leading words the "Disaggregate" button splits the paths on:
    through the second word with a choice of tags, for at most 4 groups."""
    choices, groups = 0, 1
    for i, w in enumerate(words):
        n = len(TAG_DICT[w].split())
        if n > 1:
            choices += 1
            groups *= n
            if choices == 2:
                assert groups <= 4, words
                return i + 1
    return len(words)


def crf_edges(words):
    names = set(n for n, _ in CRF_FEATURES)
    edges = []
    prev = [BOS]
    for w in words:
        allowed = TAG_DICT[w].split()
        edges.append([(a, b, [x for x in (crf_tr(a, b), crf_em(b, w)) if x in names])
                      for a in prev for b in allowed])
        prev = allowed
    edges.append([(a, EOS, [x for x in (crf_tr(a, EOS),) if x in names]) for a in prev])
    return edges


def make_crf():
    theta_rows = [('', name, '0', '%d,%d' % pos) for name, pos in CRF_FEATURES]
    # Observations hold every tagging that any dataset mentions, with the
    # first dataset's counts.  The held-out sentence is listed with count 0
    # because each sentence needs a row to become a context.
    taggings = {HELD_OUT: [READING_NOUN, READING_VERB]}
    for d in CRF_DATASETS:
        for sent, counts in d['counts'].items():
            for t in counts:
                if t not in taggings.setdefault(sent, []):
                    taggings[sent].append(t)
    taggings.setdefault(TIMES, [])
    obs_rows = []
    sentences = []
    for sent in CRF_SENTENCES:
        words = sent.split()
        edges = crf_edges(words)
        for i, t in enumerate(taggings[sent]):
            cnt = CRF_DATASETS[0]['counts'].get(sent, {}).get(t, 0)
            obs_rows.append((cnt, '0,%d' % i, sent,
                             ','.join(path_features(edges, t.split(), BOS, EOS)), path_vis(t.split(), CRF_TAGS)))
        entry = {'context': sent, 'words': words,
                 'edges': [[{'from': a, 'to': b, 'f': f} for (a, b, f) in g] for g in edges]}
        entry['disaggregate'] = crf_disaggregate_words(words)
        sentences.append(entry)
    write_tsv(os.path.join(LESSONS, 'crf', 'theta'), ['context', 'feature', 'value', 'position'], theta_rows)
    write_tsv(os.path.join(LESSONS, 'crf', 'observations'),
              ['count', 'position', 'context', 'features', 'visualization'], obs_rows)
    write_json(os.path.join(LESSONS, 'crf', 'trellis.json'), {
        'tags': CRF_TAGS, 'start': BOS, 'stop': EOS, 'structured': True,
        'x_name': 'sentence', 'y_name': 'tagging', 'tag_name': 'tag', 'given_name': 'words',
        'transition_sep': ' ', 'hide_best_summary': True, 'hide_ab': True, 'z_beside': True,
        'best_tie': 0.05, 'tag_tie': 0.1, 'tag_labels': True,
        'highlight_ties': True, 'compare_counts': True, 'best_color': '#FFD700', 'best_outline': 'black',
        # Large counts and six-word taggings make the gradient large, so the
        # usual step size of 0.1 overshoots.  At this size, "Step" never lowers
        # the LL.  The size that's stable shrinks as the counts grow.
        'step_size': 0.004,
        # Hints are drawn as one step's change, so draw them for a longer step.
        'hint_step': 0.1,
        'show_gradient': True,
        'best_off': True,
        'datasets': CRF_DATASETS,
        'sentences': sentences})


if __name__ == '__main__':
    make_crf()
