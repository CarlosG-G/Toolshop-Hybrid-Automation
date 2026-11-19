import type { APIRequestContext, APIResponse } from "@playwright/test";

/** Catalog fields used by tests; TypeScript describes these values but does not validate JSON. */
export interface Product {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
  is_rental?: boolean;
}

/** One server-paginated catalog response, not the complete inventory. */
export interface ProductPage {
  data: Product[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Synthetic or seeded account credentials supplied by the test's fixture. */
export interface Credentials {
  email: string;
  password: string;
}

/** API address fields; omit postal_code when the scenario must avoid external postcode lookup. */
export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
}

/** Registration request shape accepted by the API client, including identity and address. */
export interface RegisterUser extends Credentials {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  address: Address & { house_number?: string };
}

/** Payment methods exposed by Toolshop's API and checkout form. */
export type PaymentMethod =
  | "bank-transfer"
  | "cash-on-delivery"
  | "credit-card"
  | "buy-now-pay-later"
  | "gift-card";

/** Method-specific synthetic payment data; the scenario chooses valid or intentionally invalid details. */
export interface Payment {
  payment_method: PaymentMethod;
  payment_details: Record<string, string>;
}

/** Invoice fields consumed by tests; validate provider responses separately through the contract. */
export interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
}

/** Raw response plus parsed JSON, so tests can assert on status codes and contracts. */
export interface ApiResult<T> {
  status: number;
  body: T;
  response: APIResponse;
}

/**
 * Thin, typed client for the Toolshop REST API.
 * Methods prefixed with `try` never throw on HTTP errors so negative tests can assert them.
 */
export class ToolshopApi {
  private token: string | undefined;

  /** Binds a Playwright request context to one API base URL; does not make a request. */
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  /** Returns the token saved by login or withToken, or undefined for anonymous requests. */
  get accessToken(): string | undefined {
    return this.token;
  }

  /** Sets the bearer token for subsequent requests and returns this client for chaining. */
  withToken(token: string): this {
    this.token = token;
    return this;
  }

  /** Fetches one catalog page with optional filters; throws on non-2xx responses. */
  async getProducts(query: Record<string, string | number> = {}): Promise<ProductPage> {
    return this.expectOk(await this.tryGet<ProductPage>("/products", query));
  }

  /** Fetches a product by URL-encoded ID; throws on non-2xx responses. */
  async getProduct(productId: string): Promise<Product> {
    return this.expectOk(
      await this.tryGet<Product>(`/products/${encodeURIComponent(productId)}`),
    );
  }

  /** Searches the catalog by query text and returns the first response page. */
  async searchProducts(q: string): Promise<ProductPage> {
    return this.expectOk(await this.tryGet<ProductPage>("/products/search", { q }));
  }

  /** Finds an exact name in the first search page; throws if that page has no match. */
  async findProductByName(name: string): Promise<Product> {
    const result = await this.searchProducts(name);
    const product = result.data.find((candidate) => candidate.name === name);
    if (!product) {
      throw new Error(`Product "${name}" not found in the catalog.`);
    }
    return product;
  }

  /** Attempts login without saving its token or rejecting HTTP error statuses. */
  async tryLogin(
    credentials: Credentials,
  ): Promise<ApiResult<{ access_token?: string }>> {
    return this.send("post", "/users/login", credentials);
  }

  /** Logs in and saves the bearer token; rejects HTTP errors or a missing token. */
  async login(credentials: Credentials): Promise<string> {
    const { access_token: token } = this.expectOk(await this.tryLogin(credentials));
    if (!token) {
      throw new Error("Login succeeded without returning an access token.");
    }
    this.token = token;
    return token;
  }

  /** Submits registration and preserves status/body so tests can inspect validation errors. */
  async tryRegister(user: RegisterUser): Promise<ApiResult<{ id?: string }>> {
    return this.send("post", "/users/register", user);
  }

  /** Registers a customer, rejecting non-2xx responses; assumes the provider returns an ID. */
  async register(user: RegisterUser): Promise<{ id: string }> {
    return this.expectOk(await this.tryRegister(user)) as { id: string };
  }

  /** Reads the current identity with this client's token, preserving authentication errors. */
  async tryMe(): Promise<ApiResult<{ email?: string; id?: string }>> {
    return this.tryGet("/users/me");
  }

  /** Creates an anonymous cart and returns its ID, rejecting non-2xx responses. */
  async createCart(): Promise<string> {
    const { id } = this.expectOk(await this.send<{ id: string }>("post", "/carts"));
    return id;
  }

  /** Adds a product quantity to a cart, preserving HTTP errors for negative tests. */
  async tryAddToCart(
    cartId: string,
    productId: string,
    quantity: number,
  ): Promise<ApiResult<unknown>> {
    return this.send("post", `/carts/${cartId}`, { product_id: productId, quantity });
  }

  /** Adds a product (one unit by default) and throws if the API rejects the operation. */
  async addToCart(cartId: string, productId: string, quantity = 1): Promise<void> {
    this.expectOk(await this.tryAddToCart(cartId, productId, quantity));
  }

  /** Reads cart contents with status and raw response; does not reject HTTP error statuses. */
  async getCart(
    cartId: string,
  ): Promise<ApiResult<{ id: string; cart_items: unknown[] }>> {
    return this.tryGet(`/carts/${cartId}`);
  }

  /** Validates payment details without creating an invoice; preserves HTTP error statuses. */
  async tryCheckPayment(payment: Payment): Promise<ApiResult<{ message?: string }>> {
    return this.send("post", "/payment/check", payment);
  }

  /** Maps an address to billing fields and submits an invoice, omitting an absent postcode. */
  async tryCreateInvoice(
    cartId: string,
    address: Address,
    payment: Payment,
  ): Promise<ApiResult<Invoice>> {
    return this.send("post", "/invoices", {
      cart_id: cartId,
      billing_street: address.street,
      billing_city: address.city,
      billing_state: address.state,
      billing_country: address.country,
      ...(address.postal_code === undefined
        ? {}
        : { billing_postal_code: address.postal_code }),
      ...payment,
    });
  }

  /** Lists the authenticated customer's invoices; throws on non-2xx responses. */
  async getInvoices(): Promise<{ data: Invoice[] }> {
    return this.expectOk(await this.tryGet<{ data: Invoice[] }>("/invoices"));
  }

  /** Attempts to save a favorite with the current token, preserving status and body. */
  async tryAddFavorite(productId: string): Promise<ApiResult<{ id?: string }>> {
    return this.send("post", "/favorites", { product_id: productId });
  }

  /** Sends an authenticated-if-available GET; T describes, but does not validate, the body. */
  async tryGet<T>(
    path: string,
    query: Record<string, string | number> = {},
  ): Promise<ApiResult<T>> {
    const response = await this.request.get(this.url(path), {
      params: query,
      headers: this.headers(),
    });
    return this.wrap<T>(response);
  }

  /** Sends a JSON write request; preserves HTTP errors but propagates transport failures. */
  async send<T>(
    method: "post" | "put" | "patch" | "delete",
    path: string,
    data?: unknown,
  ): Promise<ApiResult<T>> {
    const response = await this.request[method](this.url(path), {
      data,
      headers: this.headers(),
    });
    return this.wrap<T>(response);
  }

  /** Appends an API path, including its leading slash, to the configured base URL. */
  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  /** Requests JSON and includes a bearer header only when this client has a token. */
  private headers(): Record<string, string> {
    return {
      Accept: "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  /** Parses JSON when possible; keeps non-JSON text and the raw response for diagnostics. */
  private async wrap<T>(response: APIResponse): Promise<ApiResult<T>> {
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // Non-JSON bodies are kept as text for diagnostics.
    }
    return { status: response.status(), body: body as T, response };
  }

  /** Unwraps a 2xx body or throws with the request URL, status and a bounded body excerpt. */
  private expectOk<T>(result: ApiResult<T>): T {
    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        `Toolshop API ${result.response.url()} returned ${result.status}: ${JSON.stringify(result.body).slice(0, 300)}`,
      );
    }
    return result.body;
  }
}
