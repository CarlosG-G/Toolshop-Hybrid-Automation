import type { APIRequestContext, APIResponse } from "@playwright/test";

export interface Product {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
  is_rental?: boolean;
}

export interface ProductPage {
  data: Product[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
}

export interface RegisterUser extends Credentials {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  address: Address & { house_number?: string };
}

export type PaymentMethod =
  | "bank-transfer"
  | "cash-on-delivery"
  | "credit-card"
  | "buy-now-pay-later"
  | "gift-card";

export interface Payment {
  payment_method: PaymentMethod;
  payment_details: Record<string, string>;
}

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

  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  get accessToken(): string | undefined {
    return this.token;
  }

  withToken(token: string): this {
    this.token = token;
    return this;
  }

  // Catalog
  async getProducts(query: Record<string, string | number> = {}): Promise<ProductPage> {
    return this.expectOk(await this.tryGet<ProductPage>("/products", query));
  }

  async getProduct(productId: string): Promise<Product> {
    return this.expectOk(
      await this.tryGet<Product>(`/products/${encodeURIComponent(productId)}`),
    );
  }

  async searchProducts(q: string): Promise<ProductPage> {
    return this.expectOk(await this.tryGet<ProductPage>("/products/search", { q }));
  }

  async findProductByName(name: string): Promise<Product> {
    const result = await this.searchProducts(name);
    const product = result.data.find((candidate) => candidate.name === name);
    if (!product) {
      throw new Error(`Product "${name}" not found in the catalog.`);
    }
    return product;
  }

  // Authentication
  async tryLogin(
    credentials: Credentials,
  ): Promise<ApiResult<{ access_token?: string }>> {
    return this.send("post", "/users/login", credentials);
  }

  async login(credentials: Credentials): Promise<string> {
    const { access_token: token } = this.expectOk(await this.tryLogin(credentials));
    if (!token) {
      throw new Error("Login succeeded without returning an access token.");
    }
    this.token = token;
    return token;
  }

  async tryRegister(user: RegisterUser): Promise<ApiResult<{ id?: string }>> {
    return this.send("post", "/users/register", user);
  }

  async register(user: RegisterUser): Promise<{ id: string }> {
    return this.expectOk(await this.tryRegister(user)) as { id: string };
  }

  async tryMe(): Promise<ApiResult<{ email?: string; id?: string }>> {
    return this.tryGet("/users/me");
  }

  // Cart
  async createCart(): Promise<string> {
    const { id } = this.expectOk(await this.send<{ id: string }>("post", "/carts"));
    return id;
  }

  async tryAddToCart(
    cartId: string,
    productId: string,
    quantity: number,
  ): Promise<ApiResult<unknown>> {
    return this.send("post", `/carts/${cartId}`, { product_id: productId, quantity });
  }

  async addToCart(cartId: string, productId: string, quantity = 1): Promise<void> {
    this.expectOk(await this.tryAddToCart(cartId, productId, quantity));
  }

  async getCart(
    cartId: string,
  ): Promise<ApiResult<{ id: string; cart_items: unknown[] }>> {
    return this.tryGet(`/carts/${cartId}`);
  }

  // Payment & invoices
  async tryCheckPayment(payment: Payment): Promise<ApiResult<{ message?: string }>> {
    return this.send("post", "/payment/check", payment);
  }

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

  async getInvoices(): Promise<{ data: Invoice[] }> {
    return this.expectOk(await this.tryGet<{ data: Invoice[] }>("/invoices"));
  }

  // Favorites
  async tryAddFavorite(productId: string): Promise<ApiResult<{ id?: string }>> {
    return this.send("post", "/favorites", { product_id: productId });
  }

  // Generic helpers
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

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private headers(): Record<string, string> {
    return {
      Accept: "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

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

  private expectOk<T>(result: ApiResult<T>): T {
    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        `Toolshop API ${result.response.url()} returned ${result.status}: ${JSON.stringify(result.body).slice(0, 300)}`,
      );
    }
    return result.body;
  }
}
