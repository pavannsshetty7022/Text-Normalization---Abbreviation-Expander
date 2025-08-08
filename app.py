import os
from flask import Flask, request, jsonify
import json
import re
import requests
import time
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

API_KEY = "AIzaSyBkR5-y6E2TG0oxyEzg8D6r-QZw9aJM5Y8"
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent"

with open("abbreviations.json", "r") as f:
    abbreviation_dict = json.load(f)

reverse_abbreviation_dict = {v: k for k, v in abbreviation_dict.items()}

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
            if result.get('candidates') and result['candidates'][0].get('content') and result['candidates'][0]['content'].get('parts'):
                text_part = result['candidates'][0]['content']['parts'][0]['text']
                if is_structured_response:
                    return json.loads(text_part)
                else:
                    return text_part
            else:
                return None
        except requests.exceptions.HTTPError as errh:
            print(f"Http Error: {errh}")
        except requests.exceptions.ConnectionError as errc:
            print(f"Error Connecting: {errc}")
        except requests.exceptions.Timeout as errt:
            print(f"Timeout Error: {errt}")
        except requests.exceptions.RequestException as err:
            print(f"An unexpected error occurred: {err}")
        except json.JSONDecodeError:
            print("Error decoding JSON from API response.")
        
        retries += 1
        delay = base_delay * (2 ** retries)
        print(f"Retrying in {delay} seconds...")
        time.sleep(delay)

    return None

def expand_abbreviations(text, custom_abbr):
    combined_abbr_dict = {**abbreviation_dict, **custom_abbr}
    words = text.split()
    expanded_words = []
    for word in words:
        processed_word = word.lower()
        processed_word = re.sub(r'[^a-z0-9]', '', processed_word)
        
        if processed_word in combined_abbr_dict:
            expanded_words.append(combined_abbr_dict[processed_word])
        else:
            prompt = f"Expand the SMS abbreviation to its full text. Only provide the full text. Abbreviation: '{word}'"
            payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
            expanded_word_from_api = call_gemini_api_with_retry(payload)
            if expanded_word_from_api:
                expanded_words.append(expanded_word_from_api.strip())
            else:
                expanded_words.append(word)
    return ' '.join(expanded_words)

def abbreviate_full_text(text, custom_abbr):
    combined_reverse_abbr_dict = {v: k for k, v in {**abbreviation_dict, **custom_abbr}.items()}
    words = text.split()
    abbreviated_words = []
    for word in words:
        processed_word = word.lower()
        if processed_word in combined_reverse_abbr_dict:
            abbreviated_words.append(combined_reverse_abbr_dict[processed_word])
        else:
            abbreviated_words.append(word)
    return ' '.join(abbreviated_words)

def grammar_check_feedback(text):
    prompt = f"Check the grammar and spelling of the following text and provide a list of corrections. For each correction, list the issue, the original text, and the suggested replacement. Be concise and only list the issues. Text: '{text}'"
    
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
            message = f"Issue: {correction.get('issue', '')}. Original: '{correction.get('original_text', '')}'. Suggestion: '{correction.get('suggestion', '')}'"
            feedback_messages.append(message)
    else:
        feedback_messages.append("No grammar or spelling errors found.")
        
    return feedback_messages

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
        custom_abbreviations = data.get('custom_abbreviations', {})

        if not text or not action:
            return jsonify({'error': 'Missing text or action in request'}), 400

        if action == 'convert':
            if mode == 'sms-to-full':
                processed_text = expand_abbreviations(text, custom_abbreviations)
            elif mode == 'full-to-sms':
                processed_text = abbreviate_full_text(text, custom_abbreviations)
            else:
                return jsonify({'error': f'Invalid mode: {mode}'}), 400
            return jsonify({'processed_text': processed_text})
            
        elif action == 'grammar_check':
            feedback = grammar_check_feedback(text)
            return jsonify({'feedback': feedback})

        else:
            return jsonify({'error': f'Invalid action: {action}'}), 400

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

if __name__ == '__main__':
    app.run(debug=True)
