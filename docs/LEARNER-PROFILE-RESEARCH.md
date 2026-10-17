# Automatic learner profile: evidence and implementation

## Decision

Use an evolving presentation recommendation, not a diagnostic visual/auditory/kinesthetic label. There is no established universally optimal algorithm for identifying such a permanent type. Preferences are useful controls; learning outcomes are the stronger feedback signal. All formats remain available and users can disable automatic selection.

## Research

- [Pashler et al., Learning Styles: Concepts and Evidence (2008)](https://www.psychologicalscience.org/journals/pspi/j.1539-6053.2009.01038.x/) explains that evidence for matching requires an interaction between learner classification and instructional format, measured with a common outcome. Preference alone does not demonstrate improved learning.
- [Clinton-Lisell and Litzinger, 2024 systematic review and meta-analysis](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1428732/full) reports a small average matching benefit, but substantial heterogeneity and limited crossover evidence. This warrants caution rather than claiming either a reliable VAK diagnosis or that every study found no effect.
- [Deslauriers et al., 2019 randomized study](https://doi.org/10.1073/pnas.1821936116) demonstrates that perceived learning can differ from measured learning. Satisfaction should not replace assessment.
- [Freeman et al., 2014 active-learning meta-analysis](https://doi.org/10.1073/pnas.1319030111) supports active learning in undergraduate STEM on average. It does not establish a distinct kinesthetic learner category.

## Shipped policy

1. A learner can select a preference or choose discovery. Discovery explores the least-observed format across text, diagrams, audio and interactive work.
2. The common knowledge check records the first answer and the last presentation used before it. Audio requires a playback event; interactive work requires an answer change. Text/diagram display counts as exposure, not proof of attention.
3. Repeated checks, revealed solutions, practice corrections and Smart Retry cannot inflate the format-comparison score. First-attempt records are deduplicated by course/concept; retry/activity outcomes are retained separately.
4. The score is a smoothed correctness estimate `(correct + 1) / (observations + 2)`. A provisional leader requires at least six first checks overall, two formats with at least two distinct concepts each, and a score gap of 0.15. These are conservative product heuristics, not validated psychometric thresholds or statistical confidence.
5. With insufficient data, show an explicit forming-profile state and keep exploring or use the chosen preference. Suggest another representation after an error. A manual choice remains authoritative for that topic; automatic selection can be switched off.
6. Up to 200 validated outcome records persist locally across courses. No account, device synchronization or hidden personality inference is involved. Old course progress migrates through validated event replay.

## Limits and next validation

Topic difficulty, prior knowledge, mixed exposure and self-selection confound these observations. The current recommendation describes results seen so far, not a causal advantage or a fixed personal trait. A learner can skip audio/activity; absent use contributes no comparative result. Continuous playback and long-term retention are not inferred from a play event.

Before claiming improved learning, run a consented comparison against preference-only and nonadaptive multimodal baselines, balance topic difficulty and order, and measure a delayed common assessment. Future adaptations should incorporate topic mastery and accessibility needs; do not replace the provisional profile with an unvalidated VAK questionnaire.

## Representations

New AI courses contain validated source-linked node/edge diagrams, Polish narration and deterministic ordering, matching or classification exercises. No generated executable code is accepted. Existing courses derive limited representations from their saved quotations without replacing progress. Server MP3 generation uses OpenRouter or OpenAI with transcript and system-speech fallback. A live OpenRouter generation returned all three activity types; a live Polish Microsoft narration request returned valid MP3 bytes. Headless playback does not verify subjective voice quality or audible output on a physical device.
