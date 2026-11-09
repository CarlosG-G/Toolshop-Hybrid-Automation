const search = document.querySelector("#search");
const products = document.querySelector("#products");
const status = document.querySelector('[role="status"]');
const cartCount = document.querySelector("#cart-count");
let cartItems = 0;
let allProducts = [];

function render(items) {
  products.replaceChildren();
  for (const product of items) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const addButton = document.createElement("button");
    name.textContent = product.name;
    addButton.type = "button";
    addButton.textContent = "Add to cart";
    addButton.setAttribute("aria-label", `Add to cart: ${product.name}`);
    addButton.addEventListener("click", () => {
      cartCount.textContent = String(++cartItems);
    });
    item.append(name, addButton);
    products.append(item);
  }
  status.textContent = `${items.length} products`;
}

async function loadProducts() {
  status.textContent = "Loading products...";
  const response = await fetch("/api/products");
  if (!response.ok) {
    throw new Error(`Catalog request failed: ${response.status}`);
  }
  const result = await response.json();
  allProducts = result.data;
  render(allProducts);
}

document.querySelector("#search-button").addEventListener("click", () => {
  const term = search.value.trim().toLowerCase();
  render(allProducts.filter(({ name }) => name.toLowerCase().includes(term)));
});

loadProducts().catch((error) => {
  status.textContent = error.message;
});
