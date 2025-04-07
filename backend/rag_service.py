from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from rag_engine import get_rag_response
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/rag")
async def rag_chat(request: Request):
    try:
        body = await request.json()
        logger.info(f"Received request body: {body}")
        
        query = body.get("message")
        if not query:
            raise HTTPException(status_code=400, detail="No message provided in request")
            
        logger.info(f"Processing query: {query}")
        response = get_rag_response(query)
        logger.info(f"Generated response: {response}")
        
        if not response:
            return {"answer": "I apologize, but I couldn't generate a response. Please try again."}
            
        return {"answer": response}
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
