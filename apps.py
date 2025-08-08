# from flask import Flask, request, jsonify
# import json
# import re
# from flask_cors import CORS
# import language_tool_python

# app = Flask(__name__)
# CORS(app)

# with open("abbreviations.json", "r") as f:
#     abbreviation_dict = json.load(f)

# reverse_abbreviation_dict = {v: k for k, v in abbreviation_dict.items()}

# tool = language_tool_python.LanguageTool('en-US')

# def expand_abbreviations(text, custom_abbr):
#     combined_abbr_dict = {**abbreviation_dict, **custom_abbr}
#     words = text.split()
#     expanded_words = []
#     for word in words:
#         processed_word = word.lower()
#         processed_word = re.sub(r'[^a-z0-9]', '', processed_word)
#         if processed_word in combined_abbr_dict:
#             expanded_words.append(combined_abbr_dict[processed_word])
#         else:
#             expanded_words.append(word)
#     return ' '.join(expanded_words)

# def abbreviate_full_text(text, custom_abbr):
#     combined_reverse_abbr_dict = {v: k for k, v in {**abbreviation_dict, **custom_abbr}.items()}
#     words = text.split()
#     abbreviated_words = []
#     for word in words:
#         processed_word = word.lower()
#         if processed_word in combined_reverse_abbr_dict:
#             abbreviated_words.append(combined_reverse_abbr_dict[processed_word])
#         else:
#             abbreviated_words.append(word)
#     return ' '.join(abbreviated_words)

# def grammar_check_feedback(text):
#     matches = tool.check(text)
#     feedback_messages = []
#     if not matches:
#         feedback_messages.append("No grammar or spelling errors found.")
#     else:
#         for match in matches:
#             message = f"Issue: {match.message}. Suggestion(s): {', '.join(match.replacements)}"
#             feedback_messages.append(message)
#     return feedback_messages

# @app.route('/')
# def home():
#     return "Abbrevify API is running! 🚀"

# @app.route('/process_text', methods=['POST', 'OPTIONS'])
# def process_text():
#     if request.method == 'OPTIONS':
#         return '', 200

#     try:
#         data = request.json
#         text = data.get('text', '')
#         action = data.get('action', '')
#         mode = data.get('mode', 'sms-to-full')
#         custom_abbreviations = data.get('custom_abbreviations', {})

#         if not text or not action:
#             return jsonify({'error': 'Missing text or action in request'}), 400

#         if action == 'convert':
#             if mode == 'sms-to-full':
#                 processed_text = expand_abbreviations(text, custom_abbreviations)
#             elif mode == 'full-to-sms':
#                 processed_text = abbreviate_full_text(text, custom_abbreviations)
#             else:
#                 return jsonify({'error': f'Invalid mode: {mode}'}), 400
#             return jsonify({'processed_text': processed_text})
            
#         elif action == 'grammar_check':
#             feedback = grammar_check_feedback(text)
#             return jsonify({'feedback': feedback})

#         else:
#             return jsonify({'error': f'Invalid action: {action}'}), 400

#     except Exception as e:
#         print(f"An error occurred: {e}")
#         return jsonify({'error': 'An internal server error occurred'}), 500

# if __name__ == '__main__':
#     app.run(debug=True)
