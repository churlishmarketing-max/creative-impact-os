// The Charlotte Spotlight appearance release — what everyone who appears on
// camera signs (owner, staff, customers), from the business's own release link
// (/spotlight/release/<release_token>). Each signature is saved under that
// business with the exact text it agreed to (consent_text + a short hash).
//
// DRAFT (Claude, 2026-09-29) — plain-English, written for the NC attorney to
// review alongside the agreement. It is not legal advice. The text is editable
// in Spotlight → Settings; changing it changes what new signers agree to, and
// every earlier signature keeps its own copy.
import { createHash } from "crypto";

export const DEFAULT_RELEASE = `CHARLOTTE SPOTLIGHT — APPEARANCE RELEASE
Business being filmed: {{business}}

By signing below, I agree that Creative Impact and {{business}} may film, photograph, and record me, and may use my name, image, likeness, voice, and anything I say on camera (together, "my appearance") in the Charlotte Spotlight — the episode, {{business}}'s own videos and commercials, and the promotion of both — in any media, including websites, social media, streaming, broadcast, and paid advertising, anywhere and without a time limit.

I understand that:
• I'm appearing voluntarily, and I'm not being paid for my appearance, now or later.
• Creative Impact owns the footage and decides how it's edited. I don't approve the final cut.
• My appearance may be edited, shortened, or combined with other footage, music, and text — but it won't be used to put words in my mouth, or to endorse any product or business other than {{business}} and the Charlotte Spotlight.
• Once a video is published, other people can share it in ways no one can fully pull back.

I release Creative Impact and {{business}} from claims based on using my appearance the way this release allows, such as claims over privacy or the use of my name and likeness.

I am 18 or older. (Under 18? Please don't sign — a parent or guardian needs to sign for you. Let the crew know.)

Questions about how you appear: hello@creativeimpactmedia.co`;

export const CONSENT_LABEL = "I've read the release above. I'm 18 or older, and I agree to it.";

export function renderRelease(template: string | null | undefined, business: string) {
  const text = String(template || DEFAULT_RELEASE).replace(/\{\{\s*business\s*\}\}/g, business || "the business");
  return { text, version: createHash("sha256").update(text).digest("hex").slice(0, 12) };
}
