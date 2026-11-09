export interface DemoUser {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export function createDemoUser(seed: string = crypto.randomUUID()): DemoUser {
  const safeSeed = seed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  if (safeSeed.length < 6) {
    throw new Error("Demo user seed must contain at least six alphanumeric characters.");
  }

  return {
    first_name: "Toolshop",
    last_name: "Automation",
    email: `toolshop-${safeSeed}@example.test`,
    password: `Demo-${safeSeed}-Pass!`,
  };
}
