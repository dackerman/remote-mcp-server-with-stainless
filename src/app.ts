import { Hono } from "hono";
import {
	layout,
	homeContent,
	parseApproveFormBody,
	renderAuthorizationRejectedContent,
	renderAuthorizationApprovedContent,
	renderLoggedOutAuthorizeScreen,
} from "./utils";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { serverConfig } from "todo-ninja-mcp/server";

export type Bindings = Env & {
	OAUTH_PROVIDER: OAuthHelpers;
};

const app = new Hono<{
	Bindings: Bindings;
}>();


const config = serverConfig;

// Render a basic homepage placeholder to make sure the app is up
app.get("/", async (c) => {
	const content = await homeContent(c.req.raw);
	return c.html(layout(content, "Home", config));
});

app.get("/demo", async (c) => {
	const content = await renderLoggedOutAuthorizeScreen(config, {} as any);
	return c.html(layout(content, "Authorization", config));
});

// Render an authorization page
// If the user is logged in, we'll show a form to approve the appropriate scopes
// If the user is not logged in, we'll show a form to both login and approve the scopes
app.get("/authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

	const content = await renderLoggedOutAuthorizeScreen(config, oauthReqInfo);
	return c.html(layout(content, "Authorization", config));
});

// The /authorize page has a form that will POST to /approve
// This endpoint is responsible for validating any login information and
// then completing the authorization request with the OAUTH_PROVIDER
app.post("/approve", async (c) => {
	const { action, oauthReqInfo, clientProps } = await parseApproveFormBody(
		await c.req.parseBody(),
		config,
	);

	if (!oauthReqInfo) {
		return c.html("INVALID LOGIN", 401);
	}

	// If the user needs to both login and approve, we should validate the login first
	if (action === "login_approve") {
		// We'll allow any values for email and password for this demo
		// but you could validate them here
		// Ex:
		// if (email !== "user@example.com" || password !== "password") {
		// biome-ignore lint/correctness/noConstantCondition: This is a demo
		if (false) {
			return c.html(
				layout(
					await renderAuthorizationRejectedContent("/"),
					"Authorization Status",
					config,
				),
			);
		}
	}

	// Generate a random user ID for this demo
	const generatedUserId = Math.random().toString(36).substring(2);

	const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
		request: oauthReqInfo,
		userId: generatedUserId,
		metadata: {
		},
		scope: oauthReqInfo.scope,
		props: {
			clientProps,
		},
	});

	return c.html(
		layout(
			await renderAuthorizationApprovedContent(redirectTo),
			"Authorization Status",
			config,
		),
	);
});

export default app;
