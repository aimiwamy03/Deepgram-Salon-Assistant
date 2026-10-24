> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Multilingual Codeswitching

`language` *string* Option: `multi`

Pre-recorded  Streaming:Nova  Specific languages only

The Multilingual Codeswitching feature in Deepgram's API allows you to transcribe conversations where speakers switch between multiple languages. This guide will walk you through enabling this feature, how to use it with cURL, and how to analyze and interpret the response.

> **Info**
>
> Multilingual Code Switching is available on Nova-2, Nova-3, Nova-3 Medical (`nova-3-medical`), and Flux Multilingual (`flux-general-multi`). Nova-3 multilingual supports 55 languages. See [the list of supported languages](/docs/models-languages-overview) for each multilingual model.

## 1. Enable Feature

### Nova-2 / Nova-3

To enable Multilingual Codeswitching on Nova-2 or Nova-3, use the following language parameter in the query string when you call Deepgram's `/listen` endpoint:

`language=multi`

The same `language=multi` parameter works with `model=nova-3-medical` for multilingual transcription of medical audio.

### Pre-Recorded Audio

To transcribe audio from a file on your computer that contains multiple languages, run the following cURL command in a terminal or your favorite API client.

**`cURL`**

```bash cURL
curl \
  --request POST \
  --header 'Authorization: Token YOUR_DEEPGRAM_API_KEY' \
  --header 'Content-Type: audio/wav' \
  --data-binary @youraudio.wav \
  --url 'https://api.deepgram.com/v1/listen?language=multi&model=nova-3
```

> **Warning**
>
> Replace `YOUR_DEEPGRAM_API_KEY` with your [Deepgram API Key](/docs/create-additional-api-keys).

### Streaming Audio

To transcribe an audio stream, initiate a websocket connection, including the parameter `language=multi`. For instance:

> **Info**
>
> We recommend using an endpointing value of 100 ms for code-switching, `endpointing=100`.

```
wss://api.deepgram.com/v1/listen?language=multi&model=nova-3&sample_rate=44100&encoding=linear16&endpointing=100
```

### Nova-3 Language Hints

With Nova-3 (`model=nova-3&language=multi`), you can add one or more optional `language_hint` parameters to bias detection toward the languages you expect. Hints bias detection but do not restrict it, and the model still transcribes other supported languages it hears. Repeat the parameter to pass several hints.

Pre-recorded:

**`cURL`**

```bash cURL
curl \
  --request POST \
  --header 'Authorization: Token YOUR_DEEPGRAM_API_KEY' \
  --header 'Content-Type: audio/wav' \
  --data-binary @youraudio.wav \
  --url 'https://api.deepgram.com/v1/listen?model=nova-3&language=multi&language_hint=en&language_hint=es'
```

Streaming:

```
wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&language_hint=en&language_hint=es&encoding=linear16&sample_rate=16000&endpointing=100
```

`language_hint` only applies with `language=multi` and is ignored otherwise. Nova-2 does not support `language_hint`. A hint that is not a supported code fails the request with HTTP 400 (`INVALID_QUERY_PARAMETER`). See the [Nova-3 Language Prompting guide](/docs/nova-3-language-prompting) for usage scenarios and response details.

### Flux Multilingual

Flux Multilingual handles code-switching natively. Instead of `language=multi`, use `model=flux-general-multi` with optional `language_hint` parameters to bias toward expected languages.

```
wss://api.deepgram.com/v2/listen?model=flux-general-multi&language_hint=en&language_hint=es&encoding=linear16&sample_rate=16000
```

Flux returns detected languages in every `TurnInfo` event via the `languages` field. See the [Language Prompting guide](/docs/flux/language-prompting) for full details on usage scenarios and response format.

## 3. Analyze Response

### Pre-Recorded Audio

When the file is finished processing, you’ll receive a JSON response that has the following basic structure:

**`JSON`**

```json JSON

{
    "metadata": {
        "transaction_key": "deprecated",
        "request_id": "01a15a73-1cc4-7dc2-a9f6-f0e041521f9a",
        "sha256": "10d5f206c0d75ecb6e1bdf035f2a7b62665ed0a6afa2afb667c7c7028455659c",
        "created": "2026-10-20T17:54:20.349Z",
        "duration": 8.499937,
        "channels": 1,
        "models": [
            "5c5e97ef-6589-4dbd-9d7a-69b8827c9e78"
        ],
        "model_info": {
            "5c5e97ef-6589-4dbd-9d7a-69b8827c9e78": {
                "name": "general-nova-3",
                "version": "1990-01-01.1",
                "arch": "nova-3"
            }
        }
    },
    "results": {
        "channels": [
            {
                "alternatives": [
                    {
                        "transcript": "después de revisar su póliza de automóvil veo que actualmente cuenta con cobertura integral con un deducible de quinientos dólares",
                        "confidence": 1.0,
                        "languages": [
                            "es"
                        ],
                        "languages_hinted": [
                            "en",
                            "es"
                        ],
                        "words": [
                            {
                                "word": "después",
                                "start": 0.32,
                                "end": 0.79999995,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "de",
                                "start": 0.79999995,
                                "end": 0.88,
                                "confidence": 0.99902344,
                                "language": "es"
                            },
                            {
                                "word": "revisar",
                                "start": 0.88,
                                "end": 1.36,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "su",
                                "start": 1.36,
                                "end": 1.52,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "póliza",
                                "start": 1.52,
                                "end": 2.0,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "de",
                                "start": 2.0,
                                "end": 2.1599998,
                                "confidence": 0.99902344,
                                "language": "es"
                            },
                            {
                                "word": "automóvil",
                                "start": 2.1599998,
                                "end": 2.96,
                                "confidence": 0.9958008,
                                "language": "es"
                            },
                            {
                                "word": "veo",
                                "start": 2.96,
                                "end": 3.28,
                                "confidence": 0.9995117,
                                "language": "es"
                            },
                            {
                                "word": "que",
                                "start": 3.28,
                                "end": 3.4399998,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "actualmente",
                                "start": 3.4399998,
                                "end": 4.0,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "cuenta",
                                "start": 4.0,
                                "end": 4.3199997,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "con",
                                "start": 4.3199997,
                                "end": 4.56,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "cobertura",
                                "start": 4.56,
                                "end": 5.12,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "integral",
                                "start": 5.12,
                                "end": 5.7599998,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "con",
                                "start": 5.7599998,
                                "end": 6.0,
                                "confidence": 0.9550781,
                                "language": "es"
                            },
                            {
                                "word": "un",
                                "start": 6.0,
                                "end": 6.16,
                                "confidence": 0.99902344,
                                "language": "es"
                            },
                            {
                                "word": "deducible",
                                "start": 6.16,
                                "end": 6.72,
                                "confidence": 0.9482422,
                                "language": "es"
                            },
                            {
                                "word": "de",
                                "start": 6.72,
                                "end": 6.8799996,
                                "confidence": 1.0,
                                "language": "es"
                            },
                            {
                                "word": "quinientos",
                                "start": 6.8799996,
                                "end": 7.3599997,
                                "confidence": 0.9946289,
                                "language": "es"
                            },
                            {
                                "word": "dólares",
                                "start": 7.3599997,
                                "end": 9.36,
                                "confidence": 0.9970703,
                                "language": "es"
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
```

In this response, we see that each channel contains:

* **alternatives** object, which contains:

  * **transcript**: Transcript for the audio being processed.
  * **confidence**: Floating point value between 0 and 1 that indicates overall transcript reliability. Larger values indicate higher confidence.
  * **languages**: Array of [BCP-47](https://tools.ietf.org/html/bcp47) language tags for all detected languages in the channel, sorted in descending order of number of words per language.
  * **languages_hinted**: Array of the `language_hint` values for the request, normalized (`ES` → `es`; a regional code the model has no tag for becomes its base language, `en-GB` → `en`). Present on every Nova-3 multilingual response; an empty array when no hint was sent.
  * **words**: Object containing each word in the transcript, along with its start time and end time (in seconds) from the beginning of the audio, a word-level transcription confidence value, the language of the word, and the punctuated word if Smart Formatting is enabled.

### Streaming Audio

When streaming audio, a Results JSON message has the following structure:

**`JSON`**

```json JSON
{
    "type": "Results",
    "channel_index": [
        0,
        1
    ],
    "duration": 2.91,
    "start": 2.84,
    "is_final": true,
    "speech_final": true,
    "channel": {
        "alternatives": [
            {
                "transcript": "veo que actualmente cuenta con cobertura integral",
                "confidence": 1.0,
                "languages": [
                    "es"
                ],
                "languages_hinted": [
                    "en",
                    "es"
                ],
                "words": [
                    {
                        "word": "veo",
                        "start": 2.9199998,
                        "end": 3.32,
                        "confidence": 0.97314453,
                        "language": "es"
                    },
                    {
                        "word": "que",
                        "start": 3.32,
                        "end": 3.3999999,
                        "confidence": 1.0,
                        "language": "es"
                    },
                    {
                        "word": "actualmente",
                        "start": 3.3999999,
                        "end": 4.04,
                        "confidence": 1.0,
                        "language": "es"
                    },
                    {
                        "word": "cuenta",
                        "start": 4.04,
                        "end": 4.3599997,
                        "confidence": 1.0,
                        "language": "es"
                    },
                    {
                        "word": "con",
                        "start": 4.3599997,
                        "end": 4.52,
                        "confidence": 1.0,
                        "language": "es"
                    },
                    {
                        "word": "cobertura",
                        "start": 4.52,
                        "end": 5.08,
                        "confidence": 1.0,
                        "language": "es"
                    },
                    {
                        "word": "integral",
                        "start": 5.08,
                        "end": 5.4799995,
                        "confidence": 1.0,
                        "language": "es"
                    }
                ]
            }
        ]
    },
    "metadata": {
        "request_id": "01a15a73-2fe4-7be1-b95b-c3d34f6f3950",
        "model_info": {
            "name": "general-nova-3",
            "version": "1990-01-01.2",
            "arch": "nova-3"
        },
        "model_uuid": "60457470-46ba-4b26-8735-fb6853631a05"
    },
    "from_finalize": false
}
```

In this message, `channel.alternatives` contains:

* **transcript**: Transcript for the audio segment.
* **confidence**: Floating point value between 0 and 1 that indicates overall transcript reliability.
* **languages**: Array of [BCP-47](https://tools.ietf.org/html/bcp47) language tags for the languages detected in the segment, sorted in descending order of number of words per language.
* **languages_hinted**: Array of the `language_hint` values set when the connection opened, normalized (`ES` → `es`; a regional code the model has no tag for becomes its base language, `en-GB` → `en`). Present on every interim and final result of a Nova-3 multilingual stream; an empty array when no hint was sent.
* **words**: Each word in the segment with its start and end time, confidence, and detected `language`.

---