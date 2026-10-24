> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Multilingual Voice Agents

A multilingual voice agent has two model decisions: which STT model transcribes the user, and which TTS model speaks the agent. Pick each one based on what your agent needs to do at runtime.

## Pick your STT model

| Your situation                                                                                                                       | Use this                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Conversational agent in one of the 10 [Flux Multilingual](/docs/flux/language-prompting) languages, with turn awareness and barge-in | **Flux Multilingual** (`flux-general-multi`)                                                      |
| Single known language, all calls                                                                                                     | Flux Multilingual with a single-entry `language_hints` array, or the language-specific Nova model |
| Multilingual support center, calls arrive in different languages                                                                     | Flux Multilingual with multiple entries in the `language_hints` array                             |
| Code-switching mid-conversation, no need for turn awareness                                                                          | Nova-3 with `language: "multi"`                                                                   |

Flux Multilingual is the default recommendation. It handles turn awareness and interruption with the same low latency as `flux-general-en`. Use Nova-3 only when you need code-switching but not the conversational features.

### Flux Multilingual configuration

* `agent.listen.provider.type`: `deepgram`
* `agent.listen.provider.version`: `v2`
* `agent.listen.provider.model`: `flux-general-multi`
* `agent.listen.provider.language_hints`: array of one or more BCP-47 codes (optional)

```json
{
  "agent": {
    "listen": {
      "provider": {
        "type": "deepgram",
        "version": "v2",
        "model": "flux-general-multi",
        "language_hints": ["en", "es"]
      }
    }
  }
}
```

The `language_hints` parameter biases the model toward specific languages and improves accuracy. With no hints, the model auto-detects the spoken language. Pass one hint for known-language calls and multiple hints for multilingual support centers. See [Flux Multilingual & Language Prompting](/docs/flux/language-prompting) for the full hint reference and supported languages.

When you use `flux-general-multi`, user `ConversationText` events include `languages_hinted` and `languages` fields. See [Conversation Text](/docs/voice-agent-conversation-text).

### Nova-3 multi configuration

* `agent.listen.provider.model`: `nova-3`
* `agent.listen.provider.language`: `multi`

## Pick your TTS model

| Your situation                  | Use this                                                  |
| ------------------------------- | --------------------------------------------------------- |
| Bilingual English/Spanish agent | Deepgram Aura codeswitching voice                         |
| Any other multilingual mix      | Cartesia, OpenAI, or Eleven Labs with `language: "multi"` |

### Deepgram Aura codeswitching (English/Spanish)

Aura ships five voices that switch between English and Spanish naturally inside one response: Aquila, Carina, Diana, Javier, and Selena.

* `agent.speak.provider.type`: `deepgram`
* `agent.speak.provider.model`: `aura-2-aquila-es` (or `aura-2-carina-es`, `aura-2-diana-es`, `aura-2-javier-es`, `aura-2-selena-es`)

These voices handle mixed-language responses without switching providers. See [TTS Models](/docs/tts-models#aura-2-spanish-voices-ea) for the full Spanish voice catalog.

### Third-party multilingual TTS

For other language combinations, set the speak provider to OpenAI, Eleven Labs, or Cartesia and pass `agent.speak.provider.language: "multi"`. For Eleven Labs, this parameter maps to `language_code`.

## Prompt for the language behavior you want

LLM behavior varies by provider. The prompt steers the agent toward a specific language strategy.

| Goal                                                                  | Prompt pattern                                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Mirror the user's language turn by turn (English ↔ Spanish ↔ English) | "Match the language of each user message independently."                                            |
| Force the agent to speak one language regardless of user input        | "Always respond in English, even if the user speaks another language."                              |
| Default to one language but mix in another when relevant              | "Respond in English unless the user speaks Spanish; if Spanish, mix Spanish and English naturally." |