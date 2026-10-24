> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Update Speak

Voice Agent

The `UpdateSpeak` message is a JSON message that you can use to change the Speak model in the middle of a conversation.

## Purpose

The `UpdateSpeak` message is a JSON message that allows you to switch the Speak model during a conversation. This flexibility enables real-time adjustments to the agent's voice output, ensuring a more dynamic and responsive interaction tailored to the evolving needs of the conversation.

## Example Payloads

To send the `UpdateSpeak` message, you need to send the following JSON message to the server:

**`JSON`**

```json JSON
{
    "type": "UpdateSpeak",
    "speak": {
        "provider": {
            "type": "deepgram",
            "version": "v2",
            "model": "flux-alexis-en"
        }
    }
}
```

Upon receiving the `UpdateSpeak` message, the server will process all remaining audio data and return a [`SpeakUpdated`](/docs/voice-agent-acknowledgements#speakupdated) message.

> **Info**
>
> With [Flux TTS](/docs/voice-agent-tts-models#flux-tts), the new voice takes effect on the agent's next turn — a turn already being spoken finishes in the voice that started it. `SpeakUpdated` confirms the change will be used; an update that cannot be applied returns an `Error` instead.

**`JSON`**

```json JSON
{
    "type": "SpeakUpdated"
}
```