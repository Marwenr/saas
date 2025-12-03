/**
 * AI Chat Correspondent model
 * Stores AI-powered reference search queries and results
 */
import mongoose from 'mongoose';

const aiChatCorrespondentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // User's input reference
    requestedReference: {
      type: String,
      required: true,
      trim: true,
    },
    // OpenAI response data
    response: {
      type: {
        requested_ref: String,
        equivalents: {
          LPR: String,
          Valeo: String,
          TRW: String,
          ATE: String,
          Delphi: String,
          Ferodo: String,
          OEM: String,
        },
      },
      required: false,
    },
    // Raw OpenAI response text (in case JSON parsing fails)
    rawResponse: {
      type: String,
      required: false,
    },
    // Error information if request failed
    error: {
      type: String,
      required: false,
    },
    // Request status
    status: {
      type: String,
      enum: ['success', 'error', 'pending'],
      default: 'pending',
    },
    // Additional metadata
    metadata: {
      type: {
        model: String, // OpenAI model used
        tokensUsed: Number, // Tokens consumed
        responseTime: Number, // Response time in ms
      },
      required: false,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
aiChatCorrespondentSchema.index({ companyId: 1, createdAt: -1 });
aiChatCorrespondentSchema.index({ userId: 1, createdAt: -1 });
aiChatCorrespondentSchema.index({ companyId: 1, userId: 1, createdAt: -1 });
aiChatCorrespondentSchema.index({ requestedReference: 1 });

// Make model idempotent
export const AiChatCorrespondent =
  mongoose.models.AiChatCorrespondent ||
  mongoose.model('AiChatCorrespondent', aiChatCorrespondentSchema);
export default AiChatCorrespondent;
