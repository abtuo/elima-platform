import {azureFetch,azureBody,providerFailure} from './azureTransport.mjs';
export async function azureChat(messages, options = {}, env = process.env, fetchImpl = fetch) {
  return (await azureChatResponse(messages, options, env, fetchImpl)).content;
}

export async function azureStructuredChat(messages, { schema, schemaName = "pedagogical_output", ...options }, env = process.env, fetchImpl = fetch) {
  return azureChatResponse(messages, { ...options, json: true, jsonSchema: schema, schemaName }, env, fetchImpl);
}

async function azureChatResponse(messages, options = {}, env = process.env, fetchImpl = fetch) {
  const endpoint = String(env.AZURE_OPENAI_ENDPOINT ?? "").replace(/\/+$/, "");
  const deployment = String(env.AZURE_OPENAI_DEPLOYMENT ?? "").trim();
  const apiKey = String(env.AZURE_OPENAI_API_KEY ?? "").trim();
  const apiVersion = String(env.AZURE_OPENAI_API_VERSION ?? "2024-02-15-preview").trim();
  if (!endpoint || !deployment || !apiKey) throw Object.assign(new Error("Configuration Azure OpenAI serveur incomplète."), { statusCode: 503, code: "azure_openai_configuration_missing" });

  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const payload = { messages, max_completion_tokens: options.maxTokens ?? 4000 };
  if (options.jsonSchema) payload.response_format = { type: "json_schema", json_schema: { name: options.schemaName ?? "structured_output", strict: true, schema: options.jsonSchema } };
  else if (options.json) payload.response_format = { type: "json_object" };

  let result = await callAzure(url, apiKey, payload, fetchImpl);
  let responseMode = options.jsonSchema ? "json_schema" : options.json ? "json_object" : "text";
  if (!result.ok && options.jsonSchema && /response_format|json_schema|schema/i.test(result.text)) {
    payload.response_format = { type: "json_object" };
    responseMode = "json_object";
    result = await callAzure(url, apiKey, payload, fetchImpl);
  }
  if (!result.ok && options.json && /response_format|json_object/i.test(result.text)) {
    delete payload.response_format; responseMode = "text";
    result = await callAzure(url, apiKey, payload, fetchImpl);
  }
  if (!result.ok) throw providerFailure(Object.assign(new Error(`Azure OpenAI (${result.status}) : ${readAzureError(result.text)}`), { statusCode: 502, code: "pedagogical_analysis_failed" }),result.status);

  const data = JSON.parse(result.text);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw Object.assign(new Error("Azure OpenAI a renvoyé une réponse vide."), { statusCode: 502, code: "pedagogical_analysis_failed" });
  return {
    content: content.trim(),
    responseMode,
    model: data.model ?? deployment,
    deployment,
    usage: data.usage ? {
      inputTokens: Number(data.usage.prompt_tokens ?? 0),
      outputTokens: Number(data.usage.completion_tokens ?? 0),
      totalTokens: Number(data.usage.total_tokens ?? 0),
    } : null,
    finishReason: data?.choices?.[0]?.finish_reason ?? null,
  };
}

async function callAzure(url, apiKey, payload, fetchImpl) {
  const response = await azureFetch(fetchImpl,url, { method: "POST", headers: { "Content-Type": "application/json", "api-key": apiKey }, body: JSON.stringify(payload) });
  return { ok: response.ok, status: response.status, text: await azureBody(response) };
}

function readAzureError(raw) {
  try { return JSON.parse(raw)?.error?.message ?? "Erreur de génération."; } catch { return String(raw).slice(0, 300); }
}
