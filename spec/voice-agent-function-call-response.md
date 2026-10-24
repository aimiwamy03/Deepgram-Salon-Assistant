> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Function Call Response

Voice Agent

The `FunctionCallResponse` message contains the result of a function call. It is usually sent by the client in response to a `FunctionCallRequest`, but may also be sent by the server if the function was handled internally (When a request contained `client_side: false`).

## Purpose

This message completes a function call flow. It provides the output of the function to the agent, regardless of where it was executed.

* If the [request](./voice-agent-function-call-request) was marked `client_side: true`, the client sends the `FunctionCallResponse`.
* If the request had `client_side: false`, the server sends this message after processing the function.
* Send no response for a call named in a [`FunctionCallCancelled`](/docs/voice-agent-function-call-cancelled). The turn resumed, the call is void, and a late response is dropped.

## Fields

* `type`: Always `"FunctionCallResponse"`.
* `id`: The ID of the original function call (optional but recommended for traceability).
* `name`: The name of the function that was called.
* `content`: A text summary or result of the function's output. This is often passed to the next step in the conversation, or parsed if it contains encoded text (i.e. JSON).

## Example payload

```json
{
  "type": "FunctionCallResponse",
  "id": "fc_12345678-90ab-cdef-1234-567890abcdef",
  "name": "get_weather",
  "content": "{\"location\": \"Fremont, CA 94539\", \"temperature_c\": 21, \"condition\": \"Sunny\", \"humidity\": 40, \"wind_kph\": 14}"
}
```

In this example, the client (or server) returns the result of calling the `get_weather` function.

## Related messages

* [`FunctionCallRequest`](./voice-agent-function-call-request): The message that triggers a function to be called.
* [`FunctionCallCancelled`](/docs/voice-agent-function-call-cancelled): Tells you a request is void and needs no response.