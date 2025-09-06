"""
Debug script to check response attributes in CacheControlMiddleware
"""

from fastapi import FastAPI
from starlette.testclient import TestClient
from starlette.responses import Response

app = FastAPI()

@app.get("/debug")
async def debug_endpoint():
    return {"message": "Hello World"}

def debug_response_attributes():
    client = TestClient(app)
    response = client.get("/debug")
    
    print(f"Response type: {type(response)}")
    print(f"Response headers: {response.headers}")
    print(f"Response content: {response.content}")
    
    # Check for body attributes
    print(f"Has 'body' attribute: {hasattr(response, 'body')}")
    if hasattr(response, 'body'):
        print(f"'body' attribute value: {response.body}")
        
    print(f"Has '_body' attribute: {hasattr(response, '_body')}")
    if hasattr(response, '_body'):
        print(f"'_body' attribute value: {response._body}")

if __name__ == "__main__":
    debug_response_attributes()