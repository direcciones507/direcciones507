// @bun
// scripts/r2-diagnostic.ts
import { randomUUID } from "crypto";

// r2-signing.ts
import { createHash, createHmac } from "crypto";
var hash = (input) => createHash("sha256").update(input).digest("hex");
var hmac = (key, input) => createHmac("sha256", key).update(input).digest();
function signedR2Request(settings, method, key, bytes, mime, date = new Date) {
  if (key.split("/").some((part) => !part || part === "." || part === ".." || !/^[a-zA-Z0-9_.-]+$/.test(part)))
    throw new Error("INVALID_STORAGE_KEY");
  const host = `${settings.accountId}.r2.cloudflarestorage.com`;
  const path = "/" + [settings.bucket, ...key.split("/")].map(encodeURIComponent).join("/");
  const dateStamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  const amzDate = dateStamp + "T" + date.toISOString().slice(11, 19).replaceAll(":", "") + "Z";
  const payloadHash = hash(bytes);
  const canonicalHeaders = `content-type:${mime}
host:${host}
x-amz-content-sha256:${payloadHash}
x-amz-date:${amzDate}
`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [method, path, "", canonicalHeaders, signedHeaders, payloadHash].join(`
`);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, hash(canonicalRequest)].join(`
`);
  const signingKey = hmac(hmac(hmac(hmac("AWS4" + settings.secretAccessKey, dateStamp), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    url: `https://${host}${path}`,
    headers: {
      "content-type": mime,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      authorization: `AWS4-HMAC-SHA256 Credential=${settings.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    }
  };
}

// scripts/r2-diagnostic.ts
var names = ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
var allowedCodes = new Set(["AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch", "NoSuchBucket", "NoSuchKey", "RequestTimeTooSkewed", "ExpiredToken", "InvalidToken", "PreconditionFailed", "InternalError", "ServiceUnavailable"]);
async function bounded(response, limit) {
  const reader = response.body?.getReader();
  if (!reader)
    return Buffer.alloc(0);
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw Error("OVERSIZED_RESPONSE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
async function failure(response) {
  let code = "UPSTREAM_ERROR";
  try {
    const text = (await bounded(response, 4096)).toString("utf8");
    const candidate = text.match(/<Code>([A-Za-z]+)<\/Code>/)?.[1];
    if (candidate && allowedCodes.has(candidate))
      code = candidate;
  } catch {
    code = "UNREADABLE_ERROR_RESPONSE";
  }
  return { ok: false, http: response.status, code };
}
function network(error) {
  const name = error instanceof Error ? error.name : "";
  return { ok: false, code: ["AbortError", "TimeoutError"].includes(name) ? "NETWORK_TIMEOUT" : "NETWORK_OR_TLS_ERROR" };
}
async function diagnoseR2(env, http = fetch) {
  const present = Object.fromEntries(names.map((name) => [name, Boolean(env[name]?.trim())]));
  const report = { ok: false, configuration: { present, accountFormatValid: /^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID?.trim() ?? ""), bucketMatches: env.R2_BUCKET?.trim() === "direcciones507-media" } };
  if (Object.values(present).some((v) => !v) || !report.configuration.accountFormatValid || !report.configuration.bucketMatches)
    return report;
  const settings = { accountId: env.R2_ACCOUNT_ID.trim(), bucket: env.R2_BUCKET.trim(), accessKeyId: env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim() };
  const key = "_diagnostics/ad507-r2/" + randomUUID() + ".txt";
  report.objectKey = key;
  const bytes = Buffer.from("AD507 R2 temporary connectivity check " + randomUUID());
  const send = (method, body = new Uint8Array) => {
    const signed = signedR2Request(settings, method, key, body, "text/plain");
    return http(signed.url, { method, headers: { ...signed.headers, ...method === "PUT" ? { "if-none-match": "*" } : {} }, ...method === "PUT" ? { body: Buffer.from(body) } : {}, redirect: "error", signal: AbortSignal.timeout(1e4) });
  };
  let cleanup = false;
  try {
    let put;
    try {
      put = await send("PUT", bytes);
    } catch (error) {
      cleanup = true;
      report.write = network(error);
      return report;
    }
    if (!put.ok) {
      report.write = await failure(put);
      cleanup = put.status >= 500;
      return report;
    }
    cleanup = true;
    report.write = { ok: true, http: put.status };
    await put.body?.cancel();
    try {
      const get = await send("GET");
      if (!get.ok)
        report.read = await failure(get);
      else
        report.read = { ok: (await bounded(get, bytes.length + 1)).equals(bytes), http: get.status };
    } catch (error) {
      report.read = network(error);
    }
  } finally {
    if (cleanup) {
      report.cleanupRequired = true;
      try {
        const removed = await send("DELETE");
        if (!removed.ok)
          report.delete = await failure(removed);
        else {
          report.delete = { ok: true, http: removed.status };
          await removed.body?.cancel();
          const absent = await send("GET");
          if (absent.status === 404) {
            const error = await failure(absent);
            report.absence = { ok: error.code === "NoSuchKey", http: 404, code: error.code };
          } else {
            report.absence = { ok: false, http: absent.status, code: "DELETION_NOT_CONFIRMED" };
            await absent.body?.cancel();
          }
          report.cleanupRequired = !report.absence?.ok;
        }
      } catch (error) {
        report.delete ??= network(error);
      }
    }
    report.ok = Boolean(report.write?.ok && report.read?.ok && report.delete?.ok && report.absence?.ok);
  }
  return report;
}
if (import.meta.main) {
  try {
    const report = await diagnoseR2(process.env);
    console.log(JSON.stringify(report));
    process.exitCode = report.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, error: "DIAGNOSTIC_UNEXPECTED_FAILURE" }));
    process.exitCode = 1;
  }
}
export {
  diagnoseR2
};
