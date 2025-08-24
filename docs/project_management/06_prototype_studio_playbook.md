# Phase 4 — Prototype Studio (Playbook + Templates)

**Mission of Phase 4 (Prototype):** Make ideas tangible—fast—so we can learn with real users and stakeholders. Favor multiple cheap experiments over one perfect build.

Phase 4 converts prioritized concepts into testable artifacts. The focus is learning velocity—capturing the smallest slice that validates or falsifies a key assumption. Each prototype should have a clear owner, hypothesis, and data plan before any pixels or mockups are produced.

**Leads & Roles**

| Role | Responsibilities |
| --- | --- |
| **Prototype & Synthesis Leads** | Curate option set, align measures, synthesize outcomes |
| **Facilitator** | Time‑box sessions, remove blockers, enforce guardrails |
| **Makers** | Build artifacts, instrument for data capture, maintain provenance |
| **Documentarian** | Capture decisions, version artifacts, publish recap |
| **ELO Ethics Liaison** | Run legitimacy check, monitor privacy & risk cues |

> _Tip:_ Keep role names visible in the studio so accountability is explicit.

---

## Inputs → Outputs

**Inputs (from Phases 1–3):** POV statements, top HMWs, prioritized concepts, constraints (tech/legal/ops), initial success metrics.
**Outputs (this phase):** A small **option set** of prototypes (lo‑fi → hi‑fi), experiment cards with hypotheses & measures, and a ready‑to‑run test plan for Phase 5.

### Pre‑Session Setup Checklist

- Confirm problem framing and “How Might We” statements with sponsor
- Reserve collaborative space and ensure prototyping materials are stocked
- Align on data retention policy and consent language with ELO
- Create shared folder for assets with versioning enabled
- Pre‑load user scenarios and any domain datasets needed for Wizard‑of‑Oz

---

## Guardrails

- **Ethics Gate (ELO):** All prototypes must pass a quick **Legitimacy & Risk check** (consented data, safety, privacy‑by‑design).
- **Provenance:** Every artifact carries **version, author, date, and assumptions**.
- **Time & Money:** Default to **time‑boxed, low‑cost** materials.
- **Security & Access:** Redact sensitive identifiers; store recordings on approved drives only.
- **Inclusivity:** Designs must meet baseline accessibility guidelines and consider vulnerable user groups.

---

## Timeboxes (pick one)

**⚡ ½‑Day Blitz (3.5h total)**

1. Option sketching (30m)
2. Converge & storyboard (20m)
3. Build lo‑fi prototypes (100m)
4. Prep test scripts & measures (30m)
5. Dry‑run & logistics (30m)

**🔧 2‑Day Studio**

- Day 1 AM: Option sketches → vote → **Option Set** (3–5)
- Day 1 PM: Build lo‑fi, instrument for testing
- Day 2 AM: Iterate to mid‑fi; align measurement
- Day 2 PM: Pilot with 1–2 users; refine scripts & consent

---

## Prototype Ladders

Progress only as fidelity is justified by risk.

- **Lo‑fi (hours):** paper, click‑throughs, Wizard‑of‑Oz, role‑play, storyboard video.
- **Mid‑fi (days):** interactive Figma, Framer mock, spreadsheet models, service blueprint.
- **Hi‑fi (weeks):** coded spike, functional rig, data‑backed simulation.

**Tip:** Build **3 distinct options** that explore different trade‑offs (e.g., simplicity vs. power; automation vs. control; privacy vs. personalization).

### Fidelity Matrix

| Fidelity | Typical Questions | Instrumentation | Exit Criteria |
| --- | --- | --- | --- |
| **Lo‑fi** | Does the concept resonate? Can users complete the happy path? | Paper notes, observer timing, consent forms | Users grasp value prop and can articulate next step |
| **Mid‑fi** | Are flows clear? What errors arise? | Click tracking, moderated think‑aloud, light analytics | Majority complete tasks within target time |
| **Hi‑fi** | Can the system perform? How does data behave at scale? | Logs, telemetry, integration tests | Performance and risk thresholds validated |

---

## Option Set Canvas

Use this for side‑by‑side comparison.

- **Option A — “Minimal Path”**
  - Key promise:
  - Critical assumption(s):
  - Prototype type & scope:
  - Risks addressed:

- **Option B — “Assistive Copilot”**
  - Key promise:
  - Critical assumption(s):
  - Prototype type & scope:
  - Risks addressed:

- **Option C — “Power User”**
  - Key promise:
  - Critical assumption(s):
  - Prototype type & scope:
  - Risks addressed:

**Scoring Rubric**

| Criterion | Weight | Notes |
| --- | --- | --- |
| User value clarity | 30% | Can users state the benefit after first use? |
| Feasibility | 25% | Fits within current technical/legal constraints |
| Risk reduction | 25% | Addresses top unknowns or failure modes |
| Effort to build | 20% | Can be produced within timebox |

---

## Experiment Card (Template)

- **Name:**
- **Hypothesis:** _We believe that_ \_\_\_ _for_ \_\_\_ _will result in_ \_\_\_ _because_ \_\_\_.
- **User segment / context:**
- **Prototype version:** ID, date, owner
- **What to measure (top 3):**
  1. Task completion (define)
  2. Time on key step / decision latency
  3. Confidence / trust (Likert or confidence band)

- **Success criteria:** (quant + qual thresholds)
- **Ethics & privacy checks:** consent, data minimization, debrief plan
- **Run script (bullet steps):**
- **Debrief prompts:** surprises, breakdowns, delight, workarounds
- **Data capture method:** e.g., screen record, survey link, log export
- **Decision rule:** _If X and Y met, proceed to \_\_; else pivot/kill._
- **Next action owner/date:**

---

## Measures & Instruments

- **Behavioral:** completion %, error/rework count, abandonment points, path choices
- **Cognitive:** confidence rating, mental model alignment (card sort / concept test)
- **Affective:** trust / perceived control / perceived risk
- **Operational:** setup time, support touches, training required

**Recording kit:** screen + audio (if consented), timestamped notes, heat‑map or path logs, “think‑aloud” excerpts.

| Metric | Baseline | Stretch Goal | Capture Tool |
| --- | --- | --- | --- |
| Task completion | 60% | 80% | Observed via facilitator checklist |
| Decision latency | <90s | <45s | Timer, interaction logs |
| Trust rating | 3/5 | 4+/5 | Post‑task Likert survey |

---

## Definition of Ready / Done

**Ready to Prototype**

- [ ] Named user segment(s) & scenarios
- [ ] 1–2 focused hypotheses per concept
- [ ] Success metrics & thresholds agreed
- [ ] Ethics check cleared (ELO)
- [ ] Shared drive created with versioning and access controls

**Done with Phase 4**

- [ ] 3–5 instrumented prototypes
- [ ] Experiment cards filled & scheduled
- [ ] Test scripts prepared with recruiting list
- [ ] Risks & open questions logged
- [ ] Decision log published and linked to backlog

---

## Team Assignments (fill in)

| Workstream       | Prototype Type                 | Owner | Due | Notes |
| ---------------- | ------------------------------ | ----- | --- | ----- |
| Navigation/IA    | Figma click‑through            |       |     |       |
| Workflow         | Wizard‑of‑Oz service           |       |     |       |
| Data/Trust       | Report + provenance overlays   |       |     |       |
| Policy/Ethics UX | Consent & guardrails microcopy |       |     |       |

---

## Materials & Tools (suggested)

- Paper, markers, sticky notes; storyboards; index cards
- Figma / FigJam, Framer, Mural; Google Sheets for quick models
- Screen‑recording + consent forms; timer; observation sheets

---

## Observation Sheet (1‑pager)

- Participant code:
- Scenario:
- Notable behaviors (timestamps):
- Quotes (verbatim):
- Frictions / breakdowns:
- Workarounds observed:
- Moments of delight:
- Facilitator notes:

---

## Synthesis & Decision Framework

After each build–test cycle, hold a 30‑minute synthesis huddle:

1. Cluster observations against hypotheses and success metrics
2. Surface critical breakdowns or surprise delights
3. Decide: iterate, pivot, or archive option
4. Update decision log and backlog with next steps

Use a **traffic‑light board** (green/yellow/red) to visualize option status.

---

## Ethics & Legitimacy Checklist (ELO)

- [ ] Clear purpose; lawful & consented data
- [ ] Minimal necessary personal data; redaction where possible
- [ ] Debrief & right‑to‑withdraw communicated
- [ ] Risk to vulnerable users considered; mitigation documented

---

## Handoff to Phase 5 (Test & Iterate)

When the option set is built and instrumented, confirm:

- Recruiting list & schedule set
- Scripts, tasks, and consent ready
- Data capture & storage plan verified
- Decision‑making cadence agreed (what gets iterated vs. retired)

> **Reminder:** Build to learn, not to ship. Keep it light, legible, and testable.
