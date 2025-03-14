import * as v from "valibot";
import { QueryClient } from "@tanstack/react-query";
import { RatelimitHitError } from "./errors";

export const BACKEND_URL_BASE = import.meta.env.VITE_BACKEND_URL;
export const queryClient = new QueryClient();

export const route = (path: string, query?: Record<string, string>) => {
	const current = new URL(`${BACKEND_URL_BASE}${path}`);
	current.search = new URLSearchParams(query).toString();
	return current;
};

export const getWithSchema = async <const TSchema extends BaseSchema>(
	path: string,
	schema: TSchema,
	other?: OtherRequestData,
): Promise<v.InferOutput<TSchema>> =>
	requestWithSchema("GET", path, schema, other);
export const postWithSchema = async <const TSchema extends BaseSchema>(
	path: string,
	schema: TSchema,
	other?: OtherRequestData,
): Promise<v.InferOutput<TSchema>> =>
	requestWithSchema("POST", path, schema, other);

export const get = async (path: string, other?: OtherRequestData) =>
	request("GET", path, other);
export const post = async (path: string, other?: OtherRequestData) =>
	request("POST", path, other);

const requestWithSchema = async <const TSchema extends BaseSchema>(
	method: RequestMethod,
	path: string,
	schema: TSchema,
	other?: OtherRequestData,
): Promise<v.InferOutput<TSchema>> => {
	const response = await fetch(route(path, other?.query), {
		method: method,
		headers: getHeaders(other),
	});
	if (!response.ok) {
		if (response.status === 429) throw new RatelimitHitError(response);

		const body = await response.text();
		throw new Error(
			`server returned an unsuccessful status code (${response.status}): ${body.length === 0 ? "body was empty" : body}`,
		);
	}
	return v.parse(schema, await response.json());
};

const request = async (
	method: RequestMethod,
	path: string,
	other?: OtherRequestData,
): Promise<Response> => {
	const response = await fetch(route(path, other?.query), {
		method: method,
		headers: getHeaders(other),
	});
	if (!response.ok) {
		if (response.status === 429) throw new RatelimitHitError(response);

		const body = await response.text();
		throw new Error(
			`server returned an unsuccessful status code (${response.status}): ${body.length === 0 ? "body was empty" : body}`,
		);
	}
	return response;
};

const getHeaders = (other?: OtherRequestData): HeadersInit => ({
	Authorization:
		other?.authorization === undefined ? "" : `Bearer ${other.authorization}`,
	"Cache-Control": other?.bypassCache ? "no-cache" : "",
	...other?.headers,
});

type BaseSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
type OtherRequestData = {
	query?: Record<string, string>;
	authorization?: string;
	headers?: Record<string, string>;
	bypassCache?: boolean;
};
type RequestMethod = "GET" | "POST";
