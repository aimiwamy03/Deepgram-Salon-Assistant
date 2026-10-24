> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Build a Voice Agent

Deepgram's Voice Agent API uses a single WebSocket connection to handle the entire conversational loop. The API integrates speech-to-text, a large language model (LLM), and text-to-speech into one stream.

## How it works

Building a voice agent involves four main steps over a WebSocket:

1. **Open a connection**: Connect to the Deepgram Agent endpoint, `wss://agent.deepgram.com/v1/agent/converse`, using a supported SDK or a WebSocket client.
2. **Configure the agent**: Send a `Settings` message to define the models, voices, and behavior.
3. **Stream audio**: Send raw audio data to the agent.
4. **Handle events**: Listen for transcripts, agent responses, and audio output.

> **Info**
>
> The Voice Agent API is available on the EU endpoint at `wss://api.eu.deepgram.com/v1/agent/converse`, the AU endpoint at `wss://api.au.deepgram.com/v1/agent/converse`, and the India endpoint at `wss://api.in.deepgram.com/v1/agent/converse`. See [Regional Endpoints](/reference/regional-endpoints) for details.

## Choose your language

Select a language to start building your voice agent. Each tutorial provides a complete, end-to-end implementation.

* [Python Tutorial](/docs/build-a-voice-agent-python)
* [JavaScript Tutorial](/docs/build-a-voice-agent-javascript)
* [C# Tutorial](/docs/build-a-voice-agent-csharp)
* [Go Tutorial](/docs/build-a-voice-agent-go)

## Next steps

Once you understand the basics, you can explore more advanced configurations:

* [Browser Agent Overview](/docs/browser-agent-overview): Add voice AI to your web applications.
* [Configure the Voice Agent](/docs/configure-voice-agent): Learn about all available settings for models, voices, and audio formats.
* [API Reference](/reference/voice-agent/voice-agent): View the full WebSocket protocol specification.

## Implementation examples

Check out these repositories for more complex voice agent implementations:

| Use case           | Runtime / Language           | Repo                                                                                                                                               |
| :----------------- | :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic demo         | Node, TypeScript, JavaScript | [Deepgram Voice Agent Demo](https://github.com/deepgram-devs/deepgram-voice-agent-demo)                                                            |
| Medical assistant  | Node, TypeScript, JavaScript | [Medical Assistant Demo](https://github.com/deepgram-devs/voice-agent-medical-assistant-demo)                                                      |
| Twilio integration | Python                       | [Twilio Voice Agent](https://github.com/deepgram-devs/twilio-voice-agent) ([guide](/docs/twilio-and-deepgram-voice-agent))                         |
| Plivo integration  | Python                       | [Plivo Voice Agent](https://github.com/plivo/python-agents-examples/tree/main/deepgram-voiceagent) ([guide](/docs/plivo-and-deepgram-voice-agent)) |
| Text input demo    | Node, TypeScript, JavaScript | [Conversational AI Demo](https://github.com/deepgram-devs/deepgram-ai-agent-demo)                                                                  |
| Azure OpenAI       | Python                       | [Voice Agent with OpenAI Azure](https://github.com/deepgram-devs/voice-agent-azure-open-ai-services)                                               |
| Function calling   | Python / Flask               | [Flask Agent Function Calling Demo](https://github.com/deepgram-devs/flask-agent-function-calling-demo)                                            |

## Rate limits

For information on concurrency limits, refer to the [API Rate Limits](/reference/api-rate-limits) documentation.

## Usage tracking

Deepgram calculates usage based on WebSocket connection time. One hour of connection time equals one hour of API usage.

Deepgram API Playground

Try this feature out in our API Playground.