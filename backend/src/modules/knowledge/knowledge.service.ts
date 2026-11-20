import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InferenceService } from '../inference/inference.service';

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category?: string;
  chunkCount: number;
  createdAt: Date;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docTitle: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

export interface Citation {
  docTitle: string;
  docId: string;
  chunkIndex: number;
  score: number;
  text: string;
}

export interface RagResponse {
  query: string;
  answer: string;
  model: string;
  citations: Citation[];
  latencyMs: number;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private documents: Map<string, KnowledgeDocument> = new Map();
  private chunks: DocumentChunk[] = [];

  constructor(private inferenceService: InferenceService) {
    this.seedDefaultKnowledge();
  }

  private async seedDefaultKnowledge() {
    // Seed initial enterprise knowledge documentation
    const seedDocs = [
      {
        title: 'YOYO Platform Architecture & Continuous Batching',
        content: `YOYO Cloud AI Platform is an enterprise-grade inference gateway built for sub-second latency and zero data retention.
It employs continuous batching via vLLM and PagedAttention, which dynamically batches incoming tokens without padding overhead.
This yields up to 4x throughput improvements and cuts Time-to-First-Token (TTFT) by over 60%.
All inference requests are scrubbed of PII and stream directly over encrypted SSE channels.`,
        category: 'Architecture',
      },
      {
        title: 'Local Docker LLM Privacy & Security Policy',
        content: `When operating in Local Docker mode, YOYO routes 100% of LLM completions and vector embeddings to a local containerized Ollama worker.
Zero external OpenAI keys or third-party cloud endpoints are contacted.
Model weights are stored persistently on dedicated storage (drive F:) to prevent root partition exhaustion.
All corporate knowledge, documents, and API payloads remain completely inside your private infrastructure.`,
        category: 'Security',
      },
    ];

    for (const doc of seedDocs) {
      try {
        await this.addDocument(doc.title, doc.content, doc.category);
      } catch (err: any) {
        this.logger.warn(`Could not pre-seed doc ${doc.title}: ${err.message}`);
      }
    }
  }

  private chunkText(text: string, chunkSize = 350): string[] {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const chunks: string[] = [];
    for (const p of paragraphs) {
      if (p.length <= chunkSize) {
        chunks.push(p);
      } else {
        // Sentence split
        const sentences = p.split(/(?<=[.?!])\s+/);
        let currentChunk = '';
        for (const sentence of sentences) {
          if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
          }
        }
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
      }
    }
    return chunks.length > 0 ? chunks : [text.trim()];
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async addDocument(title: string, content: string, category = 'General'): Promise<KnowledgeDocument> {
    const cleanTitle = title?.trim();
    const cleanContent = content?.trim();
    if (!cleanTitle || !cleanContent) {
      throw new BadRequestException('Document title and content cannot be empty');
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const textChunks = this.chunkText(cleanContent);

    // Compute embeddings for all chunks via local nomic-embed-text
    let embeddings: number[][] = [];
    try {
      const embResponse = await this.inferenceService.embeddings({
        model: 'nomic-embed-text:latest',
        input: textChunks,
      });
      embeddings = embResponse.data.map((d) => d.embedding);
    } catch (e: any) {
      this.logger.warn(`Failed embedding generation via nomic-embed-text: ${e.message}; using fallback representation.`);
      embeddings = textChunks.map((c) => this.generateFallbackEmbedding(c));
    }

    const docChunks: DocumentChunk[] = textChunks.map((text, idx) => ({
      id: `${docId}_chunk_${idx}`,
      docId,
      docTitle: cleanTitle,
      chunkIndex: idx + 1,
      text,
      embedding: embeddings[idx] || this.generateFallbackEmbedding(text),
    }));

    const doc: KnowledgeDocument = {
      id: docId,
      title: cleanTitle,
      content: cleanContent,
      category,
      chunkCount: docChunks.length,
      createdAt: new Date(),
    };

    this.documents.set(docId, doc);
    this.chunks.push(...docChunks);
    this.logger.log(`Indexed document '${cleanTitle}' with ${docChunks.length} chunks`);
    return doc;
  }

  private generateFallbackEmbedding(text: string, dim = 64): number[] {
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      vec[i % dim] += (charCode % 31) - 15;
    }
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }

  listDocuments(): KnowledgeDocument[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  deleteDocument(id: string): boolean {
    if (!this.documents.has(id)) {
      throw new NotFoundException(`Document with id '${id}' not found`);
    }
    this.documents.delete(id);
    this.chunks = this.chunks.filter((c) => c.docId !== id);
    return true;
  }

  async queryKnowledge(
    queryText: string,
    topK = 3,
    model = 'llama3.2:1b'
  ): Promise<RagResponse> {
    const startTime = Date.now();
    const cleanQuery = queryText?.trim();
    if (!cleanQuery) {
      throw new BadRequestException('Query cannot be empty');
    }

    if (this.chunks.length === 0) {
      return {
        query: cleanQuery,
        answer: 'No knowledge documents have been indexed yet. Please upload documents first.',
        model,
        citations: [],
        latencyMs: Date.now() - startTime,
      };
    }

    // 1. Generate query embedding
    let queryEmbedding: number[];
    try {
      const embRes = await this.inferenceService.embeddings({
        model: 'nomic-embed-text:latest',
        input: [cleanQuery],
      });
      queryEmbedding = embRes.data[0].embedding;
    } catch {
      queryEmbedding = this.generateFallbackEmbedding(cleanQuery);
    }

    // 2. Rank chunks by cosine similarity
    const scoredChunks = this.chunks.map((chunk) => ({
      ...chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, Math.min(topK, scoredChunks.length));

    // 3. Assemble Grounded Context Prompt
    const contextText = topChunks
      .map(
        (c, idx) =>
          `[Source ${idx + 1}: ${c.docTitle} (Chunk ${c.chunkIndex})]\n${c.text}`
      )
      .join('\n\n');

    const systemPrompt = `You are YOYO AI Knowledge Assistant. You answer questions accurately and concisely using ONLY the provided verified context excerpts.
Rules:
1. Ground your answer in the provided context excerpts.
2. If the context does not contain the answer, state honestly: "The provided knowledge base does not contain sufficient details to answer this query."
3. Cite your sources clearly using [Source 1], [Source 2], etc.`;

    const userPrompt = `CONTEXT EXCERPTS:
${contextText}

QUESTION:
${cleanQuery}`;

    // 4. Generate local completion
    let answerText = '';
    try {
      const completion = await this.inferenceService.chatCompletion({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 512,
      });
      const rawContent = completion.choices[0]?.message?.content;
      answerText = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent) || 'No response generated.';
    } catch (err: any) {
      answerText = `Error querying inference engine: ${err.message}`;
    }

    const latencyMs = Date.now() - startTime;
    return {
      query: cleanQuery,
      answer: answerText,
      model,
      citations: topChunks.map((c) => ({
        docId: c.docId,
        docTitle: c.docTitle,
        chunkIndex: c.chunkIndex,
        score: Math.round(c.score * 1000) / 1000,
        text: c.text,
      })),
      latencyMs,
    };
  }
}
