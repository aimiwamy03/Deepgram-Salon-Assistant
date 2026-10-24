> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Function Call Request

Voice Agent

The Voice Agent server sends `FunctionCallRequest` to request a function call. The `client_side` flag determines whether the server executes the function or expects the client to.

## Purpose

This message is used to trigger either a built-in server-side function or a custom function defined by the client.

* When `client_side` is `false`, the server will handle the function using built-in logic.
* When `client_side` is `true`, the client must handle the function and respond with a [`FunctionCallResponse`](./voice-agent-function-call-response).
* The optional `thought_signature` field may be present when using certain Gemini models that require an additional function call identifier. See [Gemini Docs](https://ai.google.dev/gemini-api/docs/thought-signatures) for details.

A request can arrive before the user's turn is confirmed. See [Turn confirmation](#turn-confirmation) below.

## Handling the message

> **Info**
>
> The `client_side` property is set by the server to indicate where the function should be executed.

When your client receives a `FunctionCallRequest`:

1. Check the `client_side` field.
2. If it's `true`, call the appropriate client-defined function.
3. Return a `FunctionCallResponse` message with the function result.
4. If it's `false`, no client action is needed; the server will handle it internally.

## Turn confirmation

The agent begins building a reply before speech-to-text confirms the user has finished speaking, so a `FunctionCallRequest` can reach you inside that speculative window. If the user keeps speaking, the turn resumes and the call is cancelled.

* By default, a call is dispatched as soon as the LLM emits it. You may receive a [`FunctionCallCancelled`](/docs/voice-agent-function-call-cancelled) for it, in which case you should stop work on that `id` and send no response.
* To stop a function from being requested speculatively at all, set [`defer_until_eot`](/docs/configure-voice-agent#agentthinkfunctionsdefer_until_eot) to `true` on its definition in `Settings`. The request is then only sent once the turn is confirmed.

`defer_until_eot` is a `Settings` property, not a field on this message. Requests carry only the fields listed below.

For the behavior in full, see [Speculative Replies & Turn Confirmation](/docs/voice-agent-speculative-replies).

## Example payloads

### Client-side function

The server asks the client to execute `get_weather` and reply with a `FunctionCallResponse`.

```json
{
  "type": "FunctionCallRequest",
  "functions": [
    {
      "id": "fc_12345678-90ab-cdef-1234-567890abcdef",
      "name": "get_weather",
      "arguments": "{\"location\": \"Fremont, CA 94539\"}",
      "client_side": true,
      "thought_signature": "abc123"
    }
  ]
}
```

The `thought_signature` field is optional. Certain Gemini models include it as an additional function call identifier. See [Gemini Docs](https://ai.google.dev/gemini-api/docs/thought-signatures).

### Server-side function

The server executes the function internally and notifies the client. The client takes no action.

```json
{
  "type": "FunctionCallRequest",
  "functions": [
    {
      "id": "fc_aabbccdd-eeff-0011-2233-445566778899",
      "name": "end_call",
      "arguments": "{\"reason\": \"completed\"}",
      "client_side": false
    }
  ]
}
```

### Fields

| Field                           | Type    | Description                                                                             |
| ------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| `type`                          | string  | Always `"FunctionCallRequest"`.                                                         |
| `functions[].id`                | string  | Unique identifier for this function call. Echo back in the `FunctionCallResponse`.      |
| `functions[].name`              | string  | Function name as defined in your agent configuration.                                   |
| `functions[].arguments`         | string  | JSON-encoded arguments. Parse before passing to the function.                           |
| `functions[].client_side`       | boolean | `true` if the client must execute and respond. `false` if the server handles it.        |
| `functions[].thought_signature` | string  | Optional. Used by some Gemini models. Pass back unchanged in the response when present. |

## Related messages

* [`FunctionCallResponse`](./voice-agent-function-call-response): The expected response from the client when `client_side` is `true`.
* [`FunctionCallCancelled`](/docs/voice-agent-function-call-cancelled): Sent when a request you already received is cancelled because the user started speaking again, either inside the speculative window or after the turn was confirmed.