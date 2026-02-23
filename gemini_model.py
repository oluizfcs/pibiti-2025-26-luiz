from google import genai
from google.genai import types
import constants

class GeminiModel:
    def __init__(self):
        self.client = genai.Client(api_key=constants.GEMINI_API_KEY)
        self.model = "gemini-2.5-flash"
        
    def generate(self, prompt):
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                ],
            ),
        ]
        
        generate_content_config = types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=800,
            thinking_config=types.ThinkingConfig(
                thinking_budget=0,
            ),
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
            config=generate_content_config,
        )
        
        return response.text
