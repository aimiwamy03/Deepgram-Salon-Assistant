> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://developers.deepgram.com/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://developers.deepgram.com/_mcp/server.

# Voices and Languages

`model` *string*

Text to Speech Request  Text to Speech Stream

Deepgram offers a range of voices for its Aura text-to-speech API, each identified by a unique model name following the format `[modelname]-[voicename]-[language]`.

To select a model, use the syntax `model=aura-2-thalia-en`

## Example

**`CURL`**

```curl CURL
curl "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en" \
> -H "Content-Type: application/json" \
> -H "Authorization: Token YOUR_DEEPGRAM_API_KEY" \
> -d "{\"text\":\"Hello how are you?\"}" \
> --output outputfile_voice_model.wav \
> --fail-with-body \
> --silent || echo "Request failed"
```

> **Warning**
>
> Replace `YOUR_DEEPGRAM_API_KEY` with your [Deepgram API Key](/docs/create-additional-api-keys).

## Language Support

Deepgram's Aura text-to-speech supports the following languages:

* **English (en)** - American, British, Australian, Irish, Filipino accents
* **Spanish (es)** - Mexican, Peninsular, Colombian, Latin American accents
* **German (de)**
* **French (fr)**
* **Dutch (nl)**
* **Italian (it)**
* **Japanese (ja)**

> **Info**
>
> We're constantly adding additional language support and making improvements to our voice models. Check back regularly for updates.

---

## Aura-2 English Voices

### Featured Aura-2 English Voices

These are our featured English voices, selected for their versatility and quality:

| Model                 | Name      | Sample | Expressed Gender | Age   | Language | Accent   | Characteristics                            | Use Cases                          |
| :-------------------- | :-------- | :----- | :--------------- | :---- | :------- | :------- | :----------------------------------------- | :--------------------------------- |
| `aura-2-thalia-en`    | thalia    |        | feminine         | Adult | en-us    | American | Clear, Confident, Energetic, Enthusiastic  | Casual chat, customer service, IVR |
| `aura-2-andromeda-en` | andromeda |        | feminine         | Adult | en-us    | American | Casual, Expressive, Comfortable            | Customer service, IVR              |
| `aura-2-helena-en`    | helena    |        | feminine         | Adult | en-us    | American | Caring, Natural, Positive, Friendly, Raspy | IVR, casual chat                   |
| `aura-2-apollo-en`    | apollo    |        | masculine        | Adult | en-us    | American | Confident, Comfortable, Casual             | Casual chat                        |
| `aura-2-arcas-en`     | arcas     |        | masculine        | Adult | en-us    | American | Natural, Smooth, Clear, Comfortable        | Customer service, casual chat      |
| `aura-2-aries-en`     | aries     |        | masculine        | Adult | en-us    | American | Warm, Energetic, Caring                    | Casual chat                        |

### Aura-2: All Available English Voices

| Model                 | Name      | Sample | Expressed Gender | Age         | Language | Accent     | Characteristics                                 | Use Cases                                 |
| :-------------------- | :-------- | :----- | :--------------- | :---------- | :------- | :--------- | :---------------------------------------------- | :---------------------------------------- |
| `aura-2-amalthea-en`  | amalthea  |        | feminine         | Young Adult | en-ph    | Filipino   | Engaging, Natural, Cheerful                     | Casual chat                               |
| `aura-2-andromeda-en` | andromeda |        | feminine         | Adult       | en-us    | American   | Casual, Expressive, Comfortable                 | Customer service, IVR                     |
| `aura-2-apollo-en`    | apollo    |        | masculine        | Adult       | en-us    | American   | Confident, Comfortable, Casual                  | Casual chat                               |
| `aura-2-arcas-en`     | arcas     |        | masculine        | Adult       | en-us    | American   | Natural, Smooth, Clear, Comfortable             | Customer service, casual chat             |
| `aura-2-aries-en`     | aries     |        | masculine        | Adult       | en-us    | American   | Warm, Energetic, Caring                         | Casual chat                               |
| `aura-2-asteria-en`   | asteria   |        | feminine         | Adult       | en-us    | American   | Clear, Confident, Knowledgeable, Energetic      | Advertising                               |
| `aura-2-athena-en`    | athena    |        | feminine         | Mature      | en-us    | American   | Calm, Smooth, Professional                      | Storytelling                              |
| `aura-2-atlas-en`     | atlas     |        | masculine        | Mature      | en-us    | American   | Enthusiastic, Confident, Approachable, Friendly | Advertising                               |
| `aura-2-aurora-en`    | aurora    |        | feminine         | Adult       | en-us    | American   | Cheerful, Expressive, Energetic                 | Interview                                 |
| `aura-2-callista-en`  | callista  |        | feminine         | Adult       | en-us    | American   | Clear, Energetic, Professional, Smooth          | IVR                                       |
| `aura-2-cora-en`      | cora      |        | feminine         | Adult       | en-us    | American   | Smooth, Melodic, Caring                         | Storytelling                              |
| `aura-2-cordelia-en`  | cordelia  |        | feminine         | Young Adult | en-us    | American   | Approachable, Warm, Polite                      | Storytelling                              |
| `aura-2-delia-en`     | delia     |        | feminine         | Young Adult | en-us    | American   | Casual, Friendly, Cheerful, Breathy             | Interview                                 |
| `aura-2-draco-en`     | draco     |        | masculine        | Adult       | en-gb    | British    | Warm, Approachable, Trustworthy, Baritone       | Storytelling                              |
| `aura-2-electra-en`   | electra   |        | feminine         | Adult       | en-us    | American   | Professional, Engaging, Knowledgeable           | IVR, advertising, customer service        |
| `aura-2-harmonia-en`  | harmonia  |        | feminine         | Adult       | en-us    | American   | Empathetic, Clear, Calm, Confident              | Customer service                          |
| `aura-2-helena-en`    | helena    |        | feminine         | Adult       | en-us    | American   | Caring, Natural, Positive, Friendly, Raspy      | IVR, casual chat                          |
| `aura-2-hera-en`      | hera      |        | feminine         | Adult       | en-us    | American   | Smooth, Warm, Professional                      | Informative                               |
| `aura-2-hermes-en`    | hermes    |        | masculine        | Adult       | en-us    | American   | Expressive, Engaging, Professional              | Informative                               |
| `aura-2-hyperion-en`  | hyperion  |        | masculine        | Adult       | en-au    | Australian | Caring, Warm, Empathetic                        | Interview                                 |
| `aura-2-iris-en`      | iris      |        | feminine         | Young Adult | en-us    | American   | Cheerful, Positive, Approachable                | IVR, advertising, customer service        |
| `aura-2-janus-en`     | janus     |        | feminine         | Adult       | en-us    | American   | Southern, Smooth, Trustworthy                   | Storytelling                              |
| `aura-2-juno-en`      | juno      |        | feminine         | Adult       | en-us    | American   | Natural, Engaging, Melodic, Breathy             | Interview                                 |
| `aura-2-jupiter-en`   | jupiter   |        | masculine        | Adult       | en-us    | American   | Expressive, Knowledgeable, Baritone             | Informative                               |
| `aura-2-luna-en`      | luna      |        | feminine         | Young Adult | en-us    | American   | Friendly, Natural, Engaging                     | IVR                                       |
| `aura-2-mars-en`      | mars      |        | masculine        | Adult       | en-us    | American   | Smooth, Patient, Trustworthy, Baritone          | Customer service                          |
| `aura-2-minerva-en`   | minerva   |        | feminine         | Adult       | en-us    | American   | Positive, Friendly, Natural                     | Storytelling                              |
| `aura-2-neptune-en`   | neptune   |        | masculine        | Adult       | en-us    | American   | Professional, Patient, Polite                   | Customer service                          |
| `aura-2-odysseus-en`  | odysseus  |        | masculine        | Adult       | en-us    | American   | Calm, Smooth, Comfortable, Professional         | Advertising                               |
| `aura-2-ophelia-en`   | ophelia   |        | feminine         | Adult       | en-us    | American   | Expressive, Enthusiastic, Cheerful              | Interview                                 |
| `aura-2-orion-en`     | orion     |        | masculine        | Adult       | en-us    | American   | Approachable, Comfortable, Calm, Polite         | Informative                               |
| `aura-2-orpheus-en`   | orpheus   |        | masculine        | Adult       | en-us    | American   | Professional, Clear, Confident, Trustworthy     | Customer service, storytelling            |
| `aura-2-pandora-en`   | pandora   |        | feminine         | Adult       | en-gb    | British    | Smooth, Calm, Melodic, Breathy                  | IVR, informative                          |
| `aura-2-phoebe-en`    | phoebe    |        | feminine         | Adult       | en-us    | American   | Energetic, Warm, Casual                         | Customer service                          |
| `aura-2-pluto-en`     | pluto     |        | masculine        | Adult       | en-us    | American   | Smooth, Calm, Empathetic, Baritone              | Interview, storytelling                   |
| `aura-2-saturn-en`    | saturn    |        | masculine        | Adult       | en-us    | American   | Knowledgeable, Confident, Baritone              | Customer service                          |
| `aura-2-selene-en`    | selene    |        | feminine         | Adult       | en-us    | American   | Expressive, Engaging, Energetic                 | Informative                               |
| `aura-2-thalia-en`    | thalia    |        | feminine         | Adult       | en-us    | American   | Clear, Confident, Energetic, Enthusiastic       | Casual chat, customer service, IVR        |
| `aura-2-theia-en`     | theia     |        | feminine         | Adult       | en-au    | Australian | Expressive, Polite, Sincere                     | Informative                               |
| `aura-2-vesta-en`     | vesta     |        | feminine         | Adult       | en-us    | American   | Natural, Expressive, Patient, Empathetic        | Customer service, interview, storytelling |
| `aura-2-zeus-en`      | zeus      |        | masculine        | Adult       | en-us    | American   | Deep, Trustworthy, Smooth                       | IVR                                       |

---

## Aura-2 Spanish Voices

### Featured Aura-2 Spanish Voices

These are our featured Spanish voices, selected for their versatility and quality:

| Model                | Name     | Sample | Expressed Gender | Age         | Language | Accent     | Characteristics                                      | Use Cases                     |
| :------------------- | :------- | :----- | :--------------- | :---------- | :------- | :--------- | :--------------------------------------------------- | :---------------------------- |
| `aura-2-celeste-es`  | celeste  |        | feminine         | Young Adult | es-co    | Colombian  | Clear, Energetic, Positive, Friendly, Enthusiastic   | Casual Chat, Advertising, IVR |
| `aura-2-estrella-es` | estrella |        | feminine         | Mature      | es-mx    | Mexican    | Approachable, Natural, Calm, Comfortable, Expressive | Casual Chat, Interview        |
| `aura-2-nestor-es`   | nestor   |        | masculine        | Adult       | es-es    | Peninsular | Calm, Professional, Approachable, Clear, Confident   | Casual Chat, Customer Service |

### Aura-2: All Available Spanish Voices

| Model                | Name     | Sample | Expressed Gender | Age         | Language | Accent         | Characteristics                                             | Use Cases                                |
| :------------------- | :------- | :----- | :--------------- | :---------- | :------- | :------------- | :---------------------------------------------------------- | :--------------------------------------- |
| `aura-2-sirio-es`    | sirio    |        | masculine        | Adult       | es-mx    | Mexican        | Calm, Professional, Comfortable, Empathetic, Baritone       | Casual Chat, Interview                   |
| `aura-2-nestor-es`   | nestor   |        | masculine        | Adult       | es-es    | Peninsular     | Calm, Professional, Approachable, Clear, Confident          | Casual Chat, Customer Service            |
| `aura-2-carina-es`   | carina   |        | feminine         | Adult       | es-es    | Peninsular     | Professional, Raspy, Energetic, Breathy, Confident          | Interview, Customer Service, IVR         |
| `aura-2-celeste-es`  | celeste  |        | feminine         | Young Adult | es-co    | Colombian      | Clear, Energetic, Positive, Friendly, Enthusiastic          | Casual Chat, Advertising, IVR            |
| `aura-2-alvaro-es`   | alvaro   |        | masculine        | Adult       | es-es    | Peninsular     | Calm, Professional, Clear, Knowledgeable, Approachable      | Interview, Customer Service              |
| `aura-2-diana-es`    | diana    |        | feminine         | Adult       | es-es    | Peninsular     | Professional, Confident, Expressive, Polite, Knowledgeable  | Storytelling, Advertising                |
| `aura-2-aquila-es`   | aquila   |        | masculine        | Adult       | es-419   | Latin American | Expressive, Enthusiastic, Confident, Casual, Comfortable    | Casual Chat, Informative                 |
| `aura-2-selena-es`   | selena   |        | feminine         | Young Adult | es-419   | Latin American | Approachable, Casual, Friendly, Calm, Positive              | Customer Service, Informative            |
| `aura-2-estrella-es` | estrella |        | feminine         | Mature      | es-mx    | Mexican        | Approachable, Natural, Calm, Comfortable, Expressive        | Casual Chat, Interview                   |
| `aura-2-javier-es`   | javier   |        | masculine        | Adult       | es-mx    | Mexican        | Approachable, Professional, Friendly, Comfortable, Calm     | Casual Chat, IVR, Storytelling           |
| `aura-2-agustina-es` | agustina |        | feminine         | Adult       | es-es    | Peninsular     | Calm, Clear, Expressive, Knowledgeable, Professional        | Interview, Casual Chat                   |
| `aura-2-antonia-es`  | antonia  |        | feminine         | Adult       | es-ar    | Argentine      | Approachable, Enthusiastic, Friendly, Natural, Professional | Customer Service, Interview, Casual Chat |
| `aura-2-gloria-es`   | gloria   |        | feminine         | Young Adult | es-co    | Colombian      | Casual, Clear, Expressive, Natural, Smooth                  | Customer Service, Casual Chat            |
| `aura-2-luciano-es`  | luciano  |        | masculine        | Adult       | es-mx    | Mexican        | Charismatic, Cheerful, Energetic, Expressive, Friendly      | Customer Service, Casual Chat            |
| `aura-2-olivia-es`   | olivia   |        | feminine         | Adult       | es-mx    | Mexican        | Breathy, Calm, Casual, Expressive, Warm                     | Customer Service, Casual Chat            |
| `aura-2-silvia-es`   | silvia   |        | feminine         | Adult       | es-es    | Peninsular     | Charismatic, Clear, Expressive, Natural, Warm               | Customer Service, Casual Chat            |
| `aura-2-valerio-es`  | valerio  |        | masculine        | Adult       | es-mx    | Mexican        | Deep, Knowledgeable, Natural, Polite, Professional          | Customer Service, Informative            |

> **Info**
>
> **Codeswitching Voices**: The following Spanish voices can seamlessly switch between English and Spanish: Aquila, Carina, Diana, Javier, and Selena.

---

## Aura-2 Dutch Voices

### Featured Aura-2 Dutch Voices

These are our featured Dutch voices, selected for their versatility and quality:

| Model               | Name    | Sample | Expressed Gender | Age   | Language | Accent | Characteristics                                     | Use Cases        |
| :------------------ | :------ | :----- | :--------------- | :---- | :------- | :----- | :-------------------------------------------------- | :--------------- |
| `aura-2-rhea-nl`    | rhea    |        | feminine         | Adult | nl-nl    | Dutch  | Caring, Knowledgeable, Positive, Smooth, Warm       | Customer Service |
| `aura-2-sander-nl`  | sander  |        | masculine        | Adult | nl-nl    | Dutch  | Calm, Clear, Deep, Professional, Smooth             | Customer Service |
| `aura-2-beatrix-nl` | beatrix |        | feminine         | Adult | nl-nl    | Dutch  | Cheerful, Enthusiastic, Friendly, Trustworthy, Warm | Customer Service |

### Aura-2: All Available Dutch Voices

| Model                | Name     | Sample | Expressed Gender | Age   | Language | Accent | Characteristics                                           | Use Cases                                     |
| :------------------- | :------- | :----- | :--------------- | :---- | :------- | :----- | :-------------------------------------------------------- | :-------------------------------------------- |
| `aura-2-beatrix-nl`  | beatrix  |        | feminine         | Adult | nl-nl    | Dutch  | Cheerful, Enthusiastic, Friendly, Trustworthy, Warm       | Customer Service                              |
| `aura-2-daphne-nl`   | daphne   |        | feminine         | Adult | nl-nl    | Dutch  | Calm, Clear, Confident, Professional, Smooth              | Healthcare, Interview, Casual Chat, Audiobook |
| `aura-2-cornelia-nl` | cornelia |        | feminine         | Adult | nl-nl    | Dutch  | Approachable, Friendly, Polite, Positive, Warm            | Customer Service                              |
| `aura-2-sander-nl`   | sander   |        | masculine        | Adult | nl-nl    | Dutch  | Calm, Clear, Deep, Professional, Smooth                   | Customer Service                              |
| `aura-2-hestia-nl`   | hestia   |        | feminine         | Adult | nl-nl    | Dutch  | Approachable, Caring, Expressive, Friendly, Knowledgeable | Customer Service                              |
| `aura-2-lars-nl`     | lars     |        | masculine        | Adult | nl-nl    | Dutch  | Breathy, Casual, Comfortable, Sincere, Trustworthy        | Customer Service                              |
| `aura-2-roman-nl`    | roman    |        | masculine        | Adult | nl-nl    | Dutch  | Calm, Casual, Deep, Natural, Patient                      | Customer Service                              |
| `aura-2-rhea-nl`     | rhea     |        | feminine         | Adult | nl-nl    | Dutch  | Caring, Knowledgeable, Positive, Smooth, Warm             | Customer Service                              |
| `aura-2-leda-nl`     | leda     |        | feminine         | Adult | nl-nl    | Dutch  | Caring, Comfortable, Empathetic, Friendly, Sincere        | Sales                                         |

---

## Aura-2 French Voices

### Featured Aura-2 French Voices

These are our featured French voices, selected for their versatility and quality:

| Model              | Name   | Sample | Expressed Gender | Age   | Language | Accent | Characteristics                                        | Use Cases        |
| :----------------- | :----- | :----- | :--------------- | :---- | :------- | :----- | :----------------------------------------------------- | :--------------- |
| `aura-2-agathe-fr` | agathe |        | feminine         | Adult | fr-fr    | French | Charismatic, Cheerful, Enthusiastic, Friendly, Natural | Customer Service |
| `aura-2-hector-fr` | hector |        | masculine        | Adult | fr-fr    | French | Confident, Empathetic, Expressive, Friendly, Patient   | Customer Service |

### Aura-2: All Available French Voices

| Model              | Name   | Sample | Expressed Gender | Age   | Language | Accent | Characteristics                                        | Use Cases        |
| :----------------- | :----- | :----- | :--------------- | :---- | :------- | :----- | :----------------------------------------------------- | :--------------- |
| `aura-2-agathe-fr` | agathe |        | feminine         | Adult | fr-fr    | French | Charismatic, Cheerful, Enthusiastic, Friendly, Natural | Customer Service |
| `aura-2-hector-fr` | hector |        | masculine        | Adult | fr-fr    | French | Confident, Empathetic, Expressive, Friendly, Patient   | Customer Service |

---

## Aura-2 German Voices

### Featured Aura-2 German Voices

These are our featured German voices, selected for their versatility and quality:

| Model                | Name     | Sample | Expressed Gender | Age   | Language | Accent | Characteristics                                     | Use Cases        |
| :------------------- | :------- | :----- | :--------------- | :---- | :------- | :----- | :-------------------------------------------------- | :--------------- |
| `aura-2-julius-de`   | julius   |        | masculine        | Adult | de-de    | German | Casual, Cheerful, Engaging, Expressive, Friendly    | Customer Service |
| `aura-2-viktoria-de` | viktoria |        | feminine         | Adult | de-de    | German | Charismatic, Cheerful, Enthusiastic, Friendly, Warm | Customer Service |

### Aura-2: All Available German Voices

| Model                | Name     | Sample | Expressed Gender | Age         | Language | Accent | Characteristics                                         | Use Cases                                               |
| :------------------- | :------- | :----- | :--------------- | :---------- | :------- | :----- | :------------------------------------------------------ | :------------------------------------------------------ |
| `aura-2-elara-de`    | elara    |        | feminine         | Adult       | de-de    | German | Calm, Clear, Natural, Patient, Trustworthy              | Healthcare, Customer Service, Sales, Financial Services |
| `aura-2-aurelia-de`  | aurelia  |        | feminine         | Young Adult | de-de    | German | Approachable, Casual, Comfortable, Natural, Sincere     | Healthcare, Customer Service, Sales, Financial Services |
| `aura-2-lara-de`     | lara     |        | feminine         | Young Adult | de-de    | German | Caring, Cheerful, Empathetic, Expressive, Warm          | Healthcare, Customer Service, Sales, Financial Services |
| `aura-2-julius-de`   | julius   |        | masculine        | Adult       | de-de    | German | Casual, Cheerful, Engaging, Expressive, Friendly        | Healthcare, Customer Service, Sales, Financial Services |
| `aura-2-fabian-de`   | fabian   |        | masculine        | Mature      | de-de    | German | Confident, Knowledgeable, Natural, Polite, Professional | Healthcare, Customer Service, Sales, Financial Services |
| `aura-2-kara-de`     | kara     |        | feminine         | Young Adult | de-de    | German | Caring, Empathetic, Expressive, Professional, Warm      | Healthcare, Customer Service, Sales, Financial Services |
| `aura-2-viktoria-de` | viktoria |        | feminine         | Adult       | de-de    | German | Charismatic, Cheerful, Enthusiastic, Friendly, Warm     | Healthcare, Customer Service, Sales, Financial Services |

---

## Aura-2 Italian Voices

### Featured Aura-2 Italian Voices

These are our featured Italian voices, selected for their versatility and quality:

| Model                | Name     | Sample | Expressed Gender | Age   | Language | Accent  | Characteristics                                     | Use Cases        |
| :------------------- | :------- | :----- | :--------------- | :---- | :------- | :------ | :-------------------------------------------------- | :--------------- |
| `aura-2-livia-it`    | livia    |        | feminine         | Adult | it-it    | Italian | Approachable, Cheerful, Clear, Engaging, Expressive | Customer Service |
| `aura-2-dionisio-it` | dionisio |        | masculine        | Adult | it-it    | Italian | Confident, Engaging, Friendly, Melodic, Positive    | Sales            |

### Aura-2: All Available Italian Voices

| Model                | Name     | Sample | Expressed Gender | Age         | Language | Accent  | Characteristics                                        | Use Cases                                     |
| :------------------- | :------- | :----- | :--------------- | :---------- | :------- | :------ | :----------------------------------------------------- | :-------------------------------------------- |
| `aura-2-melia-it`    | melia    |        | feminine         | Adult       | it-it    | Italian | Clear, Comfortable, Engaging, Friendly, Natural        | Casual Chat, Customer Service, Interview      |
| `aura-2-elio-it`     | elio     |        | masculine        | Adult       | it-it    | Italian | Breathy, Calm, Professional, Smooth, Trustworthy       | Interview, Casual Chat, Customer Service      |
| `aura-2-flavio-it`   | flavio   |        | masculine        | Adult       | it-it    | Italian | Confident, Deep, Empathetic, Professional, Trustworthy | Casual Chat, Interview, Customer Service      |
| `aura-2-maia-it`     | maia     |        | feminine         | Young Adult | it-it    | Italian | Caring, Energetic, Expressive, Professional, Warm      | Interview, Casual Chat, Customer Service      |
| `aura-2-cinzia-it`   | cinzia   |        | feminine         | Mature      | it-it    | Italian | Approachable, Friendly, Smooth, Trustworthy, Warm      | Customer Service, Interview, Narration        |
| `aura-2-cesare-it`   | cesare   |        | masculine        | Adult       | it-it    | Italian | Clear, Empathetic, Knowledgeable, Natural, Smooth      | Casual Chat, Customer Service, Interview, IVR |
| `aura-2-livia-it`    | livia    |        | feminine         | Adult       | it-it    | Italian | Approachable, Cheerful, Clear, Engaging, Expressive    | Customer Service, Interview, Audiobook        |
| `aura-2-dionisio-it` | dionisio |        | masculine        | Adult       | it-it    | Italian | Confident, Engaging, Friendly, Melodic, Positive       | Interview, Casual Chat, Customer Service      |
| `aura-2-demetra-it`  | demetra  |        | feminine         | Adult       | it-it    | Italian | Calm, Comfortable, Patient                             | Casual Chat, Interview, Narration             |

---

## Aura-2 Japanese Voices

### Featured Aura-2 Japanese Voices

These are our featured Japanese voices, selected for their versatility and quality:

| Model               | Name    | Sample | Expressed Gender | Age   | Language | Accent   | Characteristics                                          | Use Cases                                     |
| :------------------ | :------ | :----- | :--------------- | :---- | :------- | :------- | :------------------------------------------------------- | :-------------------------------------------- |
| `aura-2-fujin-ja`   | fujin   |        | masculine        | Adult | ja-jp    | Japanese | Calm, Confident, Knowledgeable, Professional, Smooth     | Interview, Casual Chat, IVR                   |
| `aura-2-izanami-ja` | izanami |        | feminine         | Adult | ja-jp    | Japanese | Approachable, Clear, Knowledgeable, Polite, Professional | Casual Chat, Customer Service, Interview, IVR |

## Aura-2: All Available Japanese Voices

| Model               | Name    | Sample | Expressed Gender | Age         | Language | Accent   | Characteristics                                          | Use Cases                                     |
| :------------------ | :------ | :----- | :--------------- | :---------- | :------- | :------- | :------------------------------------------------------- | :-------------------------------------------- |
| `aura-2-uzume-ja`   | uzume   |        | feminine         | Young Adult | ja-jp    | Japanese | Approachable, Clear, Polite, Professional, Trustworthy   | Customer Service, Interview, IVR, Commercial  |
| `aura-2-ebisu-ja`   | ebisu   |        | masculine        | Young Adult | ja-jp    | Japanese | Calm, Deep, Natural, Patient, Sincere                    | Casual Chat, Customer Service                 |
| `aura-2-fujin-ja`   | fujin   |        | masculine        | Adult       | ja-jp    | Japanese | Calm, Confident, Knowledgeable, Professional, Smooth     | Interview, Casual Chat, IVR                   |
| `aura-2-izanami-ja` | izanami |        | feminine         | Adult       | ja-jp    | Japanese | Approachable, Clear, Knowledgeable, Polite, Professional | Casual Chat, Customer Service, Interview, IVR |
| `aura-2-ama-ja`     | ama     |        | feminine         | Adult       | ja-jp    | Japanese | Casual, Comfortable, Confident, Knowledgeable, Natural   | Interview, IVR                                |

---

## Aura 1: All Available English Voices

| Model             | Name    | Sample | Expressed Gender | Age         | Language | Accent   | Characteristics                             | Use Cases                      |
| :---------------- | :------ | :----- | :--------------- | :---------- | :------- | :------- | :------------------------------------------ | :----------------------------- |
| `aura-asteria-en` | asteria |        | feminine         | Adult       | en-us    | American | Clear, Confident, Knowledgeable, Energetic  | Advertising                    |
| `aura-luna-en`    | luna    |        | feminine         | Young Adult | en-us    | American | Friendly, Natural, Engaging                 | IVR                            |
| `aura-stella-en`  | stella  |        | feminine         | Adult       | en-us    | American | Clear, Professional, Engaging               | Customer service               |
| `aura-athena-en`  | athena  |        | feminine         | Mature      | en-gb    | British  | Calm, Smooth, Professional                  | Storytelling                   |
| `aura-hera-en`    | hera    |        | feminine         | Adult       | en-us    | American | Smooth, Warm, Professional                  | Informative                    |
| `aura-orion-en`   | orion   |        | masculine        | Adult       | en-us    | American | Approachable, Comfortable, Calm, Polite     | Informative                    |
| `aura-arcas-en`   | arcas   |        | masculine        | Adult       | en-us    | American | Natural, Smooth, Clear, Comfortable         | Customer service, casual chat  |
| `aura-perseus-en` | perseus |        | masculine        | Adult       | en-us    | American | Confident, Professional, Clear              | Customer service               |
| `aura-angus-en`   | angus   |        | masculine        | Adult       | en-ie    | Irish    | Warm, Friendly, Natural                     | Storytelling                   |
| `aura-orpheus-en` | orpheus |        | masculine        | Adult       | en-us    | American | Professional, Clear, Confident, Trustworthy | Customer service, storytelling |
| `aura-helios-en`  | helios  |        | masculine        | Adult       | en-gb    | British  | Professional, Clear, Confident              | Customer service               |
| `aura-zeus-en`    | zeus    |        | masculine        | Adult       | en-us    | American | Deep, Trustworthy, Smooth                   | IVR                            |

---