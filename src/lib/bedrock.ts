import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export interface BedrockResponse {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Generate text using Claude 3 Haiku on AWS Bedrock
 * Cheapest Claude model: $0.00025/1K input, $0.00125/1K output
 */
export async function generateWithBedrock(prompt: string): Promise<BedrockResponse> {
  const modelId = "anthropic.claude-3-haiku-20240307-v1:0";

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return {
    content: responseBody.content[0]?.text || "",
    inputTokens: responseBody.usage?.input_tokens,
    outputTokens: responseBody.usage?.output_tokens,
  };
}

/**
 * Alternative: Use Amazon Titan for even cheaper generation
 * $0.0003/1K input, $0.0004/1K output
 */
export async function generateWithTitan(prompt: string): Promise<BedrockResponse> {
  const modelId = "amazon.titan-text-express-v1";

  const body = JSON.stringify({
    inputText: prompt,
    textGenerationConfig: {
      maxTokenCount: 8192,
      temperature: 0.7,
      topP: 0.9,
    },
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return {
    content: responseBody.results?.[0]?.outputText || "",
    inputTokens: responseBody.inputTextTokenCount,
    outputTokens: responseBody.results?.[0]?.tokenCount,
  };
}

/**
 * Use Llama 3.1 8B for the cheapest option
 * $0.00022/1K tokens for both input and output
 */
export async function generateWithLlama(prompt: string): Promise<BedrockResponse> {
  const modelId = "meta.llama3-1-8b-instruct-v1:0";

  const body = JSON.stringify({
    prompt: `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
    max_gen_len: 8192,
    temperature: 0.7,
    top_p: 0.9,
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return {
    content: responseBody.generation || "",
    inputTokens: responseBody.prompt_token_count,
    outputTokens: responseBody.generation_token_count,
  };
}

// Default export uses Claude Haiku (best quality/price ratio)
export default generateWithBedrock;
