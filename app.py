import os, json, re, time, requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="static")
CORS(app)

API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"

gemini_cache = {}


def call_gemini_api(prompt):
    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    try:
        response = requests.post(f"{API_URL}?key={API_KEY}", headers=headers, json=payload, timeout=45)
        response.raise_for_status()
        data = response.json()
        if data.get("candidates"):
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print("Gemini API error:", e)
    return None


def expand_abbreviations(text):
    if text in gemini_cache:
        return gemini_cache[text]
    prompt = (
        "You are an SMS abbreviation converter. "
        "Expand the following SMS/text message into full, normal English sentences. "
        "Do not add explanations, just return the converted text. "
        "Preserve all punctuation marks (?, !, .) exactly as they are in the input. "
        "Do not add any new punctuation. "
        "Convert only word-by-word without adding extra words.\n\n"
        f"Text: {text}"
    )
    result = call_gemini_api(prompt)
    if result:
        gemini_cache[text] = result
        return result
    return text


def abbreviate_full_text(text):
    if text in gemini_cache:
        return gemini_cache[text]
    prompt = (
        "You are an SMS abbreviation generator. "
        "Convert the following English sentence into SMS-style text using common abbreviations "
        "(like 'u' for 'you', '2' for 'to', 'brb' for 'be right back'). "
        "Do not add explanations, just return the SMS text. "
        "Preserve all punctuation marks (?, !, .) exactly as they are in the input. "
        "Do not add any new punctuation. "
        "Convert only word-by-word without adding extra words.\n\n"
        f"Text: {text}"
    )
    result = call_gemini_api(prompt)
    if result:
        gemini_cache[text] = result
        return result
    return text


def grammar_check_feedback(text):
    prompt = (
        "You are a grammar and spelling checker. "
        "Analyze the text, list all grammar or spelling issues, and also provide the corrected full sentence at the end. "
        "Respond strictly in JSON format as an object like this:\n"
        "{"
        "\"issues\": [{\"issue\": \"string\", \"original\": \"string\", \"suggestion\": \"string\"}], "
        "\"corrected_text\": \"string\""
        "}\n"
        "If there are no issues, set 'issues' as an empty array and 'corrected_text' should contain the corrected sentence.\n\n"
        f"Text: {text}"
    )

    raw = call_gemini_api(prompt)
    if not raw:
        return ["Error: No response from Gemini."]

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            issues = parsed.get("issues", [])
            corrected = parsed.get("corrected_text", "")

            result_lines = []
            if issues:
                for p in issues:
                    result_lines.append(
                        f"Issue: {p.get('issue','')}. Original: {p.get('original','')}. Suggestion: {p.get('suggestion','')}"
                    )
            else:
                result_lines.append("No grammar issues found.")

            if corrected:
                result_lines.append(f"\nCorrect sentence: {corrected}")

            return result_lines

        except Exception as e:
            print("Grammar JSON parse error:", e)

    return [line.strip(" -•") for line in raw.split("\n") if line.strip()] or ["No grammar issues found."]



def plagiarism_check_feedback(text):
    prompt = (
        "Estimate the plagiarism percentage (0–100%) for the text and provide one brief reason. "
        "Respond strictly as JSON like this:\n"
        "{\"percentage\": number, \"explanation\": \"string\"}\n\n"
        f"Text: {text}"
    )

    raw = call_gemini_api(prompt)
    if not raw:
        return {"percentage": None, "explanation": "Error: No response from Gemini."}

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            return {
                "percentage": parsed.get("percentage"),
                "explanation": parsed.get("explanation", "")
            }
        except Exception as e:
            print("Plagiarism JSON parse error:", e)

    percent_match = re.search(r"(\d{1,3})%", raw)
    percentage = int(percent_match.group(1)) if percent_match else None
    explanation = re.sub(r"(\d{1,3})%", "", raw).strip()
    return {"percentage": percentage, "explanation": explanation or "No clear explanation provided."}


@app.route("/")
def serve_frontend():
    return app.send_static_file("index.html")


@app.route("/process_text", methods=["POST", "OPTIONS"])
def process_text():
    if request.method == "OPTIONS":
        return "", 200

    try:
        data = request.json
        text = data.get("text", "")
        action = data.get("action", "")
        mode = data.get("mode", "sms-to-full")

        if not text or not action:
            return jsonify({"error": "Missing text or action"}), 400

        if action == "convert":
            if mode == "sms-to-full":
                result = expand_abbreviations(text)
            elif mode == "full-to-sms":
                result = abbreviate_full_text(text)
            else:
                return jsonify({"error": f"Invalid mode: {mode}"}), 400
            return jsonify({"processed_text": result})

        elif action == "grammar_check":
            feedback = grammar_check_feedback(text)
            return jsonify({"feedback": feedback})

        elif action == "plagiarism_check":
            result = plagiarism_check_feedback(text)
            return jsonify(result)

        else:
            return jsonify({"error": "Invalid action"}), 400

    except Exception as e:
        print("Server error:", e)
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    print("Loaded GEMINI_API_KEY:", "FOUND" if API_KEY else "MISSING")
    app.run(debug=True)
