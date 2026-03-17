type JsonRequestOptions<T> = RequestInit & {
  fallback?: T;
};

// Policy: mutating or user-critical callers use requestJson without a fallback
// so failures throw, while safe empty states opt into an explicit fallback.
export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const readErrorMessage = async (response: Response) => {
  const text = await response.text();
  return text || response.statusText || "Request failed";
};

export const requestJson = async <T>(
  input: RequestInfo | URL,
  init: JsonRequestOptions<T> = {}
): Promise<T> => {
  const response = await fetch(input, init);

  if (!response.ok) {
    const message = await readErrorMessage(response);

    if (Object.prototype.hasOwnProperty.call(init, "fallback")) {
      return init.fallback as T;
    }

    throw new ApiRequestError(
      `${init.method ?? "GET"} ${String(input)} ${response.status}: ${message}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
};
