export const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseLocalDateKey = (value: unknown) => {
  const raw = String(value ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }

  const [year, month, day] = raw.split("-").map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined
  ) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseLocalDateInput = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  if (typeof value === "string") {
    const localDate = parseLocalDateKey(value);
    if (localDate) {
      return localDate;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const startOfLocalDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const endOfLocalDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const parseRecurringSafeDate = (value: unknown) => {
  const parsed = parseLocalDateInput(value);
  return parsed ? startOfLocalDay(parsed) : null;
};
