> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Nova-3 Language Prompting

Pre-recorded  Streaming:Nova

Nova-3 multilingual (`model=nova-3&language=multi`) transcribes 55 languages with one model, including speech that switches languages mid-conversation. The optional `language_hint` parameter biases detection toward the languages you expect. Without hints, the model auto-detects the spoken language.

Nova-3 multilingual uses the same `/v1/listen` endpoints, model string, and API key you already use for pre-recorded and streaming transcription.

## Supported Languages

| Language                         | Code                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| Afrikaans                        | `af`                                                       |
| Arabic                           | `ar`                                                       |
| Belarusian                       | `be`                                                       |
| Bengali                          | `bn`                                                       |
| Bosnian                          | `bs`                                                       |
| Bulgarian                        | `bg`                                                       |
| Catalan                          | `ca`                                                       |
| Chinese (Cantonese, Traditional) | `zh-HK`                                                    |
| Chinese (Mandarin, Simplified)   | `zh`, `zh-CN`, `zh-Hans`                                   |
| Croatian                         | `hr`                                                       |
| Czech                            | `cs`                                                       |
| Danish                           | `da`                                                       |
| Dutch                            | `nl`                                                       |
| English                          | `en`, `en-US`, `en-GB`, `en-AU`, `en-NZ`, `en-IN`, `en-CA` |
| Estonian                         | `et`                                                       |
| Finnish                          | `fi`                                                       |
| Flemish                          | `nl-BE`                                                    |
| French                           | `fr`                                                       |
| Galician                         | `gl`                                                       |
| German                           | `de`                                                       |
| Greek                            | `el`                                                       |
| Gujarati                         | `gu`                                                       |
| Hebrew                           | `he`                                                       |
| Hindi                            | `hi`                                                       |
| Hungarian                        | `hu`                                                       |
| Indonesian                       | `id`                                                       |
| Italian                          | `it`                                                       |
| Japanese                         | `ja`                                                       |
| Kannada                          | `kn`                                                       |
| Korean                           | `ko`                                                       |
| Latvian                          | `lv`                                                       |
| Lithuanian                       | `lt`                                                       |
| Macedonian                       | `mk`                                                       |
| Malay                            | `ms`                                                       |
| Marathi                          | `mr`                                                       |
| Norwegian                        | `no`                                                       |
| Persian                          | `fa`                                                       |
| Polish                           | `pl`                                                       |
| Portuguese                       | `pt`                                                       |
| Romanian                         | `ro`                                                       |
| Russian                          | `ru`                                                       |
| Serbian                          | `sr`                                                       |
| Slovak                           | `sk`                                                       |
| Slovenian                        | `sl`                                                       |
| Spanish                          | `es`                                                       |
| Swedish                          | `sv`                                                       |
| Tagalog                          | `tl`                                                       |
| Tamil                            | `ta`                                                       |
| Telugu                           | `te`                                                       |
| Thai                             | `th`                                                       |
| Turkish                          | `tr`                                                       |
| Ukrainian                        | `uk`                                                       |
| Vietnamese                       | `vi`                                                       |
| Xhosa                            | `xh`                                                       |
| Zulu                             | `zu`                                                       |

> **Info**
>
> Locale subtags (for example, `en-GB` or `pt-BR`) are accepted as hints, resolve to the base language, and are returned as the base code in `languages_hinted`.

## The `language_hint` Parameter

`language_hint` *string or array of strings* (optional, repeatable)

Pass one or more `language_hint` values to bias detection toward specific languages. Repeat the parameter to pass several hints, for example `language_hint=en&language_hint=es`. Hints bias detection; they do not restrict it, so the model still transcribes any supported language it hears.

| Behavior           | Description                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| **Single hint**    | Biases toward one language. Use it when you know the language ahead of time.  |
| **Multiple hints** | Biases toward a set of languages. Use it for bilingual or multilingual audio. |
| **No hint**        | The model auto-detects the language. Use it when the language is unknown.     |

> **Warning**
>
> `language_hint` only applies when `language=multi`; with any other `language` value it is ignored. Nova-2 does not support `language_hint`. A hint that is not one of the codes in the Supported Languages table fails the request with HTTP 400 `INVALID_QUERY_PARAMETER`; for streaming, the WebSocket connection is rejected with HTTP 400.

Set hints per request for pre-recorded audio, or in the connection URL for streaming audio. Hints stay fixed for the life of a streaming connection.

## Usage Scenarios

The examples below use the streaming endpoint. The same `language_hint` values work on pre-recorded requests to `https://api.deepgram.com/v1/listen`.

### 1. Known Single Language

When you know the speaker's language ahead of time (for example, a Spanish-language call center), set a single `language_hint`.

```
wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&language_hint=es&encoding=linear16&sample_rate=16000
```

### 2. Known Subset of Languages

When speakers may use one of several languages (for example, a bilingual English/Spanish support line), pass multiple hints. The model biases toward the set and still transcribes whichever language is spoken.

```
wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&language_hint=en&language_hint=es&encoding=linear16&sample_rate=16000
```

### 3. Unknown Language

When you don't know which language the speaker will use, omit `language_hint`. The model auto-detects the language from the audio.

```
wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&encoding=linear16&sample_rate=16000
```

### 4. Code-Switching

When speakers switch between languages mid-conversation, hint every language you expect, or send no hints. Nova-3 multilingual handles mid-sentence language switches natively.

```
wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&language_hint=en&language_hint=es&language_hint=fr&encoding=linear16&sample_rate=16000
```

## Language Fields in the Response

With `language=multi`, each alternative in the response includes these fields:

| Field              | Type                  | Description                                                                                                                                                                                                                                                                                           |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `languages`        | string array (BCP-47) | Languages detected in the transcript, sorted by word count (descending). Also returned on each utterance when `utterances=true`.                                                                                                                                                                      |
| `languages_hinted` | string array          | The `language_hint` values for the request or connection, normalized: canonical case (`ES` → `es`, `zh-hk` → `zh-HK`), and a regional code the model has no tag for becomes its base language (`en-GB` → `en`). Returned on every Nova-3 multilingual response; an empty array when no hint was sent. |
| `words[].language` | string (BCP-47)       | The detected language of each word.                                                                                                                                                                                                                                                                   |

Pre-recorded responses return these fields in `results.channels[].alternatives[]`. Streaming responses return them in `channel.alternatives[]` on every interim and final result.

### Pre-Recorded Example

**`cURL`**

```bash cURL
curl \
  --request POST \
  --header 'Authorization: Token YOUR_DEEPGRAM_API_KEY' \
  --header 'Content-Type: audio/wav' \
  --data-binary @youraudio.wav \
  --url 'https://api.deepgram.com/v1/listen?model=nova-3&language=multi&language_hint=en&language_hint=es'
```

The response, trimmed to the language fields:

```json
{
  "results": {
    "channels": [
      {
        "alternatives": [
          {
            "transcript": "después de revisar su póliza de automóvil veo que actualmente cuenta con cobertura integral con un deducible de quinientos dólares",
            "confidence": 1.0,
            "languages": ["es"],
            "languages_hinted": ["en", "es"],
            "words": [
              { "word": "después", "start": 0.32, "end": 0.79999995, "confidence": 1.0, "language": "es" },
              { "word": "de", "start": 0.79999995, "end": 0.88, "confidence": 0.99902344, "language": "es" },
              { "word": "revisar", "start": 0.88, "end": 1.36, "confidence": 1.0, "language": "es" },
              { "word": "su", "start": 1.36, "end": 1.52, "confidence": 1.0, "language": "es" },
              { "word": "póliza", "start": 1.52, "end": 2.0, "confidence": 1.0, "language": "es" },
              { "word": "de", "start": 2.0, "end": 2.1599998, "confidence": 0.99902344, "language": "es" },
              { "word": "automóvil", "start": 2.1599998, "end": 2.96, "confidence": 0.9958008, "language": "es" },
              { "word": "veo", "start": 2.96, "end": 3.28, "confidence": 0.9995117, "language": "es" },
              { "word": "que", "start": 3.28, "end": 3.4399998, "confidence": 1.0, "language": "es" },
              { "word": "actualmente", "start": 3.4399998, "end": 4.0, "confidence": 1.0, "language": "es" },
              { "word": "cuenta", "start": 4.0, "end": 4.3199997, "confidence": 1.0, "language": "es" },
              { "word": "con", "start": 4.3199997, "end": 4.56, "confidence": 1.0, "language": "es" },
              { "word": "cobertura", "start": 4.56, "end": 5.12, "confidence": 1.0, "language": "es" },
              { "word": "integral", "start": 5.12, "end": 5.7599998, "confidence": 1.0, "language": "es" },
              { "word": "con", "start": 5.7599998, "end": 6.0, "confidence": 0.9550781, "language": "es" },
              { "word": "un", "start": 6.0, "end": 6.16, "confidence": 0.99902344, "language": "es" },
              { "word": "deducible", "start": 6.16, "end": 6.72, "confidence": 0.9482422, "language": "es" },
              { "word": "de", "start": 6.72, "end": 6.8799996, "confidence": 1.0, "language": "es" },
              { "word": "quinientos", "start": 6.8799996, "end": 7.3599997, "confidence": 0.9946289, "language": "es" },
              { "word": "dólares", "start": 7.3599997, "end": 9.36, "confidence": 0.9970703, "language": "es" }
            ]
          }
        ]
      }
    ]
  }
}
```

### Streaming Example

Open a WebSocket connection with hints in the URL:

```
wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&language_hint=en&language_hint=es&encoding=linear16&sample_rate=16000
```

Each `Results` message, interim and final, includes the language fields:

```json
{
  "type": "Results",
  "channel_index": [0, 1],
  "duration": 2.91,
  "start": 2.84,
  "is_final": true,
  "speech_final": true,
  "channel": {
    "alternatives": [
      {
        "transcript": "veo que actualmente cuenta con cobertura integral",
        "confidence": 1.0,
        "languages": ["es"],
        "languages_hinted": ["en", "es"],
        "words": [
          { "word": "veo", "start": 2.9199998, "end": 3.32, "confidence": 0.97314453, "language": "es" },
          { "word": "que", "start": 3.32, "end": 3.3999999, "confidence": 1.0, "language": "es" },
          { "word": "actualmente", "start": 3.3999999, "end": 4.04, "confidence": 1.0, "language": "es" },
          { "word": "cuenta", "start": 4.04, "end": 4.3599997, "confidence": 1.0, "language": "es" },
          { "word": "con", "start": 4.3599997, "end": 4.52, "confidence": 1.0, "language": "es" },
          { "word": "cobertura", "start": 4.52, "end": 5.08, "confidence": 1.0, "language": "es" },
          { "word": "integral", "start": 5.08, "end": 5.4799995, "confidence": 1.0, "language": "es" }
        ]
      }
    ]
  }
}
```

Use the `languages` field to route downstream processing, for example to pick the TTS voice or LLM prompt language that matches what the speaker said.

## Related Resources

* [Multilingual Codeswitching](/docs/multilingual-code-switching) — Codeswitching on Nova-2, Nova-3, and Flux
* [Flux Multilingual & Language Prompting](/docs/flux/language-prompting) — Language hints for Flux on `/v2/listen`
* [Models & Languages Overview](/docs/models-languages-overview#nova-3) — All models and supported languages
* [Pre-Recorded API Reference](/reference/speech-to-text/listen-pre-recorded) — `POST /v1/listen`
* [Streaming API Reference](/reference/speech-to-text/listen-streaming) — `WS /v1/listen`