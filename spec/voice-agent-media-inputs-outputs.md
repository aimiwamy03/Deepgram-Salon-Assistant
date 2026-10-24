> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Media Inputs & Outputs

Deepgram's APIs provides robust support for both media input and output settings, enabling users to customize audio data processing and output generation to suit a variety of Voice Agent applications.

## Speech to Text: Media Input Settings

Media input settings allow you to define the parameters for audio data submitted for processing. These settings help optimize the transcription process by specifying the characteristics of the audio data. Below is a summary of the available options for media input settings:

| Feature                            | Description                                              |
| ---------------------------------- | -------------------------------------------------------- |
| [Channels](/docs/channels)         | Specifies the number of audio channels in the input.     |
| [Encoding](/docs/encoding)         | Defines the audio encoding format.                       |
| [Multichannel](/docs/multichannel) | Allows for the processing of multi-channel audio inputs. |
| [Sample Rate](/docs/sample-rate)   | Indicates the sample rate of the audio data.             |

## Text to Speech: Media Output Settings

Once the input audio is processed, Deepgram provides robust options for generating speech output tailored to your voice agent's requirements. These settings enable customization of the synthesized audio or transcription results for downstream use.

| Feature                              | Description                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [Encoding](/docs/tts-encoding)       | Specifies the desired format of the resulting text-to-speech audio output                                 |
| [Bit Rate](/docs/tts-bit-rate)       | Specifies the desired bitrate of the resulting text-to-speech audio output.                               |
| [Container](/docs/tts-container)     | Specifies the desired file format wrapper for the output audio generated through text-to-speech synthesis |
| [Sample Rate](/docs/tts-sample-rate) | specifies the desired sample rate of the resulting text-to-speech audio output                            |

> **Warning**
>
> [Flux TTS](/docs/voice-agent-tts-models#flux-tts), the default `agent.speak` provider, streams raw audio: it accepts the `linear16`, `mulaw` and `alaw` encodings with no container or bit rate. Requesting a compressed encoding or a container returns `INVALID_SETTINGS`. Configure an Aura voice to use those formats.

## Learn More

| API            | Supported Inputs & Outputs                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Speech to Text | Please refer to the Speech to Text [Media Input Settings](/docs/media-input-settings) documentation for more information.                                 |
| Text to Speech | Please refer to the Text to Speech [Media Output Settings](/docs/tts-media-output-settings) documentation for more information.                           |
| Text to Speech | Please refer to the Text to Speech [Supported Audio Formats](/docs/tts-media-output-settings#supported-audio-formats) documentation for more information. |