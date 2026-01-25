import {
	ApolloClient,
	InMemoryCache,
	createHttpLink,
	split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_URL =
	Constants.expoConfig?.extra?.apiUrl || "http://localhost:4000/graphql";
const WS_URL = API_URL.replace(/^http/, "ws");

// HTTP link for queries and mutations
const httpLink = createHttpLink({
	uri: API_URL,
});

// Auth link to add token to requests
const authLink = setContext(async (_, { headers }) => {
	const token = await AsyncStorage.getItem("@academia_token");
	return {
		headers: {
			...headers,
			authorization: token ? `Bearer ${token}` : "",
		},
	};
});

// WebSocket link for subscriptions (lazy initialization)
let wsLink: GraphQLWsLink | null = null;

const getWsLink = () => {
	if (!wsLink) {
		// Dynamically import to avoid issues on web
		try {
			const { createClient } = require("graphql-ws");
			wsLink = new GraphQLWsLink(
				createClient({
					url: WS_URL,
					connectionParams: async () => {
						const token = await AsyncStorage.getItem("@academia_token");
						return {
							authorization: token ? `Bearer ${token}` : "",
						};
					},
				}),
			);
		} catch (e) {
			console.warn("WebSocket not available");
		}
	}
	return wsLink;
};

// Split link for subscriptions vs queries/mutations
const splitLink = split(
	({ query }) => {
		const definition = getMainDefinition(query);
		return (
			definition.kind === "OperationDefinition" &&
			definition.operation === "subscription"
		);
	},
	getWsLink() || httpLink,
	authLink.concat(httpLink),
);

// Cache configuration with type policies
const cache = new InMemoryCache({
	typePolicies: {
		Query: {
			fields: {
				courses: {
					keyArgs: ["filter"],
					merge(existing = [], incoming, { args }) {
						if (args?.offset === 0) return incoming;
						return [...existing, ...incoming];
					},
				},
				myNotifications: {
					merge(_, incoming) {
						return incoming;
					},
				},
			},
		},
		User: {
			keyFields: ["id"],
		},
		Course: {
			keyFields: ["id"],
		},
		Notification: {
			keyFields: ["id"],
		},
	},
});

export const apolloClient = new ApolloClient({
	link: splitLink,
	cache,
	defaultOptions: {
		watchQuery: {
			fetchPolicy: "cache-and-network",
			errorPolicy: "all",
		},
		query: {
			fetchPolicy: "network-only",
			errorPolicy: "all",
		},
		mutate: {
			errorPolicy: "all",
		},
	},
});

// Helper to clear cache on logout
export const clearApolloCache = async () => {
	await apolloClient.clearStore();
};

export default apolloClient;
