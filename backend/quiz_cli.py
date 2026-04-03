#!/usr/bin/env python3
"""
Interactive CLI for the Quiz + AI Recommender pipeline.

Walks you through the quiz question-by-question, submits your answers,
waits for AI processing, and prints your personality profile + recommendations.

Usage:
    python quiz_cli.py [--quiz-url http://localhost:8012] [--ai-url http://localhost:8006]
"""

import argparse
import json
import sys
import time

import httpx

# ── Colours / formatting ──────────────────────────────────────────────────
BOLD    = "\033[1m"
CYAN    = "\033[36m"
GREEN   = "\033[32m"
YELLOW  = "\033[33m"
MAGENTA = "\033[35m"
DIM     = "\033[2m"
RESET   = "\033[0m"
HR      = "─" * 60


def cprint(colour, text):
    print(f"{colour}{text}{RESET}")


def print_banner():
    print()
    cprint(CYAN, HR)
    cprint(CYAN, f"  {BOLD}☕  Café Personality Quiz  {RESET}{CYAN}")
    cprint(CYAN, HR)
    print()


def print_progress(current, total):
    bar_len = 30
    filled = int(bar_len * current / total) if total else 0
    bar = "█" * filled + "░" * (bar_len - filled)
    cprint(DIM, f"  [{bar}] {current}/{total}")


# ── Core flow ─────────────────────────────────────────────────────────────

def run_quiz(quiz_url: str, ai_url: str):
    user_id = input(f"{YELLOW}Enter your name (or any ID): {RESET}").strip()
    if not user_id:
        cprint(YELLOW, "Aborted — no user ID provided.")
        sys.exit(0)

    # ── 1. Start session ──────────────────────────────────────────────
    with httpx.Client(timeout=10.0) as http:
        cprint(DIM, "\nConnecting to quiz service...")
        res = http.post(f"{quiz_url}/quiz/session", json={"user_id": user_id})
        if res.status_code != 200:
            cprint(YELLOW, f"Failed to start session: {res.status_code} — {res.text}")
            sys.exit(1)

        session = res.json()
        session_id = session["session_id"]
        questions = session["questions"]
        total = len(questions)

        print()
        cprint(GREEN, f"Session started! {total} questions coming up.\n")
        print(DIM + "Type your answers freely — there are no wrong answers." + RESET)
        print()

        # ── 2. Ask questions one by one ───────────────────────────────
        for i, q in enumerate(questions, 1):
            cprint(BOLD, f"Q{i}/{total}  [{q['category'].replace('_', ' ').title()}]")
            cprint(CYAN, f"  {q['text']}")
            print()

            # Show options as hints
            if q.get("options"):
                cprint(DIM, "  Suggested answers (pick one or write your own):")
                for opt in q["options"]:
                    cprint(DIM, f"    • {opt['text']}")
                print()

            answer = ""
            while not answer.strip():
                answer = input(f"{GREEN}Your answer: {RESET}")
                if not answer.strip():
                    cprint(YELLOW, "  Please type something — no empty answers.")

            # Submit
            sub = http.post(
                f"{quiz_url}/quiz/session/{session_id}/answer",
                json={"question_id": q["question_id"], "answer_text": answer.strip()},
            )
            if sub.status_code != 200:
                cprint(YELLOW, f"  ⚠  Answer submission returned {sub.status_code}, continuing anyway.")
            else:
                data = sub.json()
                print(f"  {DIM}✓ Saved  ({data['answered_count']}/{data['total_questions']}){RESET}")

            print()
            if i < total:
                print(DIM + HR + RESET)
                print()

        # ── 3. Submit session ─────────────────────────────────────────
        cprint(GREEN, "\nAll answers recorded! Submitting to AI...")
        sub_res = http.post(f"{quiz_url}/quiz/session/{session_id}/submit")
        if sub_res.status_code == 201:
            submission_id = sub_res.json()["submission_id"]
        else:
            # Quiz service may already have been submitted or returned different code
            cprint(YELLOW, f"Submit returned {sub_res.status_code}. Checking session for submission info...")
            get_res = http.get(f"{quiz_url}/quiz/submissions/{session_id}")
            if get_res.status_code == 200:
                submission_id = get_res.json().get("submission_id", session_id)
            else:
                cprint(YELLOW, "Could not find submission_id — using session_id as fallback.")
                submission_id = session_id

        # ── 4. Poll AI results ────────────────────────────────────────
        cprint(MAGENTA, "\n⏳  AI is generating your profile...")

        result = None
        max_wait = 60
        waited = 0
        while waited < max_wait:
            time.sleep(2)
            waited += 2
            ai_res = http.get(f"{ai_url}/quiz/results/{submission_id}", timeout=10.0)
            if ai_res.status_code == 200:
                result = ai_res.json()
                break
            elif ai_res.status_code == 404:
                cprint(DIM, f"  Still processing... ({waited}s)")
            else:
                cprint(YELLOW, f"  Unexpected: {ai_res.status_code} {ai_res.text}")

        # ── 5. Display results ────────────────────────────────────────
        print()
        cprint(CYAN, HR)
        cprint(CYAN, f"  {BOLD}Your Results{RESET}{CYAN}")
        cprint(CYAN, HR)

        if result is None:
            print()
            cprint(YELLOW, "⚠  AI hasn't finished yet. Check back later with:")
            cprint(DIM, f"   {ai_url}/quiz/results/{submission_id}")
            sys.exit(0)

        # Personality type
        print()
        cprint(BOLD, f"  🧠  Personality Type: {result.get('personality_type', 'Unknown')}")

        # Scores
        solo = result.get("solo_social_score", "?")
        structured = result.get("structured_freeform_score", "?")
        print(f"     Solo↔Social:       {solo}/10")
        print(f"     Structured↔Free:   {structured}/10")

        # Profile body
        if result.get("profile_body"):
            print()
            cprint(BOLD, "  📝  Profile:")
            for line in result["profile_body"].split("\n"):
                print(f"     {line}")

        # Recommendations
        if result.get("recommendations"):
            print()
            cprint(BOLD, "  🎨  Recommended Activities:")
            for rank, activity in enumerate(result["recommendations"], 1):
                cprint(GREEN, f"     {rank}. {activity}")

            # Activity explanations
            if result.get("activity_explanations"):
                for expl in result.get("activity_explanations", []):
                    rank = expl.get("rank", "?")
                    activity = expl.get("activity", "?")
                    explanation = expl.get("explanation", "")
                    if explanation:
                        cprint(DIM, f"     → {explanation}")
                        print()

        # Closing
        if result.get("closing"):
            cprint(CYAN, f"  ✨  {result['closing']}")

        # Confidence
        conf = result.get("confidence_score")
        if conf is not None:
            print()
            cprint(DIM, f"  Confidence: {conf:.0%}")

        print()
        cprint(CYAN, HR)
        print()


# ── Entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Café Personality Quiz CLI")
    parser.add_argument("--quiz-url", default="http://localhost:8012", help="Quiz service URL")
    parser.add_argument("--ai-url", default="http://localhost:8006", help="AI service URL")
    args = parser.parse_args()

    print_banner()
    run_quiz(args.quiz_url, args.ai_url)
