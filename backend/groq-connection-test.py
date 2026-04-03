import os
from dotenv import load_dotenv
from groq import Groq

# Load .env from ai-recommendation-wrapper
load_dotenv(os.path.join(os.path.dirname(__file__), "wrappers", "ai-recommendation-wrapper", ".env"))

def test_groq_connection():
    """Test connection to Groq API with a simple chat completion."""
    
    # Initialize client using GROQ_API_KEY from environment
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    try:
        question = input("Enter your question for Groq: ").strip()
        if not question:
            question = "What is the meaning of life in one sentence?"
            print(f"No question provided. Using: '{question}'")
        
        print(f"\nAsking Groq: {question}\n" + "-"*50)
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": question}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        print(f"\nGroq's response: {response.choices[0].message.content}")
        print("\nGroq API connection test passed!")
        
    except Exception as e:
        print(f"Groq API connection test failed: {e}")

if __name__ == "__main__":
    test_groq_connection()
