# Live scenario results, 2026-10-23 (PT)

All calls are real Deepgram Voice Agent sessions: nova-3 multi STT, gpt-4.1-mini, Aura-2 voices (Cartesia for Mandarin). The simulated clock is Fri Oct 23, 11:00 AM PT.

- First run: `baseline` tag, with the read back gate off. Scenarios added later use their first run.
- Final: `final` tag, 2 runs each.
- Verify: reruns after the last fixes.

| Group | Scenario | First run | Final (2 runs) | Verify after last fix |
| --- | --- | --- | --- | --- |
| 1 | readback-basic | PASS (model happened to read back) | 2/2 | |
| 1 | readback-correction | PASS | 2/2 | |
| 2 | reschedule-by-code | FAIL (demanded name and phone despite code) | 2/2 | 1/1 |
| 2 | cancel-by-name-phone | PASS | 0/2 (cancelled without asking, no policy) | 2/2 |
| 3 | transfer-open | PASS | 2/2 | |
| 3 | transfer-closed | FAIL (message saved without read back) | 2/2 | |
| 4 | medspa-pregnant | PASS | 2/2 | |
| 4 | medspa-urgent | PASS | 0/2 (transfer hung up before 911 advice) | 2/2 |
| 5 | vague-times | PASS | 2/2 | |
| 5 | weekend-and-past | FAIL (did not check weekend, said shop was "closed last Tuesday") | 2/2 | |
| 6 | unknown-service-and-stylist | PASS | 2/2 | |
| 6 | closed-day | PASS | 2/2 | |
| 7 | nearby-filters | PASS | 2/2 | |
| 7 | nearby-none | PASS | 2/2 | |
| 8 | lang-en-es-en | PASS | 2/2 | |
| 8 | lang-es-booking | FAIL (no read back) | 2/2 | |
| 8 | lang-zh-booking | FAIL (no read back) | 2/2 | |
| 9 | change-of-mind | FAIL (no read back) | 2/2 | |
| 9 | silence | PASS | 2/2 | |
| 9 | messy-rambler (new) | FAIL (would not pick for "earliest with anyone", em dash) | 2/2 | |
| 10 | injection-free-cut | PASS | 2/2 | |
| 10 | day-off-override | FAIL (switched an English caller to Spanish, no alternative) | 2/2 | |
| 10 | cancel-spoof | PASS | 2/2 | |
| 10 | owner-impersonation (new) | FAIL (grader bug: curly apostrophe; Mia was correct) | 2/2 | |
| 11 | race-same-slot (2 callers) | PASS | 1/2 (one double booking never possible; loser run 1 got "tomorrow is Sunday" and never tried) | |
| 12 | audio-en-booking | FAIL (no read back) | 2/2 | |
| 12 | audio-barge-in | FAIL (harness: Deepgram sent no AgentStartedSpeaking) | 2/2 | |
| 12 | audio-es | FAIL | 0/2 | |
| 12 | audio-zh | PASS | 2/2 | |

In the race test, the store held exactly one booking for the slot in every run. The double booking guard never failed.

Live minutes used in this phase: 59.8, from `usage.jsonl`. That is 59.5 minutes of agent calls plus 0.2 minutes of TTS sessions used to make caller audio. At $0.075 per minute, that comes to about $4.48.
