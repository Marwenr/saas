/**
 * AI Controller - Handles OpenAI reference search requests
 */
import dotenv from 'dotenv';
import OpenAI from 'openai';

import AiChatCorrespondent from '../models/aiChatCorrespondent.model.js';
import { getUserFromToken } from '../utils/auth.js';

dotenv.config();

// Initialize OpenAI client
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.warn('WARNING: OPENAI_API_KEY is not set in environment variables');
}

const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
    })
  : null;

// Allowed brands for reference search
const allowedBrands = [
  'valeo',
  'lpr',
  'origine',
  'trw',
  'ate',
  'delphi',
  'ferodo',
];

/**
 * Get equivalent references for a given reference using OpenAI
 * @param {string} userReference - The reference to search for
 * @returns {Promise<Object>} - Response with equivalents
 */
async function getEquivalentReferences(userReference) {
  const systemPrompt = `
Tu es un assistant expert en pièces automobiles.

Quand je te donnes une référence, tu dois répondre uniquement par les références correspondantes pour les marques suivantes : ${allowedBrands.join(', ')}.

Format de la réponse en JSON :

{
  "requested_ref": "<référence donnée>",
  "equivalents": {
    "LPR": "<réf correspondante>",
    "Valeo": "<réf correspondante>",
    "TRW": "<réf correspondante>",
    "ATE": "<réf correspondante>",
    "Delphi": "<réf correspondante>",
    "Ferodo": "<réf correspondante>",
    "OEM": "<réf constructeur>"
  }
}

Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire.
`;

  const startTime = Date.now();

  if (!openai) {
    return {
      success: false,
      error: 'OpenAI API key is not configured',
      rawResponse: null,
      metadata: {
        model: 'gpt-3.5-turbo',
        tokensUsed: 0,
        responseTime: Date.now() - startTime,
      },
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Donne-moi les correspondances pour la référence : ${userReference}`,
        },
      ],
      temperature: 0,
    });

    const responseTime = Date.now() - startTime;
    const jsonText = response.choices[0].message.content;

    // Try to extract JSON from response (in case there's extra text)
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      data: parsedResponse,
      rawResponse: jsonText,
      metadata: {
        model: 'gpt-3.5-turbo',
        tokensUsed: response.usage?.total_tokens || 0,
        responseTime,
      },
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: err.message || 'Failed to get equivalent references',
      rawResponse: null,
      metadata: {
        model: 'gpt-3.5-turbo',
        tokensUsed: 0,
        responseTime,
      },
    };
  }
}

/**
 * Search for equivalent references
 * POST /api/ai/search-reference
 */
export async function searchReference(request, reply) {
  try {
    const { reference } = request.body;

    // Validate input
    if (!reference || !reference.trim()) {
      return reply.code(400).send({
        error: 'Reference is required',
      });
    }

    // Get user and company info
    const user = await getUserFromToken(request);
    if (!user) {
      return reply.code(401).send({
        error: 'User not found',
      });
    }

    if (!user.companyId) {
      return reply.code(400).send({
        error: 'User must be associated with a company',
      });
    }

    const trimmedReference = reference.trim();

    // Create pending record
    const chatRecord = await AiChatCorrespondent.create({
      companyId: user.companyId,
      userId: user._id,
      requestedReference: trimmedReference,
      status: 'pending',
    });

    // Call OpenAI API
    const result = await getEquivalentReferences(trimmedReference);

    // Update record with result
    if (result.success) {
      chatRecord.status = 'success';
      chatRecord.response = result.data;
      chatRecord.rawResponse = result.rawResponse;
      chatRecord.metadata = result.metadata;
    } else {
      chatRecord.status = 'error';
      chatRecord.error = result.error;
      chatRecord.rawResponse = result.rawResponse;
      chatRecord.metadata = result.metadata;
    }

    await chatRecord.save();

    // Return response
    if (result.success) {
      return reply.send({
        success: true,
        data: result.data,
        chatId: chatRecord._id,
      });
    } else {
      return reply.code(500).send({
        success: false,
        error: result.error,
        chatId: chatRecord._id,
      });
    }
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Get chat history for current user/company
 * GET /api/ai/history
 */
export async function getHistory(request, reply) {
  try {
    const { page = 1, limit = 20 } = request.query;

    // Get user and company info
    const user = await getUserFromToken(request);
    if (!user) {
      return reply.code(401).send({
        error: 'User not found',
      });
    }

    if (!user.companyId) {
      return reply.code(400).send({
        error: 'User must be associated with a company',
      });
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Get chat history for this company
    const [chats, total] = await Promise.all([
      AiChatCorrespondent.find({
        companyId: user.companyId,
      })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AiChatCorrespondent.countDocuments({
        companyId: user.companyId,
      }),
    ]);

    return reply.send({
      chats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Get a specific chat record
 * GET /api/ai/chat/:id
 */
export async function getChat(request, reply) {
  try {
    const { id } = request.params;

    // Get user and company info
    const user = await getUserFromToken(request);
    if (!user) {
      return reply.code(401).send({
        error: 'User not found',
      });
    }

    if (!user.companyId) {
      return reply.code(400).send({
        error: 'User must be associated with a company',
      });
    }

    // Get chat record
    const chat = await AiChatCorrespondent.findOne({
      _id: id,
      companyId: user.companyId,
    })
      .populate('userId', 'name email')
      .lean();

    if (!chat) {
      return reply.code(404).send({
        error: 'Chat record not found',
      });
    }

    return reply.send({
      chat,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
