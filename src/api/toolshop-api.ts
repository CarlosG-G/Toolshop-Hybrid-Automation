import type { APIRequestContext, APIResponse } from "@playwright/test";

export interface Product {
  id: string | number;
  name: string;
  price: number;
  in_stock: boolean;
}

interface ProductListResponse {
  data: Product[];
  current_page: number;
}

export class ToolshopApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  async getProducts(): Promise<ProductListResponse> {
    const response = await this.request.get(`${this.baseUrl}/products`);
    return this.readJson<ProductListResponse>(response);
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await this.request.get(
      `${this.baseUrl}/products/${encodeURIComponent(productId)}`,
    );
    return this.readJson<Product>(response);
  }

  private async readJson<T>(response: APIResponse): Promise<T> {
    if (!response.ok()) {
      throw new Error(
        `Toolshop API returned ${response.status()} ${response.statusText()}`,
      );
    }

    return (await response.json()) as T;
  }
}
