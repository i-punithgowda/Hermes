from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.llms import Ollama
from utils.pdf_loader import load_and_split_pdf
from langchain.prompts import PromptTemplate
import os
import numpy as np

# Ensure data directory exists
data_dir = os.path.join(os.path.dirname(__file__), "data")
pdf_path = os.path.join(data_dir, "Test1.pdf")

if not os.path.exists(pdf_path):
    raise FileNotFoundError(f"PDF file not found at {pdf_path}")

print(f"Loading PDF from: {pdf_path}")

# Load + split
try:
    chunks = load_and_split_pdf(pdf_path)
    print(f"Successfully loaded {len(chunks)} chunks from PDF")
except Exception as e:
    print(f"Error loading PDF: {str(e)}")
    raise

# Embeddings
try:
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )
    print("Successfully initialized embeddings model")
except Exception as e:
    print(f"Error initializing embeddings: {str(e)}")
    raise

# VectorDB with better search configuration
try:
    vectordb = Chroma.from_documents(
        chunks,
        embeddings,
        collection_metadata={"hnsw:space": "cosine"}
    )
    print("Successfully created vector database")
except Exception as e:
    print(f"Error creating vector database: {str(e)}")
    raise

# LLM
try:
    llm = Ollama(model="phi3")
    print("Successfully initialized Ollama LLM")
except Exception as e:
    print(f"Error initializing Ollama: {str(e)}")
    raise

# Improved prompt with better context utilization
custom_prompt = PromptTemplate(
    template="""
You are a helpful and concise assistant. You will be provided with a question and some context.

Instructions:
1. ONLY use the provided context if it contains RELEVANT information to answer the question.
2. If the context is NOT relevant, IGNORE it and answer the question using your own knowledge.
3. Do NOT generate creative or fictional answers.
4. Do NOT attempt to justify or infer using the context if it's unrelated.
5. Keep your response short and factual.

Context:
{context}

Question:
{question}

Answer:
""",
    input_variables=["context", "question"]
)

# Create the QA chain with basic retriever
try:
    retriever = vectordb.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 3}  # Retrieve top 3 documents for comparison
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type_kwargs={"prompt": custom_prompt}
    )
    print("Successfully created RAG chain")
except Exception as e:
    print(f"Error creating RAG chain: {str(e)}")
    raise

def calculate_relevance_score(score):
    """Convert cosine distance to a relevance percentage with exponential decay"""
    # Using exponential decay to make the scoring more strict
    return 100 * np.exp(-3 * score)  # Changed from -5 to -3 for less aggressive decay

def get_rag_response(query: str) -> str:
    if not query or not query.strip():
        return "Please provide a valid question."
    
    print(f"\nProcessing query: {query}")
    try:
        # Get relevant documents with scores
        docs_and_scores = vectordb.similarity_search_with_score(query, k=3)
        
        # Print context and relevance scores
        print("\nRetrieved documents with relevance scores:")
        filtered_docs = []
        all_scores = []
        
        # First pass: calculate all scores
        print("\nRaw similarity scores (lower is better):")
        for doc, score in docs_and_scores:
            print(f"Raw score: {score:.4f}")
            relevance_score = calculate_relevance_score(score)
            all_scores.append(relevance_score)
            print(f"Converted to relevance score: {relevance_score:.2f}%")
            
        # Calculate statistics for better filtering
        if all_scores:
            mean_score = np.mean(all_scores)
            std_score = np.std(all_scores) if len(all_scores) > 1 else 0
            print(f"\nScore Statistics:")
            print(f"Mean relevance: {mean_score:.2f}%")
            print(f"Standard deviation: {std_score:.2f}")
            
            # Dynamic threshold: stricter when scores are low or highly variable
            base_threshold = 60  # Lowered from 70 to 60
            if mean_score < 40 or std_score > 20:  # Lowered from 50 to 40
                threshold = base_threshold + 10
                print(f"Using stricter threshold due to low mean score or high variance")
            else:
                threshold = base_threshold
            print(f"Selected threshold: {threshold}%")
        else:
            threshold = 60  # Lowered default threshold
        
        # Second pass: filter and collect documents
        print("\nDocument Analysis:")
        for (doc, score), relevance_score in zip(docs_and_scores, all_scores):
            print(f"\nDocument Relevance: {relevance_score:.2f}%")
            print("=" * 50)
            print(doc.page_content)
            print("=" * 50)
            print(f"Raw similarity score: {score:.4f}")
            print(f"Converted relevance score: {relevance_score:.2f}%")
            
            if relevance_score >= threshold:
                filtered_docs.append(doc)
                print(f"✓ Document accepted (threshold: {threshold}%)")
            else:
                print(f"✗ Document rejected (threshold: {threshold}%)")
                print(f"  Reason: Score {relevance_score:.2f}% < threshold {threshold}%")
        
        if not filtered_docs:
            print("\nNo documents passed the relevance threshold")
            print(f"All scores were below the threshold of {threshold}%")
            print("Highest relevance score was: {:.2f}%".format(max(all_scores) if all_scores else 0))
            # Generate response without context
            response = qa_chain.invoke({"query": query, "context": ""})
            if isinstance(response, dict):
                response = response.get("result", "")
            return response or "I don't have any relevant information from the provided documents to answer your question. Let me answer based on my general knowledge."
        
        # Combine filtered documents into context
        context = "\n\n".join(doc.page_content for doc in filtered_docs)
        print(f"\nNumber of documents used for context: {len(filtered_docs)}")
        
        # Generate response using filtered context
        response = qa_chain.invoke({"query": query, "context": context})
        
        if isinstance(response, dict):
            response = response.get("result", "")
        
        print(f"\nGenerated response: {response}")
        
        if not response or not response.strip():
            return "I apologize, but I couldn't generate a meaningful response. Please try rephrasing your question."
        return response
    except Exception as e:
        error_msg = f"Error processing query: {str(e)}"
        print(error_msg)
        return error_msg
