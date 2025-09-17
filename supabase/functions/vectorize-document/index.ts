// supabase/functions/vectorize-document/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2.2.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Environment Variables ---
const PDFCO_API_KEY = Deno.env.get('PDFCO_API_KEY');
const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const PINECONE_INDEX_NAME = 'learnbridge-curriculum';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const HF_API_KEY = Deno.env.get('HUGGINGFACE_TOKEN');
const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY');
const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');

if (!PDFCO_API_KEY || !PINECONE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables.');
}

// --- Initialize Pinecone ---
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);

// --- Supabase Admin Client ---
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Helper: Retry with exponential backoff ---
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 2000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
  }
  throw new Error("API failed after retries");
}

// --- Individual Embedding Providers ---
async function getHuggingFaceEmbeddingsSingle(text: string): Promise<number[]> {
  const resp = await fetchWithRetry("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  });

  return await resp.json();
}

async function getCohereEmbeddingsSingle(text: string): Promise<number[]> {
  const resp = await fetchWithRetry("https://api.cohere.ai/v1/embed", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${COHERE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "embed-english-light-v3.0",
      texts: [text],
    }),
  });

  const data = await resp.json();
  return data.embeddings[0];
}

async function getVoyageEmbeddingsSingle(text: string): Promise<number[]> {
  const resp = await fetchWithRetry("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "voyage-2",
      input: text,
    }),
  });

  const data = await resp.json();
  return data.data[0].embedding;
}

// --- Helper: call Pinecone Inference REST API ---
async function getPineconeEmbeddings(chunks: string[]): Promise<number[][]> {
  const response = await fetch("https://api.pinecone.io/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": PINECONE_API_KEY,
    },
    body: JSON.stringify({
      model: "llama-text-embed-v2",
      inputs: chunks,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pinecone Inference Error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.values);
}

// --- Failover Wrapper ---
async function getEmbeddingsWithFailover(text: string): Promise<number[]> {
  try {
    return await getHuggingFaceEmbeddingsSingle(text);
  } catch (err) {
    console.error("Hugging Face failed:", err.message);
  }

  try {
    return await getCohereEmbeddingsSingle(text);
  } catch (err) {
    console.error("Cohere failed:", err.message);
  }

  try {
    return await getVoyageEmbeddingsSingle(text);
  } catch (err) {
    console.error("Voyage failed:", err.message);
  }

  throw new Error("All embedding providers failed");
}

// --- Helper: Hugging Face Embeddings Fallback (Batch Processing) ---
async function getHuggingFaceEmbeddings(chunks: string[]): Promise<number[][]> {
  const batchSize = 20; // smaller to avoid timeout
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    // Process each chunk in the batch with failover
    const batchEmbeddings: number[][] = [];
    for (const chunk of batch) {
      const embedding = await getEmbeddingsWithFailover(chunk);
      batchEmbeddings.push(embedding);
    }
    
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let documentId: string | null = null;

  try {
    const body = await req.json();
    documentId = body.documentId;
    const storagePath = body.storagePath;

    if (!documentId || !storagePath) {
      throw new Error("documentId and storagePath are required.");
    }

    // Update status -> processing
    await supabaseAdmin
      .from('curriculum_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // 1. Get Signed URL
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('curriculum-private')
      .createSignedUrl(storagePath, 60);

    if (urlError) throw urlError;

    // 2. Extract PDF text with PDF.co
    const pdfcoResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text-simple', {
      method: 'POST',
      headers: { 
        'x-api-key': PDFCO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: urlData.signedUrl, inline: true })
    });

    if (!pdfcoResponse.ok) {
      throw new Error(`PDF.co Error: ${await pdfcoResponse.text()}`);
    }

    const pdfcoResult = await pdfcoResponse.json();
    const textContent = pdfcoResult.body;

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No text content extracted from PDF');
    }

    // 3. Chunk text
    const chunks = textContent
      .split('\n\n')
      .filter((c: string) => c.trim().length > 20);

    if (chunks.length === 0) {
      throw new Error('No valid text chunks found in document');
    }

    // 4. Get embeddings
    let embeddings: number[][] = [];
    try {
      embeddings = await getPineconeEmbeddings(chunks);
    } catch (err) {
      console.warn("Pinecone inference failed, falling back to Hugging Face:", err.message);

      embeddings = await getHuggingFaceEmbeddings(chunks);
      console.log(`Generated ${embeddings.length} embeddings with Hugging Face`);
    }

    // 5. Upsert into Pinecone
    const vectors = chunks.map((chunk, i) => ({
      id: `${documentId}_chunk_${i}`,
      values: embeddings[i],
      metadata: { documentId, text: chunk },
    }));

    await pineconeIndex.upsert(vectors);

    // Update status -> completed
    await supabaseAdmin
      .from('curriculum_documents')
      .update({ processing_status: 'completed' })
      .eq('id', documentId);

    return new Response(
      JSON.stringify({ success: true, message: `Indexed ${chunks.length} chunks.` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);

    if (documentId) {
      await supabaseAdmin
        .from('curriculum_documents')
        .update({ processing_status: 'failed', error_message: error.message })
        .eq('id', documentId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
