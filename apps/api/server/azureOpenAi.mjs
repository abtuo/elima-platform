export async function azureChat(messages, options = {}, env = process.env, fetchImpl = fetch) {
  const endpoint = String(env.AZURE_OPENAI_ENDPOINT ?? "").replace(/\/+$/, "");
  const deployment = String(env.AZURE_OPENAI_DEPLOYMENT ?? "").trim();
  const apiKey = String(env.AZURE_OPENAI_API_KEY ?? "").trim();
  const apiVersion = String(env.AZURE_OPENAI_API_VERSION ?? "2024-02-15-preview").trim();
  if (!endpoint || !deployment || !apiKey) throw Object.assign(new Error("Configuration Azure OpenAI serveur incomplète."), { statusCode: 503, code: "azure_openai_configuration_missing" });

  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const payload = { messages, max_completion_tokens: options.maxTokens ?? 4000 };
  if (options.json) payload.response_format = { type: "json_object" };

  let result = await callAzure(url, apiKey, payload, fetchImpl);
  if (!result.ok && options.json && /response_format|json_object/i.test(result.text)) {
    delete payload.response_format;
    result = await callAzure(url, apiKey, payload, fetchImpl);
  }
  if (!result.ok) throw Object.assign(new Error(`Azure OpenAI (${result.status}) : ${readAzureError(result.text)}`), { statusCode: 502, code: "pedagogical_analysis_failed" });

  const data = JSON.parse(result.text);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw Object.assign(new Error("Azure OpenAI a renvoyé une réponse vide."), { statusCode: 502, code: "pedagogical_analysis_failed" });
  return content.trim();
}

async function callAzure(url, apiKey, payload, fetchImpl) {
  const response = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json", "api-key": apiKey }, body: JSON.stringify(payload) });
  return { ok: response.ok, status: response.status, text: await response.text() };
}

function readAzureError(raw) {
  try { return JSON.parse(raw)?.error?.message ?? "Erreur de génération."; } catch { return String(raw).slice(0, 300); }
}
