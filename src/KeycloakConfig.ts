const config = {
    "realm": process.env.CODA_HUB_API_AUTH_REALM,
    "auth-server-url": process.env.CODA_AUTH_SERVICE_URL,
    "ssl-required": "external",
    "resource": process.env.CODA_HUB_API_AUTH_CLIENT_ID,
    "credentials": {
        "secret": process.env.CODA_HUB_API_AUTH_CLIENT_SECRET
    },
    "confidential-port": 0
}

export default config;