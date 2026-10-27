#!/usr/bin/env python3
"""Offline, advisory review of saved simulated-patient chat transcripts.

Input: a JSON array of {role, content} messages, or {"messages": [...]}.
This is a heuristic reviewer, not a model evaluator, grader, or clinical validator.
"""

import argparse
from datetime import datetime
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
LABEL = re.compile(r"^\s*(?:#{1,6}\s*)?(?:\*\*)?(Patient-provided record|Simulation facilitator):(?:\*\*)?", re.I | re.M)
LAPSE = re.compile(r"\b(?:don't|do not|can't|cannot)\s+(?:remember|recall|find)\b|\bnot sure\b.*\b(?:report|results?)\b", re.I)
CONFIRM = re.compile(r"\b(?:confirm|is that (?:right|correct)|your (?:chart|intake) says)\b", re.I)
ALREADY = re.compile(r"\b(?:already have|already received|in front of me|pre[- ]visit|your (?:chart|intake) says)\b", re.I)
COACHING = re.compile(r"\b(?:if you(?:'d| would) like|would you like).{0,70}\b(?:labs?|results?|reports?|tests?)\b|\bwhich (?:labs?|tests?|results?).{0,45}\b(?:would you like|do you want)\b|\byou can ask\b|\bfacilitator can (?:provide|give|show)\b", re.I | re.S)
META = re.compile(r"\b(?:simulation facilitator|skill package|system prompt|simulation (?:rules|process)|uploaded (?:knowledge|files))\b", re.I)
JARGON = re.compile(r"\b(?:metatarsophalangeal|differential diagnosis|hyperuricemia|pathophysiology|monosodium urate|inflammatory arthropathy)\b", re.I)


def normalize(text):
    return re.sub(r"[^a-z0-9]+", " ", text.lower().replace("’", "'")).strip()


def contains(text, phrase):
    return f" {normalize(phrase)} " in f" {normalize(text)} "


def intent(text):
    """Conservative surface-language classification, not full clinical semantics."""
    text = text.lower().replace("’", "'")
    # Use the last explicit self-correction, but retain full text for report matching.
    decision = re.split(r"\b(?:actually|instead|on second thought)\b", text)[-1]
    if re.search(r"\b(?:don't|do not|no need|not needed|won't|will not|cancel|cancelled|canceled|defer|against)\b", decision):
        return None
    consent = re.search(r"\bare you (?:ok|okay|all right|comfortable|agreeable)(?: with it)? if we (?:order|get|obtain)\b|\b(?:may|can) (?:i|we) order\b", decision)
    if consent:
        return "plan"
    if re.search(r"\b(?:if|unless|maybe|perhaps|might|consider)\b", decision):
        return None
    direct = re.search(r"\b(?:can|could|may|would)\s+(?:i|you)\s+(?:see|show|review|have|share|give|read)\b|\bdo you have\b.{0,60}\b(?:reports?|results?)\b|\b(?:show|give|share|read)\s+(?:me|us)\b|\bwhat (?:did|do|were|are).{0,45}\bresults?\b", decision)
    if direct:
        return "request"
    if re.search(r"\b(?:could|would consider)\b", decision):
        return None
    firm = re.search(r"\b(?:i|we)\s+(?:(?:would |'d )?recommend|should\s+(?:get|obtain|order)|(?:want|plan)\s+to\s+(?:get|obtain|order)|will\s+(?:get|obtain|order)|am ordering|are ordering)\b|\bi(?:'d| would) (?:like to order|recommend)\b|\bi'?m (?:ordering|going to order)\b|\blet'?s (?:get|obtain|order)\b", decision)
    return "plan" if firm else None


def match_reports(text, reports):
    matches = []
    normalized = f" {normalize(text)} "
    for report in reports:
        if any(contains(text, term) for term in report.get("conflicting_terms", [])):
            continue
        positions = [normalized.find(f" {normalize(alias)} ") for alias in report["aliases"]]
        positions = [p for p in positions if p >= 0]
        if positions:
            matches.append((min(positions), report))
    return [r for _, r in sorted(matches, key=lambda item: item[0])]


def prior_evaluation_reports(text, reports):
    """Conservative history-discovery matching, separate from result requests."""
    text = text.lower().replace("’", "'")
    question = re.search(r"\b(?:have|has|did|what)\b", text)
    assessment = re.search(r"looked at|assessed|evaluated|seen (?:someone|anyone|a doctor)|professionals|already (?:been )?done", text)
    if not question or not assessment:
        return []
    if re.search(r"previous episode|last episode|years ago|as a child", text):
        return []
    return [r for r in reports if r.get("disclose_on_prior_evaluation")
            and any(contains(text, topic) for topic in r.get("prior_evaluation_topics", []))]


def split_response(text):
    labels = list(LABEL.finditer(text))
    patient = text[:labels[0].start()] if labels else text
    blocks = {"patient-provided record": "", "simulation facilitator": ""}
    for index, match in enumerate(labels):
        end = labels[index + 1].start() if index + 1 < len(labels) else len(text)
        blocks[match.group(1).lower()] += text[match.end():end] + "\n"
    return patient.strip(), blocks


def evidence(text, report):
    return any(contains(text, term) for term in report["result_evidence"])


def dated(text, report):
    date = datetime.strptime(report["date"], "%B %d, %Y")
    variants = [report["date"], date.strftime("%Y-%m-%d"), f"{date.month}/{date.day}/{date.year}", date.strftime("%m/%d/%Y")]
    return any(contains(text, variant) for variant in variants)


def audit(messages, inventory):
    if not isinstance(messages, list) or not all(isinstance(m, dict) and m.get("role") in {"user", "assistant", "system"} and isinstance(m.get("content"), str) for m in messages):
        raise ValueError("Messages must be a JSON array of role/content text objects")
    reports = inventory["reports"]
    issues, released = [], set()
    recall_decided, lapse_used = False, False
    user = ""

    def flag(code, turn, detail, suggestion):
        issues.append({"code": code, "turn": turn, "detail": detail, "suggestion": suggestion})

    for turn, message in enumerate(messages, 1):
        if message["role"] == "user":
            user = message["content"]
            if ALREADY.search(user):
                released.update(r["id"] for r in match_reports(user, reports))
            continue
        if message["role"] != "assistant":
            continue
        text = message["content"]
        patient, blocks = split_response(text)
        lapse = bool(LAPSE.search(patient))
        confirmation = bool(CONFIRM.search(user))
        action = intent(user)
        matches = match_reports(user, reports)
        discovered = prior_evaluation_reports(user, reports)
        expected = [r for r in matches if action == "request" or (action == "plan" and r["release_on_firm_plan"])]
        for report in discovered:
            if not any(contains(patient, alias) for alias in report["aliases"]):
                flag("missed_prior_evaluation_disclosure", turn,
                     f"Prior-assessment question did not elicit the relevant existing test: {report['id']}.",
                     "Mention the supported prior test/report naturally; do not invent visit details or dump report contents.")
        if confirmation:
            expected = []  # A request to confirm known information is not a report handoff.
        eligible = [r for r in expected if r["owner"] == "patient" and r["id"] not in released]
        first_opportunity = bool(eligible) and not recall_decided
        if first_opportunity:
            recall_decided = True

        if COACHING.search(text):
            flag("next_step_coaching", turn, "Possible unsolicited test/result offer or invitation.", "End the answer at the learner's requested topic; remove offers and next-step menus.")
        if META.search(patient):
            flag("patient_meta_talk", turn, "Patient speech may reveal simulation mechanics.", "Keep the patient in character; put a genuinely needed finding in a separate labeled block.")
        if JARGON.search(patient):
            flag("medicalized_patient_speech", turn, "Patient speech contains clinician-style terminology.", "Review whether this patient would know the term; describe personal experience in everyday words.")
        if len(patient.split()) > 160 and len(user.split()) < 25:
            flag("dense_patient_answer", turn, "Long patient prose follows a relatively short prompt.", "Review for unasked history or explanations; preserve natural context and explicitly requested details.")
        if lapse and confirmation:
            flag("lapse_on_confirmation", turn, "Recall lapse during confirmation of learner-supplied facts.", "Confirm supplied facts normally; exclude confirmations from recall variation.")
        elif lapse and ("report" in patient.lower() or "result" in patient.lower() or eligible):
            flag("patient_record_lapse", turn, "Recall lapse on patient-held records.", "Simulated patient directly provides patient-held records; do not simulate lapses.")

        for report in expected:
            normal = evidence(blocks["patient-provided record"], report)
            facilitated = evidence(blocks["simulation facilitator"], report)
            if not normal and not facilitated:
                flag("missed_scripted_result", turn, f"No recognizable result block for {report['id']} after a qualifying {action}.", "Match the case inventory and release the available scripted result without a second request.")
                continue
            if action == "plan" and report["owner"] == "patient" and normal and not re.search(r"\b(?:have|had|already|here|report)\b", patient, re.I):
                flag("abrupt_record_handoff", turn, "A proposed test receives a result artifact without acknowledging the existing report in patient speech.",
                     "Connect naturally to the existing report before the separate document; avoid a bare yes followed by results.")
            if report["owner"] == "patient" and facilitated:
                flag("patient_record_routed_to_facilitator", turn, f"Patient-held {report['id']} appears in the facilitator channel.", "Simulated patient directly provides patient-held records; the simulation facilitator does not step in.")
            if report["owner"] == "facilitator" and normal:
                flag("facilitator_record_routed_to_patient", turn, f"Facilitator-only {report['id']} appears as a patient record.", "Retain the case's record ownership; do not make the patient remember facilitator-only data.")
            if normal and facilitated:
                flag("duplicate_result_delivery", turn, f"Possible duplicate delivery of {report['id']} in both channels.", "Use normal delivery OR recovery, not both copies.")
            content = (blocks["patient-provided record"] if normal else "") + (blocks["simulation facilitator"] if facilitated else "")
            if not dated(content, report):
                flag("report_date_missing", turn, f"Expected date for {report['id']} was not recognized.", "Include the supplied report date; do not imply a new test was just performed.")
            released.add(report["id"])
        if any(blocks.values()) and not expected and not confirmation:
            flag("record_trigger_needs_review", turn, "A record/facilitator block has no clear diagnostic trigger recognized by this reviewer.", "Check whether dialogue context or an examination request legitimately triggered it; this is not an automatic failure.")
    return issues


def render(issues, message_count):
    lines = ["# Simulated patient transcript review", "", f"Reviewed {message_count} messages; {len(issues)} advisory finding(s).", "", "Offline heuristic review only. This does not grade learners, verify clinical correctness, prove naturalness, or measure a 10% lapse rate. A zero-finding report is not validation. Review each flag against the conversation and case; indirect wording, prior context, markdown formatting, and component-level releases may require human interpretation.", ""]
    for item in issues:
        lines += [f"## Message {item['turn']}: {item['code']}", "", item["detail"], "", "Suggested review: " + item["suggestion"], ""]
    if not issues:
        lines += ["No supported heuristic patterns were flagged. Continue faculty review of realism, clinical fidelity, and result-release behavior.", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--inventory", type=Path, default=ROOT / "cases/case-b-diagnostic-records.json")
    parser.add_argument("--output", type=Path, help="Optional Markdown report; default is stdout")
    args = parser.parse_args()
    try:
        raw = json.loads(args.transcript.read_text(encoding="utf-8"))
        messages = raw.get("messages") if isinstance(raw, dict) else raw
        inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
        if inventory.get("schema_version") != 1 or not isinstance(inventory.get("reports"), list):
            raise ValueError("Unsupported diagnostic inventory")
        report = render(audit(messages, inventory), len(messages))
        if args.output:
            if args.output.resolve() in {args.transcript.resolve(), args.inventory.resolve()}:
                raise ValueError("Output cannot overwrite transcript or inventory")
            args.output.write_text(report, encoding="utf-8")
            print(f"Saved advisory review to {args.output}")
        else:
            print(report)
    except (ValueError, KeyError, OSError, TypeError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
