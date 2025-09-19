import os
from flask import Flask, request, jsonify
import json
import requests
import time
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)


API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"


with open("abbreviations.json", "r") as f:
    abbreviation_dict = json.load(f)

gemini_cache = {}


def call_gemini_api_with_retry(payload, is_structured_response=False):
    retries = 0
    max_retries = 3
    base_delay = 1.0

    while retries < max_retries:
        try:
            headers = {'Content-Type': 'application/json'}
            url = f"{API_URL}?key={API_KEY}"
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()

            result = response.json()
            print("Gemini raw response:", result)  # Debugging

            if (result.get('candidates')
                and result['candidates'][0].get('content')
                and result['candidates'][0]['content'].get('parts')):
                text_part = result['candidates'][0]['content']['parts'][0]['text']
                if is_structured_response:
                    return json.loads(text_part)
                else:
                    return text_part
            else:
                return None
        except Exception as e:
            print(f"Error in Gemini API: {e}")

        retries += 1
        delay = base_delay * (2 ** retries)
        print(f"Retrying in {delay} seconds...")
        time.sleep(delay)

    return None

def expand_abbreviations(text):
    """Convert SMS-style text into full English using Gemini only."""
    if text in gemini_cache:
        return gemini_cache[text]

    prompt = (
        "You are an SMS abbreviation converter. "
        "Expand the following SMS/text message into full, normal English sentences. "
        "Do not add explanations, just return the converted text.\n\n"
        f"{text}"
    )

    payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    expanded_text = call_gemini_api_with_retry(payload)

    if expanded_text:
        expanded_text = expanded_text.strip()
        gemini_cache[text] = expanded_text
        return expanded_text
    return text


def abbreviate_full_text(text):
    """Convert full English text into SMS-style abbreviations using Gemini only."""
    if text in gemini_cache:
        return gemini_cache[text]

    prompt = (
        "You are an SMS abbreviation generator. "
        "Convert the following normal English sentence into SMS-style text "
        "using common abbreviations (like 'u' for 'you', '2' for 'to', 'brb' for 'be right back'). "
        "Do not add explanations, just return the SMS text.\n\n"
        f"{text}"
    )

    payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    sms_text = call_gemini_api_with_retry(payload)

    if sms_text:
        sms_text = sms_text.strip()
        gemini_cache[text] = sms_text
        return sms_text
    return text


def grammar_check_feedback(text):
    """Check grammar/spelling using Gemini structured output."""
    prompt = (
        f"Check the grammar and spelling of the following text and provide a list of corrections. "
        f"For each correction, list the issue, the original text, and the suggested replacement. "
        f"Be concise and only list the issues. Text: '{text}'"
    )

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "issue": {"type": "STRING"},
                        "original_text": {"type": "STRING"},
                        "suggestion": {"type": "STRING"}
                    }
                }
            }
        }
    }

    corrections = call_gemini_api_with_retry(payload, is_structured_response=True)
    feedback_messages = []
    if corrections:
        for correction in corrections:
            message = (
                f"Issue: {correction.get('issue', '')}. "
                f"Original: '{correction.get('original_text', '')}'. "
                f"Suggestion: '{correction.get('suggestion', '')}'"
            )
            feedback_messages.append(message)
    else:
        feedback_messages.append("No grammar or spelling errors found.")

    return feedback_messages

def plagiarism_check_feedback(text):
    """Check for plagiarism using Gemini and return a percentage."""
    prompt = (
        f"Analyze the following text for plagiarism. "
        f"Estimate the percentage of the text that is likely plagiarized (0-100%). "
        f"Return your answer in JSON format as: {{'percentage': <number>, 'explanation': <string>}}. "
        f"Text: '{text}'"
    )

    payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    result = call_gemini_api_with_retry(payload)
    if not result:
        return {'percentage': None, 'explanation': "Unable to determine plagiarism status."}

    # Try to extract JSON from Gemini's output
    import re
    match = re.search(r'\{.*\}', result, re.DOTALL)
    if match:
        json_str = match.group(0)
        try:
            parsed = json.loads(json_str)
            percentage = parsed.get('percentage', None)
            explanation = parsed.get('explanation', '')
            return {'percentage': percentage, 'explanation': explanation}
        except Exception:
            pass
    # Fallback: return raw result as explanation
    return {'percentage': None, 'explanation': result.strip()}

@app.route('/')
def home():
    return "Abbrevify API is running! 🚀"


@app.route('/process_text', methods=['POST', 'OPTIONS'])
def process_text():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.json
        text = data.get('text', '')
        action = data.get('action', '')
        mode = data.get('mode', 'sms-to-full')

        if not text or not action:
            return jsonify({'error': 'Missing text or action in request'}), 400

        if action == 'convert':
            if mode == 'sms-to-full':
                processed_text = expand_abbreviations(text)
            elif mode == 'full-to-sms':
                processed_text = abbreviate_full_text(text)
            else:
                return jsonify({'error': f'Invalid mode: {mode}'}), 400
            return jsonify({'processed_text': processed_text})

        elif action == 'grammar_check':
            feedback = grammar_check_feedback(text)
            return jsonify({'feedback': feedback})
        elif action == 'plagiarism_check':
                result = plagiarism_check_feedback(text)
                return jsonify(result)

        else:
            return jsonify({'error': f'Invalid action: {action}'}), 400

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500


if __name__ == '__main__':
    
    print("Loaded API_KEY:", "FOUND " if API_KEY else "MISSING ")
    app.run(debug=True)
