// File: orchestration/webhook-dispatcher.js
// Role: Fire-and-forget structured alert dispatcher for pipeline and canary events.
// Constraints enforced: ENV := ∅ (endpoint as parameter), no retry, timeout fail-safe return, no subprocess usage.
// Upstream: register-webhooks
// Downstream: TERMINAL
// ISM controls: ISM-0109, ISM-0140, ISM-1554, ISM-1858
import Ajv from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';

const ajv = new Ajv({ allErrors: false, strict: true });
const alertSchema = JSON.parse(
  readFileSync(new URL('../schemas/webhook-alert.schema.json', import.meta.url), 'utf8')
);
const validateAlert = ajv.compile(alertSchema);

export async function dispatchAlert(alert, webhookConfig) {
  if (!validateAlert(alert)) {
    throw new TypeError(
      `Alert schema validation failure: ${ajv.errorsText(validateAlert.errors)}`
    );
  }

  const { endpoint_url, auth_header_name, auth_header_value_path } = webhookConfig;
  const authValue = auth_header_value_path
    ? readFileSync(auth_header_value_path, 'utf8').trim()
    : null;

  const headers = { 'Content-Type': 'application/json' };
  if (auth_header_name && authValue) {
    headers[auth_header_name] = authValue;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(endpoint_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(alert),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return {
      status: response.ok ? 'DISPATCHED' : 'DISPATCH_ERROR',
      alert_id: alert.alert_id,
      endpoint: endpoint_url,
      http_status: response.status
    };
  } catch (error) {
    clearTimeout(timeout);
    const isTimeout = error && error.name === 'AbortError';
    return {
      status: isTimeout ? 'DISPATCH_TIMEOUT' : 'DISPATCH_ERROR',
      alert_id: alert.alert_id,
      endpoint: endpoint_url,
      error: error instanceof Error ? error.message : 'Unknown dispatch error'
    };
  }
}
