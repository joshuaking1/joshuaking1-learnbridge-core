// supabase/functions/vectorize-document/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- Environment & API Keys ---
const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN');
const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY');
const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');

// Hugging Face model
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

function chunkText(text: string, maxChars = 800): string[] {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxChars) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// --- Individual Embedding Providers ---
async function embedWithHuggingFace(chunks: string[]): Promise<number[][]> {
  const res = await fetch(HF_MODEL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sentences: chunks })
  });
  if (!res.ok) throw new Error(`HF failed: ${await res.text()}`);
  return await res.json();
}

async function embedWithCohere(chunks: string[]): Promise<number[][]> {
  const apiKey = Deno.env.get("COHERE_API_KEY");
  const url = "https://api.cohere.ai/v1/embed";
  const batchSize = 96;
  const results: number[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        texts: batch,
        model: "embed-english-light-v3.0",
        input_type: "search_document"
      })
    });
    if (!res.ok) throw new Error(`Cohere error: ${await res.text()}`);
    const json = await res.json();
    results.push(...json.embeddings);
  }

  return results;
}

async function embedWithVoyage(chunks: string[]): Promise<number[][]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${VOYAGE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      input: chunks, 
      model: 'voyage-3-large',
      output_dimension: 384
    })
  });
  if (!res.ok) throw new Error(`Voyage failed: ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d: any) => d.embedding);
}

// --- Embedding Providers with Fallback ---
async function getEmbeddings(chunks: string[]): Promise<number[][]> {
  const providers = [
    () => embedWithHuggingFace(chunks),
    () => embedWithCohere(chunks),
    () => embedWithVoyage(chunks)
  ];

  // Try providers in order (HF → Cohere → Voyage)
  for (const provider of providers) {
    try {
      return await provider();
    } catch (err) {
      console.warn('Provider failed, trying next →', err.message);
    }
  }
  throw new Error('All embedding providers failed.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let documentId: string | null = null;
  try {
    const { documentId: docId, storagePath } = await req.json();
    documentId = docId;

    if (!documentId || !storagePath) {
      throw new Error('documentId and storagePath are required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update status to processing
    await supabaseAdmin
      .from('curriculum_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // 1. Get signed URL for PDF
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('curriculum-private')
      .createSignedUrl(storagePath, 60);
    if (urlError) throw urlError;

    // 2. Extract text with PDF.co (paid service)
    const pdfcoResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text-simple', {
      method: 'POST',
      headers: { 
        'x-api-key': Deno.env.get('PDFCO_API_KEY')!, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ url: urlData.signedUrl, inline: true })
    });
    
    if (!pdfcoResponse.ok) {
      throw new Error(`PDF.co Error: ${await pdfcoResponse.text()}`);
    }
    
    const pdfcoResult = await pdfcoResponse.json();
    const text = pdfcoResult.body;

    // 3. Chunk it
    const chunks = chunkText(text);

    // 4. Generate embeddings using fallback chain
    const embeddings = await getEmbeddings(chunks);

    if (!Array.isArray(embeddings) || chunks.length !== embeddings.length) {
      throw new Error('Mismatch between text chunks and generated embeddings.');
    }

    // 5. Insert vectors into knowledge_vectors table
    const vectorsToInsert = chunks.map((chunk, i) => ({
      source_document_id: documentId,
      content: chunk,
      embedding: embeddings[i]
    }));

    const { error: insertError } = await supabaseAdmin
      .from('knowledge_vectors')
      .insert(vectorsToInsert);
    if (insertError) throw insertError;

    // 6. Update status
    await supabaseAdmin
      .from('curriculum_documents')
      .update({ processing_status: 'completed' })
      .eq('id', documentId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ Parsed → ${chunks.length} chunks → stored with embeddings.`,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error(error);

    if (documentId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      await supabaseAdmin
        .from('curriculum_documents')
        .update({ 
          processing_status: 'failed', 
          error_message: error.message 
        })
        .eq('id', documentId);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});