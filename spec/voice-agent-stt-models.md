> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# STT Models

The Voice Agent API uses Deepgram speech-to-text. Two model families are supported, and the agent picks the right STT endpoint based on the `version` field of `agent.listen.provider` — you do not manage endpoint URLs yourself.

* **Flux** for conversational voice agents that need model-integrated end-of-turn detection and ultra-low latency.
* **Nova** for conventional streaming transcription with the broadest feature set: smart formatting, language detection, multilingual code-switching, custom keyterms.

> **Info**
>
> You can set your Voice Agent's speech-to-text model in the [Settings Message](/docs/configure-voice-agent). See the docs for more information.

## Choosing a model family

|                       | Flux (V2)                                  | Nova (V1)                            |
| --------------------- | ------------------------------------------ | ------------------------------------ |
| Best for              | low-latency voice agents                   | broadest STT feature set             |
| End-of-turn detection | model-integrated                           | application-level (VAD)              |
| Smart formatting      | no                                         | yes                                  |
| Custom keyterms       | yes                                        | yes                                  |
| Multilingual          | `flux-general-multi` with `language_hints` | `language: multi` for code-switching |
| `provider.version`    | `v2` (required)                            | `v1` (default)                       |

For a deeper comparison see [Flux vs Nova-3](/docs/flux/flux-nova-3-comparison).

## Flux

Flux delivers first-of-its-kind model-integrated end-of-turn detection, configurable turn-taking dynamics, and ultra-low latency optimized for voice agent pipelines. See [Flux Feature Overview](/docs/flux/feature-overview) for details.

| Parameter                              | Type            | Description                                                                                                                                                               |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent.listen.provider.type`           | String          | Must be `deepgram`                                                                                                                                                        |
| `agent.listen.provider.version`        | String          | Must be `v2`                                                                                                                                                              |
| `agent.listen.provider.model`          | String          | Flux model id: `flux-general-en` or `flux-general-multi`                                                                                                                  |
| `agent.listen.provider.language_hints` | Array of String | BCP-47 codes that bias the multilingual model toward specific languages. Only valid with `flux-general-multi`. Without hints, the model auto-detects the spoken language. |
| `agent.listen.provider.keyterms`       | Array of String | Bias recognition toward important phrases. See [Keyterm Prompting](/docs/keyterm).                                                                                        |

### Example

**`JSON`**

```json JSON
{
  "agent": {
    "listen": {
      "provider": {
        "type": "deepgram",
        "version": "v2",
        "model": "flux-general-en",
        "keyterms": ["Deepgram", "Aura"]
      }
    }
  }
}
```

### Multilingual example

**`JSON`**

```json JSON
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

For multilingual prompting strategies and examples see [Flux Language Prompting](/docs/flux/language-prompting).

## Nova

| Parameter                            | Type            | Description                                                                        |
| ------------------------------------ | --------------- | ---------------------------------------------------------------------------------- |
| `agent.listen.provider.type`         | String          | Must be `deepgram`                                                                 |
| `agent.listen.provider.version`      | String          | Optional. Defaults to `v1` when omitted.                                           |
| `agent.listen.provider.model`        | String          | Nova model id, for example `nova-3` or `nova-2`.                                   |
| `agent.listen.provider.language`     | String          | BCP-47 language tag (`en`, `en-US`, `es`, etc.) or `multi` for code-switching.     |
| `agent.listen.provider.keyterms`     | Array of String | Bias recognition toward important phrases. See [Keyterm Prompting](/docs/keyterm). |
| `agent.listen.provider.smart_format` | Boolean         | Apply smart formatting to transcripts. Defaults to `false`.                        |

For the full list of Nova models and supported languages see [Models & Languages Overview](/docs/models-languages-overview).

### Example

**`JSON`**

```json JSON
{
  "agent": {
    "listen": {
      "provider": {
        "type": "deepgram",
        "model": "nova-3",
        "language": "en-US",
        "smart_format": true,
        "keyterms": ["Deepgram", "Aura"]
      }
    }
  }
}
```

---

## What's Next

* [Configure the Voice Agent](/docs/configure-voice-agent)
* [Multilingual Voice Agents](/docs/multilingual-voice-agent)
* [Models & Languages Overview](/docs/models-languages-overview)