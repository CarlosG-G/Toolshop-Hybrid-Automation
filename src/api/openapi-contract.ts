import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import type { APIRequestContext } from "@playwright/test";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

interface OpenApiDocument {
  openapi: string;
  paths: Record<string, Partial<Record<HttpMethod, OperationObject>>>;
  components?: { schemas?: Record<string, unknown> };
}

interface OperationObject {
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
}

const SPEC_ID = "toolshop-openapi";
const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;

const escapePointer = (segment: string): string =>
  segment.replace(/~/g, "~0").replace(/\//g, "~1");

/**
 * Validates API responses against the OpenAPI document published by the provider.
 * OpenAPI 3.1+ schemas are JSON Schema 2020-12, so Ajv validates them natively.
 */
export class OpenApiContract {
  private readonly ajv: Ajv2020;
  private readonly cache = new Map<string, ValidateFunction>();

  private constructor(readonly document: OpenApiDocument) {
    // `strict: false` tolerates OpenAPI-only keywords such as `example`.
    this.ajv = addFormats(new Ajv2020({ strict: false, allErrors: true }));
    for (const format of ["int32", "int64", "float", "double", "number", "password"]) {
      this.ajv.addFormat(format, true);
    }
    this.ajv.addSchema(document as object, SPEC_ID);
  }

  static async load(
    request: APIRequestContext,
    apiUrl: string,
  ): Promise<OpenApiContract> {
    const response = await request.get(`${apiUrl}/docs?api-docs.json`);
    if (!response.ok()) {
      throw new Error(`OpenAPI document unavailable: HTTP ${response.status()}`);
    }
    return new OpenApiContract((await response.json()) as OpenApiDocument);
  }

  static fromDocument(document: OpenApiDocument): OpenApiContract {
    return new OpenApiContract(document);
  }

  get version(): string {
    return this.document.openapi;
  }

  operations(): string[] {
    return Object.entries(this.document.paths).flatMap(([path, item]) =>
      Object.keys(item)
        .filter((method) => ["get", "post", "put", "patch", "delete"].includes(method))
        .map((method) => `${method.toUpperCase()} ${path}`),
    );
  }

  /** Status codes the provider documents for an operation, in document order. */
  documentedStatuses(method: HttpMethod, path: string): number[] {
    const responses = this.document.paths[path]?.[method]?.responses;
    if (!responses) {
      throw new Error(`Contract has no ${method.toUpperCase()} ${path} operation.`);
    }
    return Object.keys(responses)
      .filter((status) => /^\d{3}$/.test(status))
      .map(Number);
  }

  /** Returns human-readable violations; an empty array means the body honours the contract. */
  violations(
    method: HttpMethod,
    path: string,
    status: number,
    body: unknown,
    contentType = "application/json",
  ): string[] {
    const validate = this.validator(method, path, status, contentType);
    if (validate(body)) {
      return [];
    }
    return (validate.errors ?? []).map(formatError);
  }

  private validator(
    method: HttpMethod,
    path: string,
    status: number,
    contentType: string,
  ): ValidateFunction {
    const key = `${method} ${path} ${status} ${contentType}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const schema =
      this.document.paths[path]?.[method]?.responses?.[String(status)]?.content?.[
        contentType
      ]?.schema;
    if (!schema) {
      throw new Error(`Contract has no ${contentType} schema for ${key}.`);
    }

    const pointer = [
      "paths",
      path,
      method,
      "responses",
      String(status),
      "content",
      contentType,
      "schema",
    ]
      .map(escapePointer)
      .join("/");
    const validate = this.ajv.compile({ $ref: `${SPEC_ID}#/${pointer}` });
    this.cache.set(key, validate);
    return validate;
  }
}

function formatError(error: ErrorObject): string {
  const location = error.instancePath || "(root)";
  return `${location} ${error.message ?? "is invalid"} ${JSON.stringify(error.params)}`;
}
