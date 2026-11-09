import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API_URL || "http://127.0.0.1:8091";

export const options = {
  stages: [
    { duration: "15s", target: 20 },
    { duration: "30s", target: 50 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const list = http.get(`${API}/products`, { tags: { name: "list" } });
  check(list, { "list is 200": (r) => r.status === 200 });

  const first = list.json("data.0.id");
  if (first) {
    const detail = http.get(`${API}/products/${first}`, { tags: { name: "detail" } });
    check(detail, { "detail is 200": (r) => r.status === 200 });
  }

  const search = http.get(`${API}/products/search?q=pliers`, {
    tags: { name: "search" },
  });
  check(search, { "search is 200": (r) => r.status === 200 });
  sleep(1);
}
