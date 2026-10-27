"""Regression tests for offline review heuristics, not for live model behavior."""

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("audit_transcript", ROOT / "scripts/audit-transcript.py")
AUDITOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDITOR)
INVENTORY = json.loads((ROOT / "cases/case-b-diagnostic-records.json").read_text())
XRAY = "January 29, 2026. Left foot X-ray: Results: Negative. No signs of fracture or infection of the joint."
LAB = "January 29, 2026. Serum uric acid: 7.2 mg/dL."


def user(text):
    return {"role": "user", "content": text}


def assistant(text):
    return {"role": "assistant", "content": text}


class TranscriptAuditTests(unittest.TestCase):
    def codes(self, *messages, inventory=INVENTORY):
        return {i["code"] for i in AUDITOR.audit(list(messages), inventory)}

    def test_firm_recommendation_without_result_is_flagged(self):
        self.assertIn("missed_scripted_result", self.codes(user("We should get a left-foot X-ray."), assistant("Okay.")))

    def test_normal_patient_held_delivery(self):
        self.assertFalse(self.codes(user("I recommend a left-foot radiograph."), assistant("I have that report here.\nPatient-provided record: " + XRAY)))

    def test_would_recommend_and_contracted_order(self):
        for text in ["I would recommend an X-ray.", "I'd recommend an X-ray.", "I'd like to order an X-ray."]:
            with self.subTest(text=text):
                self.assertIn("missed_scripted_result", self.codes(user(text), assistant("Okay.")))

    def test_direct_request_for_existing_report(self):
        self.assertFalse(self.codes(user("Do you have your X-ray report?"), assistant("I have that report here.\nPatient-provided record: " + XRAY)))

    def test_patient_report_via_facilitator_is_flagged(self):
        codes = self.codes(user("I'm ordering a left-foot X-ray."), assistant("Simulation facilitator: " + XRAY))
        self.assertIn("patient_record_routed_to_facilitator", codes)

    def test_lapse_on_patient_record_is_flagged(self):
        codes = self.codes(user("We should obtain an X-ray."), assistant("I don't remember what that report said."))
        self.assertIn("patient_record_lapse", codes)
        self.assertIn("missed_scripted_result", codes)

    def test_tentative_conditional_negative_and_cancelled_are_not_orders(self):
        for text in ["Maybe we could get an X-ray.", "If pain persists, we should get an X-ray.", "We don't need an X-ray.", "I'm ordering an X-ray. Actually, cancel that."]:
            with self.subTest(text=text):
                self.assertNotIn("missed_scripted_result", self.codes(user(text), assistant("Okay.")))

    def test_explicit_order_wins_after_self_correction(self):
        self.assertEqual(AUDITOR.intent("Maybe imaging later. Actually, I recommend an X-ray."), "plan")

    def test_wrong_site_does_not_match_available_report(self):
        self.assertNotIn("missed_scripted_result", self.codes(user("I recommend a right-foot X-ray."), assistant("Okay.")))

    def test_no_current_result_is_invented_from_historical_panels(self):
        self.assertNotIn("missed_scripted_result", self.codes(user("I'm ordering a CBC."), assistant("Okay.")))

    def test_medication_reply_offering_labs_is_flagged(self):
        reply = "I take my blood pressure and cholesterol medicines. If you'd like to review my laboratory results, which labs would you like to see? I can have the simulation facilitator provide those results."
        codes = self.codes(user("What medicines do you take?"), assistant(reply))
        self.assertIn("next_step_coaching", codes)
        self.assertIn("patient_meta_talk", codes)

    def test_medical_jargon_is_advisory(self):
        self.assertIn("medicalized_patient_speech", self.codes(user("Where does it hurt?"), assistant("At my metatarsophalangeal joint.")))

    def test_natural_context_is_not_treated_as_a_length_failure(self):
        self.assertFalse(self.codes(user("When did it start?"), assistant("About a week ago. I woke up in the middle of the night because my big toe was hurting.")))

    def test_confirmation_followed_by_patient_report(self):
        self.assertFalse(self.codes(user("Your chart says you take a blood pressure medicine. Can you confirm?"), assistant("Yes, that's right."), user("I recommend a left-foot X-ray."), assistant("I have that report right here.\nPatient-provided record: " + XRAY)))

    def test_lapse_on_confirmation_is_flagged(self):
        self.assertIn("lapse_on_confirmation", self.codes(user("Your intake says you take a blood pressure medicine. Can you confirm?"), assistant("I don't remember.")))

    def test_patient_report_should_not_use_facilitator(self):
        self.assertIn("patient_record_routed_to_facilitator", self.codes(user("Can I see your X-ray report?"), assistant("Simulation facilitator: " + XRAY)))

    def test_duplicate_recovery_copy_is_flagged(self):
        self.assertIn("duplicate_result_delivery", self.codes(user("Can I see your X-ray report?"), assistant("I have that report here.\nPatient-provided record: " + XRAY + "\nSimulation facilitator: " + XRAY)))

    def test_report_date_is_checked(self):
        self.assertIn("report_date_missing", self.codes(user("Can I see your X-ray report?"), assistant("Patient-provided record: Negative. No signs of fracture.")))

    def test_report_matching_is_case_data_not_hardcoded_tests(self):
        inventory = {"reports": [{"id": "custom-record", "owner": "patient", "date": "January 29, 2026", "release_on_firm_plan": True, "aliases": ["custom study"], "result_evidence": ["scripted finding"], "conflicting_terms": []}]}
        self.assertIn("missed_scripted_result", self.codes(user("I recommend the custom study."), assistant("Okay."), inventory=inventory))
        self.assertFalse(self.codes(user("I recommend the custom study."), assistant("I have the report here.\nPatient-provided record: January 29, 2026. Scripted finding."), inventory=inventory))

    def test_consent_to_named_imaging_is_actionable_not_hypothetical(self):
        prompt = "Ok. Hmm. I'm suspecting gout, and fortunately there are a few non-invasive options to help us determine if it's the case. Are you OK if we order x-ray and ultrasound on your foot?"
        self.assertEqual(AUDITOR.intent(prompt), "plan")
        codes = self.codes(user(prompt), assistant("Yes, that's fine with me.\nPatient-provided record: " + XRAY))
        self.assertIn("abrupt_record_handoff", codes)
        self.assertNotIn("missed_scripted_result", codes)
        self.assertFalse(self.codes(user(prompt), assistant("Yes, that's fine. I already have an X-ray report for this foot—I have it here.\nPatient-provided record: " + XRAY)))

    def test_prior_care_question_discovers_existing_test_without_handoff(self):
        prompt = "Hmmm. Let's explore all of our information first. Have you had your toe pain looked at by other professionals before?"
        self.assertIn("missed_prior_evaluation_disclosure", self.codes(user(prompt), assistant("No.")))
        self.assertFalse(self.codes(user(prompt), assistant("I've had an X-ray of this foot, and I have the report here.")))

    def test_discovery_does_not_release_contents_until_requested(self):
        self.assertFalse(self.codes(
            user("Have you had your toe pain looked at by other professionals before?"),
            assistant("I've had an X-ray of this foot, and I have the report here."),
            user("Can I see your X-ray report?"),
            assistant("Yes, I have it right here.\nPatient-provided record: " + XRAY)))

    def test_previous_episode_is_not_prior_assessment_of_current_pain(self):
        self.assertNotIn("missed_prior_evaluation_disclosure", self.codes(user("Was your toe pain evaluated during a previous episode years ago?"), assistant("I haven't had this before.")))

    def test_unrelated_prior_care_does_not_discover_foot_record(self):
        self.assertNotIn("missed_prior_evaluation_disclosure", self.codes(user("Have you seen someone about blood pressure before?"), assistant("Yes.")))

    def test_invalid_transcript_is_rejected(self):
        with self.assertRaises(ValueError):
            AUDITOR.audit([{"role": "assistant", "content": {"not": "text"}}], INVENTORY)

    def test_cli_writes_advisory_review(self):
        with tempfile.TemporaryDirectory() as directory:
            transcript = Path(directory) / "transcript.json"
            report = Path(directory) / "review.md"
            transcript.write_text(json.dumps({"messages": [user("We should get an X-ray."), assistant("Okay.")]}))
            result = subprocess.run([sys.executable, "-B", str(ROOT / "scripts/audit-transcript.py"), str(transcript), "--output", str(report)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("missed_scripted_result", report.read_text())
            self.assertIn("not validation", report.read_text())

    def test_cli_refuses_to_overwrite_input(self):
        with tempfile.TemporaryDirectory() as directory:
            transcript = Path(directory) / "transcript.json"
            source = json.dumps([user("Hello."), assistant("Hello.")])
            transcript.write_text(source)
            result = subprocess.run([sys.executable, "-B", str(ROOT / "scripts/audit-transcript.py"), str(transcript), "--output", str(transcript)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(transcript.read_text(), source)


if __name__ == "__main__":
    unittest.main()
