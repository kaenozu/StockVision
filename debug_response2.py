"""
Debug script to check response attributes in CacheControlMiddleware
"""

import asyncio
from starlette.responses import Response, StreamingResponse


async def debug_response_attributes():
    # Create a normal Response
    response = Response(content='{"message": "Hello World"}', media_type="application/json")
    print(f"Normal Response type: {type(response)}")
    print(f"Normal Response headers: {response.headers}")
    
    # Check for body attributes
    print(f"Normal Response has 'body' attribute: {hasattr(response, 'body')}")
    if hasattr(response, 'body'):
        print(f"Normal Response 'body' attribute value: {response.body}")
        
    print(f"Normal Response has '_body' attribute: {hasattr(response, '_body')}")
    if hasattr(response, '_body'):
        print(f"Normal Response '_body' attribute value: {response._body}")
    
    print()
    
    # Create a StreamingResponse
    async def fake_video_streamer():
        for i in range(10):
            yield b"some fake video bytes"
    
    streaming_response = StreamingResponse(fake_video_streamer())
    print(f"StreamingResponse type: {type(streaming_response)}")
    print(f"StreamingResponse headers: {streaming_response.headers}")
    
    # Check for body attributes
    print(f"StreamingResponse has 'body' attribute: {hasattr(streaming_response, 'body')}")
    if hasattr(streaming_response, 'body'):
        print(f"StreamingResponse 'body' attribute value: {streaming_response.body}")
        
    print(f"StreamingResponse has '_body' attribute: {hasattr(streaming_response, '_body')}")
    if hasattr(streaming_response, '_body'):
        print(f"StreamingResponse '_body' attribute value: {streaming_response._body}")


if __name__ == "__main__":
    asyncio.run(debug_response_attributes())