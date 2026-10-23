// Lines the key-mashing "typing" activity shows, by what the character is
// working on. A task picks a list with `activity: { type: "typing", text: [...] }`;
// with none it uses CODE_LINES. Only characters the pixel font can draw, and
// short enough to fit across the screen (the data tests check both).

export const CODE_LINES = [
  "const energy = 0;",
  "if (coffee) ship();",
  "while (!done) wait();",
  "// TODO: sleep",
  "git commit -m 'fix'",
  "npm run build",
  "return null;",
  "let agents = 4;",
  "await agent.done();",
  "console.log('ok');",
  "if (tired) { nap(); }",
  "import { luck } from 'x';",
];

export const EMAIL_LINES = [
  "Per my last email,",
  "Circling back on this.",
  "Thanks for your patience!",
  "Happy to hop on a call.",
  "Looping in the team.",
  "Sorry for the delay.",
  "Please see attached.",
  "Let me know if that works.",
  "Following up on my note.",
  "Just a quick question:",
  "Hope you had a good weekend!",
  "Best, Marc",
];

// Bed work is a bit of both.
export const MIXED_LINES = [
  "Re: Re: Re: standup notes",
  "git commit -m 'reply all'",
  "Sent from my bed.",
  "if (inbox) panic();",
  "Thanks, will look tomorrow.",
  "npm run build (in bed)",
  "// TODO: get up",
  "Quick question for you:",
];
