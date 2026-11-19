/** Minimal synthetic identity used by account factories and isolated customer fixtures. */
export interface DemoUser {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

/** Builds synthetic credentials from a sanitized seed; rejects seeds with fewer than six safe characters. */
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

/**
 * Returns a UTC birth date for age boundaries; positive offsetDays makes the person younger.
 * The optional clock makes tests reproducible; Date normalizes leap-day anniversaries.
 */
export function dobForAge(years: number, offsetDays = 0, today = new Date()): string {
  const date = new Date(
    Date.UTC(today.getUTCFullYear() - years, today.getUTCMonth(), today.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/** Complete registration fixture, including the house number required by the UI. */
export interface RegistrationData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dob: string;
  phone: string;
  address: {
    street: string;
    house_number: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
}

/** Builds valid unique registration data; overrides are shallow, so address replaces the whole address. */
export function buildRegistration(
  overrides: Partial<RegistrationData> = {},
): RegistrationData {
  const seed = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return {
    ...createDemoUser(seed),
    dob: dobForAge(30),
    phone: "0987654321",
    address: {
      street: "Calle Sierpes 1",
      house_number: "1",
      city: "Sevilla",
      state: "Andalucia",
      country: "ES",
      postal_code: "41004",
    },
    ...overrides,
  };
}

/**
 * Billing address without postal code: the SUT cross-checks country + postcode against an
 * external lookup service, which would make checkout depend on a third party.
 */
export const billingAddress = {
  street: "Calle Sierpes 1",
  city: "Sevilla",
  state: "Andalucia",
  country: "ES",
} as const;
